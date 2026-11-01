CREATE TABLE IF NOT EXISTS public.admin_login_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.admin_profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  device_fingerprint TEXT NOT NULL,
  browser TEXT NOT NULL,
  os TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  approximate_location TEXT,
  first_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_trusted BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email, device_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_admin_login_devices_email
  ON public.admin_login_devices(email);

CREATE INDEX IF NOT EXISTS idx_admin_login_devices_device_fingerprint
  ON public.admin_login_devices(device_fingerprint);

ALTER TABLE public.admin_login_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct access to admin login devices" ON public.admin_login_devices;
CREATE POLICY "No direct access to admin login devices" ON public.admin_login_devices
  FOR ALL TO authenticated, anon
  USING (false)
  WITH CHECK (false);
