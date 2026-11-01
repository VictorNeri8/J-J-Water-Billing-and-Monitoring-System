-- Customer archive and 60-day retention safeguards.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by_user_id TEXT,
  ADD COLUMN IF NOT EXISTS archived_by_email TEXT,
  ADD COLUMN IF NOT EXISTS archived_by_role TEXT,
  ADD COLUMN IF NOT EXISTS archive_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_customers_active_created_at
  ON public.customers(created_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_archive_expires_at
  ON public.customers(archive_expires_at)
  WHERE archived_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_customer_archive_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.archived_at IS NULL THEN
    NEW.archive_expires_at := NULL;
  ELSE
    NEW.archive_expires_at := NEW.archived_at + INTERVAL '60 days';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_customer_archive_expiration ON public.customers;
CREATE TRIGGER set_customer_archive_expiration
  BEFORE INSERT OR UPDATE OF archived_at, archive_expires_at ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_customer_archive_expiration();

CREATE OR REPLACE FUNCTION public.prevent_archived_customer_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.customers
    WHERE id = NEW.customer_id
      AND archived_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Archived customers cannot receive new operational records.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_archived_customer_meter_readings ON public.meter_readings;
CREATE TRIGGER prevent_archived_customer_meter_readings
  BEFORE INSERT ON public.meter_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_archived_customer_activity();

DROP TRIGGER IF EXISTS prevent_archived_customer_billings ON public.billings;
CREATE TRIGGER prevent_archived_customer_billings
  BEFORE INSERT ON public.billings
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_archived_customer_activity();

DROP TRIGGER IF EXISTS prevent_archived_customer_sms_logs ON public.sms_logs;
CREATE TRIGGER prevent_archived_customer_sms_logs
  BEFORE INSERT ON public.sms_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_archived_customer_activity();

CREATE OR REPLACE FUNCTION public.protect_customer_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.archived_at IS NULL THEN
    RAISE EXCEPTION 'Only archived customers can be permanently deleted.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.meter_readings WHERE customer_id = OLD.id)
     OR EXISTS (SELECT 1 FROM public.billings WHERE customer_id = OLD.id)
     OR EXISTS (SELECT 1 FROM public.sms_logs WHERE customer_id = OLD.id) THEN
    RAISE EXCEPTION 'This customer cannot be permanently deleted because billing, meter reading, or SMS history exists.';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS protect_customer_hard_delete ON public.customers;
CREATE TRIGGER protect_customer_hard_delete
  BEFORE DELETE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_customer_hard_delete();

CREATE OR REPLACE FUNCTION public.permanently_delete_archived_customer(
  p_customer_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_customer public.customers%ROWTYPE;
BEGIN
  SELECT *
  INTO target_customer
  FROM public.customers
  WHERE id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  IF target_customer.archived_at IS NULL THEN
    RETURN 'not_archived';
  END IF;

  IF EXISTS (SELECT 1 FROM public.meter_readings WHERE customer_id = p_customer_id)
     OR EXISTS (SELECT 1 FROM public.billings WHERE customer_id = p_customer_id)
     OR EXISTS (SELECT 1 FROM public.sms_logs WHERE customer_id = p_customer_id) THEN
    RETURN 'has_related_records';
  END IF;

  DELETE FROM public.customers WHERE id = p_customer_id;
  RETURN 'deleted';
END;
$$;

REVOKE ALL ON FUNCTION public.permanently_delete_archived_customer(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.permanently_delete_archived_customer(UUID) TO service_role;

CREATE OR REPLACE VIEW public.stub_out_location_summaries
WITH (security_invoker = true) AS
SELECT
  stub_out_locations.id,
  stub_out_locations.code,
  stub_out_locations.name,
  stub_out_locations.municipality,
  stub_out_locations.barangay,
  stub_out_locations.sitio,
  stub_out_locations.purok,
  stub_out_locations.latitude,
  stub_out_locations.longitude,
  stub_out_locations.status,
  stub_out_locations.notes,
  stub_out_locations.created_at,
  stub_out_locations.updated_at,
  COUNT(customers.id)::INTEGER AS assigned_customer_count,
  stub_out_locations.created_by_user_id,
  stub_out_locations.created_by_email,
  stub_out_locations.created_by_role
FROM public.stub_out_locations
LEFT JOIN public.customers
  ON customers.stub_out_location_id = stub_out_locations.id
  AND customers.archived_at IS NULL
GROUP BY stub_out_locations.id;
