DROP POLICY IF EXISTS "Authenticated users can delete contact submissions" ON public.contact_submissions;

CREATE POLICY "Authenticated users can delete contact submissions" ON public.contact_submissions
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );
