-- Enforce cumulative five-digit integer meter readings and keep reading/billing writes atomic.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.meter_readings
    WHERE previous_reading <> trunc(previous_reading)
       OR current_reading <> trunc(current_reading)
       OR usage_cubic <> trunc(usage_cubic)
       OR previous_reading NOT BETWEEN 0 AND 99999
       OR current_reading NOT BETWEEN 0 AND 99999
       OR current_reading < previous_reading
  ) OR EXISTS (
    SELECT 1
    FROM public.billings
    WHERE usage_cubic <> trunc(usage_cubic)
       OR usage_cubic < 0
       OR usage_cubic > 99999
  ) THEN
    RAISE EXCEPTION 'Meter-reading migration stopped: fractional, decreasing, or out-of-range legacy values require manual review.';
  END IF;
END;
$$;

ALTER TABLE public.meter_readings DROP COLUMN usage_cubic;

ALTER TABLE public.meter_readings
  ALTER COLUMN previous_reading TYPE INTEGER USING previous_reading::INTEGER,
  ALTER COLUMN current_reading TYPE INTEGER USING current_reading::INTEGER;

ALTER TABLE public.meter_readings
  ADD COLUMN usage_cubic INTEGER GENERATED ALWAYS AS (current_reading - previous_reading) STORED;

ALTER TABLE public.billings
  ALTER COLUMN usage_cubic TYPE INTEGER USING usage_cubic::INTEGER;

ALTER TABLE public.meter_readings
  DROP CONSTRAINT IF EXISTS meter_readings_previous_range_check,
  DROP CONSTRAINT IF EXISTS meter_readings_current_range_check,
  DROP CONSTRAINT IF EXISTS meter_readings_non_decreasing_check;

ALTER TABLE public.meter_readings
  ADD CONSTRAINT meter_readings_previous_range_check CHECK (previous_reading BETWEEN 0 AND 99999),
  ADD CONSTRAINT meter_readings_current_range_check CHECK (current_reading BETWEEN 0 AND 99999),
  ADD CONSTRAINT meter_readings_non_decreasing_check CHECK (current_reading >= previous_reading);

CREATE OR REPLACE FUNCTION public.calculate_water_bill(p_usage INTEGER)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_usage <= 0 THEN 0
    WHEN p_usage <= 10 THEN 350
    ELSE 350 + ((p_usage - 10) * 40)
  END::NUMERIC;
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

  INSERT INTO public.meter_readings (customer_id, previous_reading, current_reading, reading_date, recorded_by, recorded_by_role)
  VALUES (p_customer_id, v_previous, p_current_reading, p_reading_date, p_recorded_by, p_recorded_by_role)
  RETURNING id INTO v_reading_id;

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
  SELECT * INTO v_customer FROM public.customers WHERE id = v_reading.customer_id FOR UPDATE;
  IF v_customer.archived_at IS NOT NULL THEN RAISE EXCEPTION 'Meter readings for archived customers cannot be edited.'; END IF;

  SELECT mr.id INTO v_latest_id
  FROM public.meter_readings mr
  WHERE mr.customer_id = v_reading.customer_id
  ORDER BY mr.reading_date DESC, mr.created_at DESC
  LIMIT 1;
  IF v_latest_id <> p_reading_id THEN RAISE EXCEPTION 'Only the latest meter reading can be edited.'; END IF;
  IF now() - v_reading.created_at > interval '24 hours' THEN RAISE EXCEPTION 'This reading can only be edited within 24 hours of being recorded.'; END IF;

  SELECT mr.current_reading, mr.reading_date INTO v_previous, v_previous_date
  FROM public.meter_readings mr
  WHERE mr.customer_id = v_reading.customer_id AND mr.id <> p_reading_id
  ORDER BY mr.reading_date DESC, mr.created_at DESC
  LIMIT 1;
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

  UPDATE public.meter_readings SET previous_reading = v_previous, current_reading = p_current_reading, reading_date = p_reading_date WHERE id = p_reading_id;
  UPDATE public.billings SET usage_cubic = v_usage, amount = v_amount, billing_date = p_reading_date,
    due_date = p_reading_date + 15, status = v_status,
    paid_date = CASE WHEN v_status = 'paid' THEN COALESCE(paid_date, CURRENT_DATE) ELSE NULL END,
    updated_by = p_updated_by
  WHERE meter_reading_id = p_reading_id;

  RETURN QUERY SELECT v_previous, p_current_reading, v_usage, v_amount;
END;
$$;

REVOKE ALL ON FUNCTION public.record_meter_reading_transaction(UUID, INTEGER, DATE, DATE, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_latest_meter_reading_transaction(UUID, INTEGER, DATE, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_meter_reading_transaction(UUID, INTEGER, DATE, DATE, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_latest_meter_reading_transaction(UUID, INTEGER, DATE, UUID) TO service_role;
