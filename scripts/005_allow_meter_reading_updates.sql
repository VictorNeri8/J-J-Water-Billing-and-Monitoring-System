DROP POLICY IF EXISTS "Authenticated users can update meter readings" ON public.meter_readings;

CREATE POLICY "Authenticated users can update meter readings" ON public.meter_readings
  FOR UPDATE TO authenticated USING (true);
