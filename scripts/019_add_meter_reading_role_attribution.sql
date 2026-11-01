-- Preserve the administrator role responsible for each meter reading.

ALTER TABLE public.meter_readings
  ADD COLUMN IF NOT EXISTS recorded_by_role TEXT;

UPDATE public.meter_readings AS meter_readings
SET recorded_by_role = admin_profiles.role
FROM public.admin_profiles AS admin_profiles
WHERE meter_readings.recorded_by = admin_profiles.id
  AND meter_readings.recorded_by_role IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'meter_readings_recorded_by_role_check'
      AND conrelid = 'public.meter_readings'::regclass
  ) THEN
    ALTER TABLE public.meter_readings
      ADD CONSTRAINT meter_readings_recorded_by_role_check
      CHECK (recorded_by_role IS NULL OR recorded_by_role IN ('reader', 'finance'));
  END IF;
END;
$$;
