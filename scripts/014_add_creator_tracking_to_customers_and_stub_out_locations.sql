-- Add creator tracking for customer and Stub Out creation.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS created_by_email TEXT,
  ADD COLUMN IF NOT EXISTS created_by_role TEXT;

ALTER TABLE public.stub_out_locations
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS created_by_email TEXT,
  ADD COLUMN IF NOT EXISTS created_by_role TEXT;

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
GROUP BY stub_out_locations.id;

DROP POLICY IF EXISTS "Finance users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Finance and reader users can insert customers" ON public.customers;
CREATE POLICY "Finance and reader users can insert customers" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role IN ('finance', 'reader')
    )
  );

DROP POLICY IF EXISTS "Finance users can insert stub out locations" ON public.stub_out_locations;
DROP POLICY IF EXISTS "Finance and reader users can insert stub out locations" ON public.stub_out_locations;
CREATE POLICY "Finance and reader users can insert stub out locations" ON public.stub_out_locations
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role IN ('finance', 'reader')
    )
  );
