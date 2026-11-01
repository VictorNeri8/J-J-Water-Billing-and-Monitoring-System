-- Water Billing System Database Schema
-- J&J Water Distribution Services

-- Admin Profiles Table (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL CHECK (email IN ('clarkkentibale@gmail.com', 'hashes0087@gmail.com')),
  role TEXT NOT NULL CHECK (role IN ('reader', 'finance')),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  stop_out TEXT NOT NULL, -- Meter location (e.g., B29)
  address TEXT,
  date_registered TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meter Readings Table
CREATE TABLE IF NOT EXISTS public.meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  previous_reading INTEGER NOT NULL DEFAULT 0 CHECK (previous_reading BETWEEN 0 AND 99999),
  current_reading INTEGER NOT NULL CHECK (current_reading BETWEEN 0 AND 99999),
  usage_cubic INTEGER GENERATED ALWAYS AS (current_reading - previous_reading) STORED,
  CONSTRAINT meter_readings_non_decreasing_check CHECK (current_reading >= previous_reading),
  reading_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Billings Table
CREATE TABLE IF NOT EXISTS public.billings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  meter_reading_id UUID NOT NULL REFERENCES public.meter_readings(id) ON DELETE CASCADE,
  usage_cubic INTEGER NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0,
  billing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'partial', 'unpaid', 'overdue')),
  paid_date DATE,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS Logs Table
CREATE TABLE IF NOT EXISTS public.sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  billing_id UUID REFERENCES public.billings(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  sms_type TEXT NOT NULL CHECK (sms_type IN ('60_day_reminder', '76_day_final_warning', 'custom')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  twilio_sid TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact Submissions Table (for public contact form)
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_account_number ON public.customers(account_number);
CREATE INDEX IF NOT EXISTS idx_meter_readings_customer_id ON public.meter_readings(customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_meter_readings_customer_date_unique
  ON public.meter_readings(customer_id, reading_date);
CREATE INDEX IF NOT EXISTS idx_billings_customer_id ON public.billings(customer_id);
CREATE INDEX IF NOT EXISTS idx_billings_status ON public.billings(status);
CREATE INDEX IF NOT EXISTS idx_billings_due_date ON public.billings(due_date);
CREATE INDEX IF NOT EXISTS idx_sms_logs_customer_id ON public.sms_logs(customer_id);

-- Enable Row Level Security
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_profiles
CREATE POLICY "Admins can view their own profile" ON public.admin_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can update their own profile" ON public.admin_profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for customers (all admins can access)
CREATE POLICY "Admin users can view customers" ON public.customers
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );

CREATE POLICY "Finance users can insert customers" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  );

CREATE POLICY "Finance users can update customers" ON public.customers
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  );

CREATE POLICY "Admin users can view meter readings" ON public.meter_readings
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );

CREATE POLICY "Finance users can insert meter readings" ON public.meter_readings
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  );

CREATE POLICY "Finance users can update meter readings" ON public.meter_readings
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  );

CREATE POLICY "Admin users can view billings" ON public.billings
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );

CREATE POLICY "Finance users can insert billings" ON public.billings
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  );

CREATE POLICY "Finance users can update billings" ON public.billings
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  );

CREATE POLICY "Finance users can view sms logs" ON public.sms_logs
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  );

CREATE POLICY "Finance users can insert sms logs" ON public.sms_logs
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  );

CREATE POLICY "Finance users can update sms logs" ON public.sms_logs
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  );

-- RLS Policies for contact_submissions
-- Anyone can submit (no auth required for insert)
CREATE POLICY "Anyone can submit contact form" ON public.contact_submissions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Only admin users can view submissions
CREATE POLICY "Finance users can view contact submissions" ON public.contact_submissions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  );

CREATE POLICY "Finance users can update contact submissions" ON public.contact_submissions
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  );

CREATE POLICY "Finance users can delete contact submissions" ON public.contact_submissions
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role = 'finance'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_admin_profiles_updated_at ON public.admin_profiles;
CREATE TRIGGER update_admin_profiles_updated_at
  BEFORE UPDATE ON public.admin_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_billings_updated_at ON public.billings;
CREATE TRIGGER update_billings_updated_at
  BEFORE UPDATE ON public.billings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enforce_admin_profile_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.email NOT IN ('clarkkentibale@gmail.com', 'hashes0087@gmail.com') THEN
    RAISE EXCEPTION 'Unauthorized admin email.';
  END IF;

  IF (
    SELECT COUNT(*)
    FROM public.admin_profiles
    WHERE id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) >= 2 THEN
    RAISE EXCEPTION 'Only two admin profiles are allowed.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_admin_profile_limits ON public.admin_profiles;
CREATE TRIGGER enforce_admin_profile_limits
  BEFORE INSERT OR UPDATE ON public.admin_profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_profile_limits();

-- Function to generate account number
CREATE OR REPLACE FUNCTION public.generate_account_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  year_part TEXT;
  seq_number INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(account_number FROM 6) AS INTEGER)), 0) + 1
  INTO seq_number
  FROM public.customers
  WHERE account_number LIKE year_part || '-%';
  
  new_number := year_part || '-' || LPAD(seq_number::TEXT, 5, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;
