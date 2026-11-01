-- Allow each deployment to use its own admin email addresses while preserving
-- the fixed two-role access model.

ALTER TABLE public.admin_profiles
  DROP CONSTRAINT IF EXISTS admin_profiles_email_check;

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.admin_profiles) <> 2
    OR (SELECT COUNT(*) FROM public.admin_profiles WHERE role = 'finance') <> 1
    OR (SELECT COUNT(*) FROM public.admin_profiles WHERE role = 'reader') <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one finance and one reader admin profile before applying this migration.';
  END IF;
END;
$$;

ALTER TABLE public.admin_profiles
  DROP CONSTRAINT IF EXISTS admin_profiles_role_key;

ALTER TABLE public.admin_profiles
  ADD CONSTRAINT admin_profiles_role_key UNIQUE (role);

CREATE OR REPLACE FUNCTION public.enforce_admin_profile_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Admin profiles cannot be deleted; one finance and one reader profile are required.';
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
  BEFORE INSERT OR UPDATE OR DELETE ON public.admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_admin_profile_limits();
