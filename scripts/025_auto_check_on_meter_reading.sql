-- Mark a customer checked in the same transaction as a new meter reading.

CREATE OR REPLACE FUNCTION public.record_meter_reading_transaction(
  p_customer_id UUID,
  p_current_reading INTEGER,
  p_reading_date DATE,
  p_due_date DATE,
  p_recorded_by UUID,
  p_recorded_by_role TEXT,
  p_recorded_by_email TEXT
)
RETURNS TABLE(
  reading_id UUID,
  previous_reading INTEGER,
  current_reading INTEGER,
  usage_cubic INTEGER,
  amount NUMERIC,
  customer_id UUID,
  meter_checked_at TIMESTAMPTZ,
  meter_check_expires_at TIMESTAMPTZ,
  meter_checked_by_user_id UUID,
  meter_checked_by_email TEXT,
  meter_checked_by_role TEXT
)
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
  v_checked_at TIMESTAMPTZ := NOW();
  v_check_expires_at TIMESTAMPTZ := NOW() + INTERVAL '10 days';
BEGIN
  SELECT * INTO v_customer FROM public.customers WHERE id = p_customer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Customer not found.'; END IF;
  IF NOT v_customer.is_active THEN
    RAISE EXCEPTION 'Please turn this customer status to active to add meter.';
  END IF;
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

  UPDATE public.customers
  SET
    meter_checked_at = v_checked_at,
    meter_check_expires_at = v_check_expires_at,
    meter_checked_by_user_id = p_recorded_by,
    meter_checked_by_email = p_recorded_by_email,
    meter_checked_by_role = p_recorded_by_role
  WHERE id = p_customer_id;

  RETURN QUERY SELECT
    v_reading_id,
    v_previous,
    p_current_reading,
    v_usage,
    v_amount,
    p_customer_id,
    v_checked_at,
    v_check_expires_at,
    p_recorded_by,
    p_recorded_by_email,
    p_recorded_by_role;
END;
$$;

REVOKE ALL ON FUNCTION public.record_meter_reading_transaction(UUID, INTEGER, DATE, DATE, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_meter_reading_transaction(UUID, INTEGER, DATE, DATE, UUID, TEXT, TEXT) TO service_role;
