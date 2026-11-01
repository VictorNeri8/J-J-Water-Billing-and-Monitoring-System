ALTER TABLE public.billings
  ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  ALTER TABLE public.billings
    DROP CONSTRAINT IF EXISTS billings_status_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.billings
  ADD CONSTRAINT billings_status_check
  CHECK (status IN ('paid', 'partial', 'unpaid', 'overdue'));
