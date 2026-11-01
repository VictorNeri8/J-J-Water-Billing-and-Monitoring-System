-- Support manual-book customer imports while preserving the physical meter baseline.

ALTER TABLE public.meter_readings
  ALTER COLUMN usage_cubic DROP EXPRESSION;

ALTER TABLE public.meter_readings
  ADD COLUMN IF NOT EXISTS is_starting_reading BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.meter_readings
  DROP CONSTRAINT IF EXISTS meter_readings_usage_range_check;

ALTER TABLE public.meter_readings
  ADD CONSTRAINT meter_readings_usage_range_check CHECK (usage_cubic BETWEEN 0 AND 99999);

CREATE OR REPLACE FUNCTION public.create_old_customer_transaction(
  p_account_number TEXT,
  p_customer_name TEXT,
  p_contact_number TEXT,
  p_stop_out TEXT,
  p_address TEXT,
  p_municipality TEXT,
  p_barangay TEXT,
  p_sitio TEXT,
  p_purok TEXT,
  p_stub_out_location_id UUID,
  p_address_sitio_id UUID,
  p_address_purok_id UUID,
  p_starting_reading INTEGER,
  p_cubic_consumed INTEGER,
  p_import_date DATE,
  p_due_date DATE,
  p_created_by UUID,
  p_created_by_email TEXT,
  p_created_by_role TEXT
)
RETURNS TABLE(customer_id UUID, reading_id UUID, billing_id UUID, usage_cubic INTEGER, amount NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_reading_id UUID;
  v_billing_id UUID;
  v_amount NUMERIC;
BEGIN
  IF p_starting_reading NOT BETWEEN 0 AND 99999 THEN
    RAISE EXCEPTION 'Starting meter reading must contain exactly 5 digits.';
  END IF;
  IF p_cubic_consumed NOT BETWEEN 0 AND 99999 THEN
    RAISE EXCEPTION 'Cubic consumed must be an integer between 0 and 99999.';
  END IF;
  IF p_created_by_role NOT IN ('reader', 'finance') THEN
    RAISE EXCEPTION 'Unauthorized customer creation role.';
  END IF;

  v_amount := public.calculate_water_bill(p_cubic_consumed);

  INSERT INTO public.customers (
    account_number, customer_name, contact_number, stop_out, address,
    municipality, barangay, sitio, purok, stub_out_location_id,
    address_sitio_id, address_purok_id, created_by, created_by_user_id,
    created_by_email, created_by_role
  ) VALUES (
    p_account_number, p_customer_name, p_contact_number, p_stop_out, p_address,
    p_municipality, p_barangay, p_sitio, p_purok, p_stub_out_location_id,
    p_address_sitio_id, p_address_purok_id, p_created_by, p_created_by,
    p_created_by_email, p_created_by_role
  ) RETURNING id INTO v_customer_id;

  INSERT INTO public.meter_readings (
    customer_id, previous_reading, current_reading, usage_cubic, reading_date,
    recorded_by, recorded_by_role, is_starting_reading
  ) VALUES (
    v_customer_id, p_starting_reading, p_starting_reading, p_cubic_consumed,
    p_import_date, p_created_by, p_created_by_role, TRUE
  ) RETURNING id INTO v_reading_id;

  INSERT INTO public.billings (
    customer_id, meter_reading_id, usage_cubic, amount, billing_date, due_date,
    status, updated_by
  ) VALUES (
    v_customer_id, v_reading_id, p_cubic_consumed, v_amount, p_import_date,
    p_due_date, 'unpaid', p_created_by
  ) RETURNING id INTO v_billing_id;

  RETURN QUERY SELECT v_customer_id, v_reading_id, v_billing_id, p_cubic_consumed, v_amount;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_meter_reading_transaction(
  p_customer_id UUID,
  p_current_reading INTEGER,
  p_reading_date DATE,
  p_due_date DATE,
  p_recorded_by UUID,
  p_recorded_by_role TEXT
)
RETURNS TABLE(reading_id UUID, previous_reading INTEGER, current_reading INTEGER, usage_cubic INTEGER, amount NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer public.customers%ROWTYPE;
  v_previous INTEGER := 0;
  v_reading_id UUID;
  v_usage INTEGER;
  v_amount NUMERIC;
BEGIN
  SELECT * INTO v_customer FROM public.customers WHERE id = p_customer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Customer not found.'; END IF;
  IF NOT v_customer.is_active THEN RAISE EXCEPTION 'This customer is inactive.'; END IF;
  IF v_customer.archived_at IS NOT NULL THEN RAISE EXCEPTION 'Archived customers cannot receive new meter readings.'; END IF;

  SELECT mr.current_reading INTO v_previous
  FROM public.meter_readings mr
  WHERE mr.customer_id = p_customer_id
  ORDER BY mr.reading_date DESC, mr.created_at DESC
  LIMIT 1;
  v_previous := COALESCE(v_previous, 0);

  IF p_current_reading NOT BETWEEN 0 AND 99999 THEN RAISE EXCEPTION 'Current meter reading must contain exactly 5 digits.'; END IF;
  IF p_current_reading < v_previous THEN RAISE EXCEPTION 'Current meter reading must be greater than or equal to the previous reading.'; END IF;

  v_usage := p_current_reading - v_previous;
  v_amount := public.calculate_water_bill(v_usage);

  INSERT INTO public.meter_readings (
    customer_id, previous_reading, current_reading, usage_cubic, reading_date,
    recorded_by, recorded_by_role, is_starting_reading
  ) VALUES (
    p_customer_id, v_previous, p_current_reading, v_usage, p_reading_date,
    p_recorded_by, p_recorded_by_role, FALSE
  ) RETURNING id INTO v_reading_id;

  INSERT INTO public.billings (customer_id, meter_reading_id, usage_cubic, amount, billing_date, due_date, status, updated_by)
  VALUES (p_customer_id, v_reading_id, v_usage, v_amount, p_reading_date, p_due_date, 'unpaid', p_recorded_by);

  RETURN QUERY SELECT v_reading_id, v_previous, p_current_reading, v_usage, v_amount;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_latest_meter_reading_transaction(
  p_reading_id UUID,
  p_current_reading INTEGER,
  p_reading_date DATE,
  p_updated_by UUID
)
RETURNS TABLE(previous_reading INTEGER, current_reading INTEGER, usage_cubic INTEGER, amount NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reading public.meter_readings%ROWTYPE;
  v_customer public.customers%ROWTYPE;
  v_latest_id UUID;
  v_previous INTEGER := 0;
  v_previous_date DATE;
  v_usage INTEGER;
  v_amount NUMERIC;
  v_billing public.billings%ROWTYPE;
  v_status TEXT;
BEGIN
  SELECT * INTO v_reading FROM public.meter_readings WHERE id = p_reading_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reading not found.'; END IF;
  IF v_reading.is_starting_reading THEN RAISE EXCEPTION 'Manual Book Import baseline readings are locked.'; END IF;
  SELECT * INTO v_customer FROM public.customers WHERE id = v_reading.customer_id FOR UPDATE;
  IF v_customer.archived_at IS NOT NULL THEN RAISE EXCEPTION 'Meter readings for archived customers cannot be edited.'; END IF;

  SELECT mr.id INTO v_latest_id FROM public.meter_readings mr
  WHERE mr.customer_id = v_reading.customer_id
  ORDER BY mr.reading_date DESC, mr.created_at DESC LIMIT 1;
  IF v_latest_id <> p_reading_id THEN RAISE EXCEPTION 'Only the latest meter reading can be edited.'; END IF;
  IF now() - v_reading.created_at > interval '24 hours' THEN RAISE EXCEPTION 'This reading can only be edited within 24 hours of being recorded.'; END IF;

  SELECT mr.current_reading, mr.reading_date INTO v_previous, v_previous_date
  FROM public.meter_readings mr
  WHERE mr.customer_id = v_reading.customer_id AND mr.id <> p_reading_id
  ORDER BY mr.reading_date DESC, mr.created_at DESC LIMIT 1;
  v_previous := COALESCE(v_previous, 0);

  IF p_current_reading NOT BETWEEN 0 AND 99999 THEN RAISE EXCEPTION 'Current meter reading must contain exactly 5 digits.'; END IF;
  IF p_current_reading < v_previous THEN RAISE EXCEPTION 'Current meter reading must be greater than or equal to the previous reading.'; END IF;
  IF v_previous_date IS NOT NULL AND p_reading_date <= v_previous_date THEN RAISE EXCEPTION 'Billing date must be later than the previous meter reading date.'; END IF;

  SELECT * INTO v_billing FROM public.billings WHERE meter_reading_id = p_reading_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Linked billing record not found.'; END IF;
  v_usage := p_current_reading - v_previous;
  v_amount := public.calculate_water_bill(v_usage);
  IF COALESCE(v_billing.amount_paid, 0) > v_amount THEN RAISE EXCEPTION 'Recorded payments exceed the recalculated amount.'; END IF;
  v_status := CASE WHEN COALESCE(v_billing.amount_paid, 0) >= v_amount THEN 'paid' WHEN COALESCE(v_billing.amount_paid, 0) > 0 THEN 'partial' ELSE 'unpaid' END;

  UPDATE public.meter_readings
  SET previous_reading = v_previous, current_reading = p_current_reading,
      usage_cubic = v_usage, reading_date = p_reading_date
  WHERE id = p_reading_id;
  UPDATE public.billings SET usage_cubic = v_usage, amount = v_amount, billing_date = p_reading_date,
    due_date = p_reading_date + 15, status = v_status,
    paid_date = CASE WHEN v_status = 'paid' THEN COALESCE(paid_date, CURRENT_DATE) ELSE NULL END,
    updated_by = p_updated_by
  WHERE meter_reading_id = p_reading_id;

  RETURN QUERY SELECT v_previous, p_current_reading, v_usage, v_amount;
END;
$$;

-- Historical edits need the same stored-usage maintenance and must not modify an import baseline.
CREATE OR REPLACE FUNCTION public.update_finance_historical_reading_transaction(
  p_billing_id UUID,
  p_current_reading INTEGER,
  p_reading_date DATE,
  p_updated_by UUID
)
RETURNS TABLE(previous_reading INTEGER, current_reading INTEGER, usage_cubic INTEGER, amount NUMERIC, following_reading_id UUID, following_usage_cubic INTEGER, following_amount NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_billing public.billings%ROWTYPE; v_reading public.meter_readings%ROWTYPE;
  v_customer public.customers%ROWTYPE; v_previous public.meter_readings%ROWTYPE;
  v_following public.meter_readings%ROWTYPE; v_following_billing public.billings%ROWTYPE;
  v_usage INTEGER; v_amount NUMERIC; v_following_usage INTEGER; v_following_amount NUMERIC;
  v_status TEXT; v_following_status TEXT;
BEGIN
  SELECT * INTO v_billing FROM public.billings WHERE id = p_billing_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Billing record not found.'; END IF;
  IF v_billing.meter_reading_id IS NULL THEN RAISE EXCEPTION 'This billing record is not linked to a meter reading.'; END IF;
  SELECT * INTO v_reading FROM public.meter_readings WHERE id = v_billing.meter_reading_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Linked meter reading not found.'; END IF;
  IF v_reading.is_starting_reading THEN RAISE EXCEPTION 'Manual Book Import baseline readings are locked.'; END IF;
  SELECT * INTO v_customer FROM public.customers WHERE id = v_reading.customer_id FOR UPDATE;
  IF v_customer.archived_at IS NOT NULL THEN RAISE EXCEPTION 'Billing records for archived customers cannot be edited.'; END IF;
  SELECT * INTO v_billing FROM public.billings WHERE id = p_billing_id FOR UPDATE;
  IF v_billing.status = 'paid' THEN RAISE EXCEPTION 'Paid billing records are locked.'; END IF;

  SELECT mr.* INTO v_previous FROM public.meter_readings mr
  WHERE mr.customer_id = v_reading.customer_id
    AND (mr.reading_date < v_reading.reading_date OR (mr.reading_date = v_reading.reading_date AND mr.created_at < v_reading.created_at))
  ORDER BY mr.reading_date DESC, mr.created_at DESC LIMIT 1;
  SELECT mr.* INTO v_following FROM public.meter_readings mr
  WHERE mr.customer_id = v_reading.customer_id
    AND (mr.reading_date > v_reading.reading_date OR (mr.reading_date = v_reading.reading_date AND mr.created_at > v_reading.created_at))
  ORDER BY mr.reading_date ASC, mr.created_at ASC LIMIT 1;

  IF p_current_reading NOT BETWEEN 0 AND 99999 THEN RAISE EXCEPTION 'Current meter reading must contain exactly 5 digits.'; END IF;
  IF v_previous.id IS NOT NULL AND p_current_reading < v_previous.current_reading THEN RAISE EXCEPTION 'Current meter reading must be greater than or equal to the previous reading.'; END IF;
  IF v_following.id IS NOT NULL AND p_current_reading > v_following.current_reading THEN RAISE EXCEPTION 'Current meter reading must be less than or equal to the following reading.'; END IF;
  IF v_previous.id IS NOT NULL AND p_reading_date <= v_previous.reading_date THEN RAISE EXCEPTION 'Billing date must be later than the previous meter reading date.'; END IF;
  IF v_following.id IS NOT NULL AND p_reading_date >= v_following.reading_date THEN RAISE EXCEPTION 'Billing date must be earlier than the following meter reading date.'; END IF;

  IF v_following.id IS NOT NULL THEN
    SELECT * INTO v_following_billing FROM public.billings WHERE meter_reading_id = v_following.id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Following meter reading has no linked billing record.'; END IF;
    IF v_following_billing.status = 'paid' THEN RAISE EXCEPTION 'The following billing record is paid and prevents this historical correction.'; END IF;
  END IF;

  v_usage := p_current_reading - COALESCE(v_previous.current_reading, 0);
  v_amount := public.calculate_water_bill(v_usage);
  IF COALESCE(v_billing.amount_paid, 0) > v_amount THEN RAISE EXCEPTION 'Recorded payments exceed the recalculated amount.'; END IF;
  v_status := CASE WHEN COALESCE(v_billing.amount_paid, 0) >= v_amount THEN 'paid' WHEN COALESCE(v_billing.amount_paid, 0) > 0 THEN 'partial' ELSE 'unpaid' END;

  IF v_following.id IS NOT NULL THEN
    v_following_usage := v_following.current_reading - p_current_reading;
    v_following_amount := public.calculate_water_bill(v_following_usage);
    IF COALESCE(v_following_billing.amount_paid, 0) > v_following_amount THEN RAISE EXCEPTION 'Recorded payments on the following bill exceed its recalculated amount.'; END IF;
    v_following_status := CASE WHEN COALESCE(v_following_billing.amount_paid, 0) >= v_following_amount THEN 'paid' WHEN COALESCE(v_following_billing.amount_paid, 0) > 0 THEN 'partial' ELSE 'unpaid' END;
  END IF;

  UPDATE public.meter_readings SET previous_reading = COALESCE(v_previous.current_reading, 0),
    current_reading = p_current_reading, usage_cubic = v_usage, reading_date = p_reading_date
  WHERE id = v_reading.id;
  UPDATE public.billings SET usage_cubic = v_usage, amount = v_amount, billing_date = p_reading_date,
    due_date = p_reading_date + 15, status = v_status,
    paid_date = CASE WHEN v_status = 'paid' THEN COALESCE(paid_date, CURRENT_DATE) ELSE NULL END,
    updated_by = p_updated_by WHERE id = v_billing.id;

  IF v_following.id IS NOT NULL THEN
    UPDATE public.meter_readings SET previous_reading = p_current_reading, usage_cubic = v_following_usage WHERE id = v_following.id;
    UPDATE public.billings SET usage_cubic = v_following_usage, amount = v_following_amount,
      status = v_following_status,
      paid_date = CASE WHEN v_following_status = 'paid' THEN COALESCE(paid_date, CURRENT_DATE) ELSE NULL END,
      updated_by = p_updated_by WHERE id = v_following_billing.id;
  END IF;

  RETURN QUERY SELECT COALESCE(v_previous.current_reading, 0), p_current_reading, v_usage,
    v_amount, v_following.id, v_following_usage, v_following_amount;
END;
$$;

REVOKE ALL ON FUNCTION public.create_old_customer_transaction(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID, INTEGER, INTEGER, DATE, DATE, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_old_customer_transaction(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID, INTEGER, INTEGER, DATE, DATE, UUID, TEXT, TEXT) TO service_role;
