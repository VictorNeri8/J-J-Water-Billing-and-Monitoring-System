-- Refactor admin auth to canonical email + role records

ALTER TABLE public.admin_profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.admin_profiles
  DROP CONSTRAINT IF EXISTS admin_profiles_role_check;

ALTER TABLE public.admin_profiles
  DROP CONSTRAINT IF EXISTS admin_profiles_email_check;

UPDATE public.admin_profiles
SET role = CASE
  WHEN role IN ('finance_admin', 'finance') THEN 'finance'
  ELSE 'reader'
END;

UPDATE public.admin_profiles
SET email = 'clarkkentibale@gmail.com'
WHERE role = 'finance'
  AND (email IS NULL OR email <> 'clarkkentibale@gmail.com');

UPDATE public.admin_profiles
SET email = 'hashes0087@gmail.com'
WHERE role = 'reader'
  AND (email IS NULL OR email <> 'hashes0087@gmail.com');

ALTER TABLE public.admin_profiles
  ADD CONSTRAINT admin_profiles_role_check
  CHECK (role IN ('finance', 'reader'));

ALTER TABLE public.admin_profiles
  ADD CONSTRAINT admin_profiles_email_check
  CHECK (email IN ('clarkkentibale@gmail.com', 'hashes0087@gmail.com'));

ALTER TABLE public.admin_profiles
  ALTER COLUMN email SET NOT NULL;

DROP INDEX IF EXISTS admin_profiles_username_key;
DROP INDEX IF EXISTS idx_admin_profiles_username;

ALTER TABLE public.admin_profiles
  DROP COLUMN IF EXISTS username;

ALTER TABLE public.admin_profiles
  DROP CONSTRAINT IF EXISTS admin_profiles_email_key;

ALTER TABLE public.admin_profiles
  ADD CONSTRAINT admin_profiles_email_key UNIQUE (email);

CREATE OR REPLACE FUNCTION public.enforce_admin_profile_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.email NOT IN ('clarkkentibale@gmail.com', 'hashes0087@gmail.com') THEN
    RAISE EXCEPTION 'Unauthorized admin email.';
  END IF;

  IF (
    SELECT COUNT(*)
    FROM public.admin_profiles
    WHERE id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) >= 2 THEN
    RAISE EXCEPTION 'Only two admin profiles are allowed.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_admin_profile_limits ON public.admin_profiles;
CREATE TRIGGER enforce_admin_profile_limits
  BEFORE INSERT OR UPDATE ON public.admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_admin_profile_limits();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_admin();

UPDATE public.admin_profiles ap
SET email = LOWER(ap.email)
WHERE ap.email <> LOWER(ap.email);

DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Admin users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Finance users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Finance users can update customers" ON public.customers;

CREATE POLICY "Admin users can view customers" ON public.customers
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );

CREATE POLICY "Finance users can insert customers" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  );

CREATE POLICY "Finance users can update customers" ON public.customers
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

DROP POLICY IF EXISTS "Authenticated users can view meter readings" ON public.meter_readings;
DROP POLICY IF EXISTS "Authenticated users can insert meter readings" ON public.meter_readings;
DROP POLICY IF EXISTS "Authenticated users can update meter readings" ON public.meter_readings;
DROP POLICY IF EXISTS "Admin users can view meter readings" ON public.meter_readings;
DROP POLICY IF EXISTS "Finance users can insert meter readings" ON public.meter_readings;
DROP POLICY IF EXISTS "Finance users can update meter readings" ON public.meter_readings;

CREATE POLICY "Admin users can view meter readings" ON public.meter_readings
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );

CREATE POLICY "Finance users can insert meter readings" ON public.meter_readings
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  );

CREATE POLICY "Finance users can update meter readings" ON public.meter_readings
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

DROP POLICY IF EXISTS "Authenticated users can view billings" ON public.billings;
DROP POLICY IF EXISTS "Authenticated users can insert billings" ON public.billings;
DROP POLICY IF EXISTS "Authenticated users can update billings" ON public.billings;
DROP POLICY IF EXISTS "Admin users can view billings" ON public.billings;
DROP POLICY IF EXISTS "Finance users can insert billings" ON public.billings;
DROP POLICY IF EXISTS "Finance users can update billings" ON public.billings;

CREATE POLICY "Admin users can view billings" ON public.billings
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );

CREATE POLICY "Finance users can insert billings" ON public.billings
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  );

CREATE POLICY "Finance users can update billings" ON public.billings
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

DROP POLICY IF EXISTS "Authenticated users can view sms logs" ON public.sms_logs;
DROP POLICY IF EXISTS "Authenticated users can insert sms logs" ON public.sms_logs;
DROP POLICY IF EXISTS "Authenticated users can update sms logs" ON public.sms_logs;
DROP POLICY IF EXISTS "Finance users can view sms logs" ON public.sms_logs;
DROP POLICY IF EXISTS "Finance users can insert sms logs" ON public.sms_logs;
DROP POLICY IF EXISTS "Finance users can update sms logs" ON public.sms_logs;

CREATE POLICY "Finance users can view sms logs" ON public.sms_logs
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  );

CREATE POLICY "Finance users can insert sms logs" ON public.sms_logs
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  );

CREATE POLICY "Finance users can update sms logs" ON public.sms_logs
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

DROP POLICY IF EXISTS "Authenticated users can view contact submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Authenticated users can update contact submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Authenticated users can delete contact submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Finance users can view contact submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Finance users can update contact submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Finance users can delete contact submissions" ON public.contact_submissions;

CREATE POLICY "Finance users can view contact submissions" ON public.contact_submissions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  );

CREATE POLICY "Finance users can update contact submissions" ON public.contact_submissions
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

CREATE POLICY "Finance users can delete contact submissions" ON public.contact_submissions
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  );
