ALTER TABLE public.billings
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

DO $$
BEGIN
  ALTER TABLE public.billings
    DROP CONSTRAINT IF EXISTS billings_payment_method_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.billings
  ADD CONSTRAINT billings_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('cash', 'online'));
