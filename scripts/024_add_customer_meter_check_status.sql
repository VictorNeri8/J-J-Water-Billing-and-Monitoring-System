-- Track latest 10-day field meter check status per customer.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS meter_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meter_check_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meter_checked_by_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS meter_checked_by_email TEXT,
  ADD COLUMN IF NOT EXISTS meter_checked_by_role TEXT;

CREATE INDEX IF NOT EXISTS idx_customers_meter_check_expires_at
  ON public.customers(meter_check_expires_at);
