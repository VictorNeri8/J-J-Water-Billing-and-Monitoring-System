-- Allow Finance to correct unpaid historical readings while preserving the cumulative meter chain.

CREATE OR REPLACE FUNCTION public.update_finance_historical_reading_transaction(
  p_billing_id UUID,
  p_current_reading INTEGER,
  p_reading_date DATE,
  p_updated_by UUID
)
RETURNS TABLE(
  previous_reading INTEGER,
  current_reading INTEGER,
  usage_cubic INTEGER,
  amount NUMERIC,
  following_reading_id UUID,
  following_usage_cubic INTEGER,
  following_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_billing public.billings%ROWTYPE;
  v_reading public.meter_readings%ROWTYPE;
  v_customer public.customers%ROWTYPE;
  v_previous public.meter_readings%ROWTYPE;
  v_following public.meter_readings%ROWTYPE;
  v_following_billing public.billings%ROWTYPE;
  v_usage INTEGER;
  v_amount NUMERIC;
  v_following_usage INTEGER;
  v_following_amount NUMERIC;
  v_status TEXT;
  v_following_status TEXT;
BEGIN
  SELECT * INTO v_billing FROM public.billings WHERE id = p_billing_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Billing record not found.'; END IF;
  IF v_billing.meter_reading_id IS NULL THEN RAISE EXCEPTION 'This billing record is not linked to a meter reading.'; END IF;

  SELECT * INTO v_reading FROM public.meter_readings WHERE id = v_billing.meter_reading_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Linked meter reading not found.'; END IF;

  SELECT * INTO v_customer FROM public.customers WHERE id = v_reading.customer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Customer not found.'; END IF;
  IF v_customer.archived_at IS NOT NULL THEN RAISE EXCEPTION 'Billing records for archived customers cannot be edited.'; END IF;

  SELECT * INTO v_billing FROM public.billings WHERE id = p_billing_id FOR UPDATE;
  IF v_billing.status = 'paid' THEN RAISE EXCEPTION 'Paid billing records are locked.'; END IF;

  SELECT mr.* INTO v_previous
  FROM public.meter_readings mr
  WHERE mr.customer_id = v_reading.customer_id
    AND (mr.reading_date < v_reading.reading_date OR (mr.reading_date = v_reading.reading_date AND mr.created_at < v_reading.created_at))
  ORDER BY mr.reading_date DESC, mr.created_at DESC
  LIMIT 1;

  SELECT mr.* INTO v_following
  FROM public.meter_readings mr
  WHERE mr.customer_id = v_reading.customer_id
    AND (mr.reading_date > v_reading.reading_date OR (mr.reading_date = v_reading.reading_date AND mr.created_at > v_reading.created_at))
  ORDER BY mr.reading_date ASC, mr.created_at ASC
  LIMIT 1;

  IF p_current_reading NOT BETWEEN 0 AND 99999 THEN
    RAISE EXCEPTION 'Current meter reading must contain exactly 5 digits.';
  END IF;
  IF v_previous.id IS NOT NULL AND p_current_reading < v_previous.current_reading THEN
    RAISE EXCEPTION 'Current meter reading must be greater than or equal to the previous reading.';
  END IF;
  IF v_following.id IS NOT NULL AND p_current_reading > v_following.current_reading THEN
    RAISE EXCEPTION 'Current meter reading must be less than or equal to the following reading.';
  END IF;
  IF v_previous.id IS NOT NULL AND p_reading_date <= v_previous.reading_date THEN
    RAISE EXCEPTION 'Billing date must be later than the previous meter reading date.';
  END IF;
  IF v_following.id IS NOT NULL AND p_reading_date >= v_following.reading_date THEN
    RAISE EXCEPTION 'Billing date must be earlier than the following meter reading date.';
  END IF;

  IF v_following.id IS NOT NULL THEN
    SELECT * INTO v_following_billing
    FROM public.billings
    WHERE meter_reading_id = v_following.id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Following meter reading has no linked billing record.'; END IF;
    IF v_following_billing.status = 'paid' THEN
      RAISE EXCEPTION 'The following billing record is paid and prevents this historical correction.';
    END IF;
  END IF;

  v_usage := p_current_reading - COALESCE(v_previous.current_reading, 0);
  v_amount := public.calculate_water_bill(v_usage);
  IF COALESCE(v_billing.amount_paid, 0) > v_amount THEN
    RAISE EXCEPTION 'Recorded payments exceed the recalculated amount.';
  END IF;
  v_status := CASE
    WHEN COALESCE(v_billing.amount_paid, 0) >= v_amount THEN 'paid'
    WHEN COALESCE(v_billing.amount_paid, 0) > 0 THEN 'partial'
    ELSE 'unpaid'
  END;

  IF v_following.id IS NOT NULL THEN
    v_following_usage := v_following.current_reading - p_current_reading;
    v_following_amount := public.calculate_water_bill(v_following_usage);
    IF COALESCE(v_following_billing.amount_paid, 0) > v_following_amount THEN
      RAISE EXCEPTION 'Recorded payments on the following bill exceed its recalculated amount.';
    END IF;
    v_following_status := CASE
      WHEN COALESCE(v_following_billing.amount_paid, 0) >= v_following_amount THEN 'paid'
      WHEN COALESCE(v_following_billing.amount_paid, 0) > 0 THEN 'partial'
      ELSE 'unpaid'
    END;
  END IF;

  UPDATE public.meter_readings
  SET previous_reading = COALESCE(v_previous.current_reading, 0),
      current_reading = p_current_reading,
      reading_date = p_reading_date
  WHERE id = v_reading.id;

  UPDATE public.billings
  SET usage_cubic = v_usage,
      amount = v_amount,
      billing_date = p_reading_date,
      due_date = p_reading_date + 15,
      status = v_status,
      paid_date = CASE WHEN v_status = 'paid' THEN COALESCE(paid_date, CURRENT_DATE) ELSE NULL END,
      updated_by = p_updated_by
  WHERE id = v_billing.id;

  IF v_following.id IS NOT NULL THEN
    UPDATE public.meter_readings
    SET previous_reading = p_current_reading
    WHERE id = v_following.id;

    UPDATE public.billings
    SET usage_cubic = v_following_usage,
        amount = v_following_amount,
        status = v_following_status,
        paid_date = CASE WHEN v_following_status = 'paid' THEN COALESCE(paid_date, CURRENT_DATE) ELSE NULL END,
        updated_by = p_updated_by
    WHERE id = v_following_billing.id;
  END IF;

  RETURN QUERY SELECT
    COALESCE(v_previous.current_reading, 0),
    p_current_reading,
    v_usage,
    v_amount,
    v_following.id,
    v_following_usage,
    v_following_amount;
END;
$$;

REVOKE ALL ON FUNCTION public.update_finance_historical_reading_transaction(UUID, INTEGER, DATE, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_finance_historical_reading_transaction(UUID, INTEGER, DATE, UUID) TO service_role;
