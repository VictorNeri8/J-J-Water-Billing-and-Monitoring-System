CREATE TABLE IF NOT EXISTS public.contact_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('ip', 'email')),
  identifier TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_rate_limits_scope_identifier_created_at
  ON public.contact_rate_limits(scope, identifier, created_at DESC);

ALTER TABLE public.contact_rate_limits ENABLE ROW LEVEL SECURITY;
