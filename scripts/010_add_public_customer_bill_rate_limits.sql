CREATE TABLE IF NOT EXISTS public.public_customer_bill_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_customer_bill_rate_limits_identifier_created_at
  ON public.public_customer_bill_rate_limits(identifier, created_at DESC);

ALTER TABLE public.public_customer_bill_rate_limits ENABLE ROW LEVEL SECURITY;
