-- Allow expired archived customers to be permanently deleted with their
-- related history. Before expiration, deletion requires a zero balance.

CREATE OR REPLACE FUNCTION public.protect_customer_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  archive_expired BOOLEAN;
  has_outstanding_balance BOOLEAN;
BEGIN
  IF OLD.archived_at IS NULL THEN
    RAISE EXCEPTION 'Only archived customers can be permanently deleted.';
  END IF;

  archive_expired := OLD.archive_expires_at IS NOT NULL
    AND OLD.archive_expires_at <= NOW();

  SELECT EXISTS (
    SELECT 1
    FROM public.billings
    WHERE customer_id = OLD.id
      AND amount > COALESCE(amount_paid, 0)
  )
  INTO has_outstanding_balance;

  IF NOT archive_expired AND has_outstanding_balance THEN
    RAISE EXCEPTION 'This customer has an outstanding bill and cannot be permanently deleted during the 60-day restoration window.';
  END IF;

  RETURN OLD;
END;
$$;

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
  archive_expired BOOLEAN;
  has_outstanding_balance BOOLEAN;
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

  archive_expired := target_customer.archive_expires_at IS NOT NULL
    AND target_customer.archive_expires_at <= NOW();

  SELECT EXISTS (
    SELECT 1
    FROM public.billings
    WHERE customer_id = p_customer_id
      AND amount > COALESCE(amount_paid, 0)
  )
  INTO has_outstanding_balance;

  IF NOT archive_expired AND has_outstanding_balance THEN
    RETURN 'outstanding_balance';
  END IF;

  DELETE FROM public.customers WHERE id = p_customer_id;
  RETURN 'deleted';
END;
$$;

REVOKE ALL ON FUNCTION public.permanently_delete_archived_customer(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.permanently_delete_archived_customer(UUID) TO service_role;
