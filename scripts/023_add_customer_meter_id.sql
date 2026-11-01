-- Add physical submeter identifiers to customer records.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS meter_id TEXT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'customers_meter_id_format_check'
      AND conrelid = 'public.customers'::regclass
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_meter_id_format_check
      CHECK (meter_id IS NULL OR meter_id ~ '^[A-Z0-9]{4,10}$');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'customers_meter_id_unique'
      AND conrelid = 'public.customers'::regclass
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_meter_id_unique UNIQUE (meter_id);
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.create_old_customer_transaction(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  UUID, UUID, UUID, INTEGER, INTEGER, DATE, DATE, UUID, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.create_old_customer_transaction(
  p_account_number TEXT,
  p_meter_id TEXT,
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
  IF p_meter_id !~ '^[A-Z0-9]{4,10}$' THEN
    RAISE EXCEPTION 'Meter ID must be 4–10 characters.';
  END IF;
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
    account_number, meter_id, customer_name, contact_number, stop_out, address,
    municipality, barangay, sitio, purok, stub_out_location_id,
    address_sitio_id, address_purok_id, created_by, created_by_user_id,
    created_by_email, created_by_role
  ) VALUES (
    p_account_number, p_meter_id, p_customer_name, p_contact_number, p_stop_out, p_address,
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

REVOKE ALL ON FUNCTION public.create_old_customer_transaction(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  UUID, UUID, UUID, INTEGER, INTEGER, DATE, DATE, UUID, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_old_customer_transaction(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  UUID, UUID, UUID, INTEGER, INTEGER, DATE, DATE, UUID, TEXT, TEXT
) TO service_role;
