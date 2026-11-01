-- Reusable Sitio and Purok address options

CREATE TABLE IF NOT EXISTS public.address_sitios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality TEXT NOT NULL,
  barangay TEXT NOT NULL,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  is_custom BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.address_puroks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sitio_id UUID NOT NULL REFERENCES public.address_sitios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  is_custom BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS municipality TEXT,
  ADD COLUMN IF NOT EXISTS barangay TEXT,
  ADD COLUMN IF NOT EXISTS sitio TEXT,
  ADD COLUMN IF NOT EXISTS purok TEXT,
  ADD COLUMN IF NOT EXISTS address_sitio_id UUID REFERENCES public.address_sitios(id),
  ADD COLUMN IF NOT EXISTS address_purok_id UUID REFERENCES public.address_puroks(id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'address_sitios_location_name_unique'
  ) THEN
    ALTER TABLE public.address_sitios
      ADD CONSTRAINT address_sitios_location_name_unique
      UNIQUE (municipality, barangay, normalized_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'address_puroks_sitio_name_unique'
  ) THEN
    ALTER TABLE public.address_puroks
      ADD CONSTRAINT address_puroks_sitio_name_unique
      UNIQUE (sitio_id, normalized_name);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_address_sitios_location
  ON public.address_sitios(municipality, barangay);

CREATE INDEX IF NOT EXISTS idx_address_puroks_sitio_id
  ON public.address_puroks(sitio_id);

ALTER TABLE public.address_sitios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.address_puroks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin users can view address sitios" ON public.address_sitios;
CREATE POLICY "Admin users can view address sitios" ON public.address_sitios
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin users can insert address sitios" ON public.address_sitios;
CREATE POLICY "Admin users can insert address sitios" ON public.address_sitios
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin users can delete custom address sitios" ON public.address_sitios;
CREATE POLICY "Admin users can delete custom address sitios" ON public.address_sitios
  FOR DELETE TO authenticated USING (
    is_custom = TRUE
    AND EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin users can view address puroks" ON public.address_puroks;
CREATE POLICY "Admin users can view address puroks" ON public.address_puroks
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin users can insert address puroks" ON public.address_puroks;
CREATE POLICY "Admin users can insert address puroks" ON public.address_puroks
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin users can delete custom address puroks" ON public.address_puroks;
CREATE POLICY "Admin users can delete custom address puroks" ON public.address_puroks
  FOR DELETE TO authenticated USING (
    is_custom = TRUE
    AND EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );

WITH address_barangays(municipality, barangay) AS (
  VALUES
    ('Liloan', 'Cabadiangan'),
    ('Liloan', 'Calero'),
    ('Liloan', 'Catarman'),
    ('Liloan', 'Cotcot'),
    ('Liloan', 'Jubay'),
    ('Liloan', 'Lataban'),
    ('Liloan', 'Mulao'),
    ('Liloan', 'Poblacion'),
    ('Liloan', 'San Roque'),
    ('Liloan', 'San Vicente'),
    ('Liloan', 'Santa Cruz'),
    ('Liloan', 'Tabla'),
    ('Liloan', 'Tayud'),
    ('Liloan', 'Yati'),
    ('Consolacion', 'Cabangahan'),
    ('Consolacion', 'Cansaga'),
    ('Consolacion', 'Casili'),
    ('Consolacion', 'Danglag'),
    ('Consolacion', 'Garing'),
    ('Consolacion', 'Jugan'),
    ('Consolacion', 'Lamac'),
    ('Consolacion', 'Lanipga'),
    ('Consolacion', 'Nangka'),
    ('Consolacion', 'Panas'),
    ('Consolacion', 'Panoypoy'),
    ('Consolacion', 'Pitogo'),
    ('Consolacion', 'Poblacion Occidental'),
    ('Consolacion', 'Poblacion Oriental'),
    ('Consolacion', 'Polog'),
    ('Consolacion', 'Pulpogan'),
    ('Consolacion', 'Sacsac'),
    ('Consolacion', 'Tayud'),
    ('Consolacion', 'Tilhaong'),
    ('Consolacion', 'Tolotolo'),
    ('Consolacion', 'Tugbongan')
),
default_sitios(name) AS (
  VALUES ('Sitio Proper'), ('Sitio Riverside'), ('Sitio Upper')
)
INSERT INTO public.address_sitios (municipality, barangay, name, normalized_name, is_custom)
SELECT
  address_barangays.municipality,
  address_barangays.barangay,
  default_sitios.name,
  LOWER(default_sitios.name),
  FALSE
FROM address_barangays
CROSS JOIN default_sitios
ON CONFLICT (municipality, barangay, normalized_name) DO NOTHING;

WITH default_puroks(sitio_name, purok_name) AS (
  VALUES
    ('Sitio Proper', 'Purok 1'),
    ('Sitio Proper', 'Purok 2'),
    ('Sitio Proper', 'Purok 3'),
    ('Sitio Riverside', 'Purok 1'),
    ('Sitio Riverside', 'Purok 2'),
    ('Sitio Upper', 'Purok 1'),
    ('Sitio Upper', 'Purok 2')
)
INSERT INTO public.address_puroks (sitio_id, name, normalized_name, is_custom)
SELECT
  address_sitios.id,
  default_puroks.purok_name,
  LOWER(default_puroks.purok_name),
  FALSE
FROM public.address_sitios
JOIN default_puroks ON default_puroks.sitio_name = address_sitios.name
WHERE address_sitios.is_custom = FALSE
ON CONFLICT (sitio_id, normalized_name) DO NOTHING;
