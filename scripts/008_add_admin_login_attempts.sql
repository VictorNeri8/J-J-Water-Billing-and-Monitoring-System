CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until TIMESTAMPTZ,
  last_failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email, ip_address)
);

CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_email_ip
  ON public.admin_login_attempts(email, ip_address);

ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct access to admin login attempts" ON public.admin_login_attempts;
CREATE POLICY "No direct access to admin login attempts" ON public.admin_login_attempts
  FOR ALL TO authenticated, anon
  USING (false)
  WITH CHECK (false);

DROP TRIGGER IF EXISTS update_admin_login_attempts_updated_at ON public.admin_login_attempts;
CREATE TRIGGER update_admin_login_attempts_updated_at
  BEFORE UPDATE ON public.admin_login_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
