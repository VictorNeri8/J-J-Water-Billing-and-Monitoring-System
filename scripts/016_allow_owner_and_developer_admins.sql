-- Allow one owner and one developer account for each admin role.
-- Existing known accounts are classified by email so this migration works for
-- both the Business database (owners already exist) and Test database
-- (developers may already exist).

ALTER TABLE public.admin_profiles
  ADD COLUMN IF NOT EXISTS account_type TEXT;

UPDATE public.admin_profiles
SET account_type = CASE
  WHEN LOWER(email) IN ('johnhenryagbon16@gmail.com', 'agbonmarlou0@gmail.com') THEN 'owner'
  WHEN LOWER(email) IN ('clarkkentibale@gmail.com', 'hashes0087@gmail.com') THEN 'developer'
  ELSE account_type
END
WHERE account_type IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.admin_profiles
    WHERE account_type IS NULL
       OR account_type NOT IN ('owner', 'developer')
  ) THEN
    RAISE EXCEPTION 'All existing admin profiles must be recognized owner or developer accounts before applying this migration.';
  END IF;
END;
$$;

ALTER TABLE public.admin_profiles
  ALTER COLUMN account_type SET DEFAULT 'developer',
  ALTER COLUMN account_type SET NOT NULL;

ALTER TABLE public.admin_profiles
  DROP CONSTRAINT IF EXISTS admin_profiles_account_type_check;

ALTER TABLE public.admin_profiles
  ADD CONSTRAINT admin_profiles_account_type_check
  CHECK (account_type IN ('owner', 'developer'));

ALTER TABLE public.admin_profiles
  DROP CONSTRAINT IF EXISTS admin_profiles_role_key;

ALTER TABLE public.admin_profiles
  DROP CONSTRAINT IF EXISTS admin_profiles_account_type_role_key;

ALTER TABLE public.admin_profiles
  ADD CONSTRAINT admin_profiles_account_type_role_key
  UNIQUE (account_type, role);

CREATE OR REPLACE FUNCTION public.enforce_admin_profile_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.account_type = 'owner' THEN
      RAISE EXCEPTION 'Owner admin profiles cannot be deleted.';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.account_type = 'owner'
     AND NEW.account_type <> 'owner' THEN
    RAISE EXCEPTION 'Owner admin profiles cannot be converted to developer profiles.';
  END IF;

  IF (
    SELECT COUNT(*)
    FROM public.admin_profiles
    WHERE id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) >= 4 THEN
    RAISE EXCEPTION 'Only four admin profiles are allowed.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_admin_profile_limits ON public.admin_profiles;
CREATE TRIGGER enforce_admin_profile_limits
  BEFORE INSERT OR UPDATE OR DELETE ON public.admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_admin_profile_limits();
