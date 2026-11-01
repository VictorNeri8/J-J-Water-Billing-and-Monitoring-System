ALTER TABLE public.contact_submissions
ADD COLUMN IF NOT EXISTS subject TEXT;

UPDATE public.contact_submissions
SET subject = 'General Inquiry'
WHERE subject IS NULL OR btrim(subject) = '';

ALTER TABLE public.contact_submissions
ALTER COLUMN subject SET NOT NULL;

DROP POLICY IF EXISTS "Authenticated users can view contact submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Authenticated users can update contact submissions" ON public.contact_submissions;

CREATE POLICY "Authenticated users can view contact submissions" ON public.contact_submissions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can update contact submissions" ON public.contact_submissions
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );
  