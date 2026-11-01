-- Stub Out Location Mapping

CREATE TABLE IF NOT EXISTS public.stub_out_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT,
  municipality TEXT NOT NULL,
  barangay TEXT NOT NULL,
  sitio TEXT,
  purok TEXT,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT stub_out_locations_municipality_check CHECK (municipality IN ('Consolacion', 'Liloan')),
  CONSTRAINT stub_out_locations_latitude_check CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT stub_out_locations_longitude_check CHECK (longitude >= -180 AND longitude <= 180),
  CONSTRAINT stub_out_locations_status_check CHECK (status IN ('active', 'inactive'))
);

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS stub_out_location_id UUID REFERENCES public.stub_out_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stub_out_locations_code
  ON public.stub_out_locations(code);

CREATE INDEX IF NOT EXISTS idx_stub_out_locations_municipality_barangay
  ON public.stub_out_locations(municipality, barangay);

CREATE INDEX IF NOT EXISTS idx_customers_stub_out_location_id
  ON public.customers(stub_out_location_id);

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
  COUNT(customers.id)::INTEGER AS assigned_customer_count
FROM public.stub_out_locations
LEFT JOIN public.customers
  ON customers.stub_out_location_id = stub_out_locations.id
GROUP BY stub_out_locations.id;

ALTER TABLE public.stub_out_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin users can view stub out locations" ON public.stub_out_locations;
CREATE POLICY "Admin users can view stub out locations" ON public.stub_out_locations
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Finance users can insert stub out locations" ON public.stub_out_locations;
CREATE POLICY "Finance users can insert stub out locations" ON public.stub_out_locations
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  );

DROP POLICY IF EXISTS "Finance users can update stub out locations" ON public.stub_out_locations;
CREATE POLICY "Finance users can update stub out locations" ON public.stub_out_locations
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  );

DROP POLICY IF EXISTS "Finance users can delete unused stub out locations" ON public.stub_out_locations;
CREATE POLICY "Finance users can delete unused stub out locations" ON public.stub_out_locations
  FOR DELETE TO authenticated USING (
    NOT EXISTS (
      SELECT 1
      FROM public.customers
      WHERE customers.stub_out_location_id = stub_out_locations.id
    )
    AND EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  );

DROP TRIGGER IF EXISTS update_stub_out_locations_updated_at ON public.stub_out_locations;
CREATE TRIGGER update_stub_out_locations_updated_at
  BEFORE UPDATE ON public.stub_out_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
