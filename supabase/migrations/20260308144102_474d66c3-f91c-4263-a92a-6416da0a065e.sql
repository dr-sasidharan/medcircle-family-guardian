
-- Add 6-digit medcircle code to patient_profiles
ALTER TABLE public.patient_profiles ADD COLUMN IF NOT EXISTS medcircle_code text UNIQUE;

-- Generate unique 6-digit codes for existing profiles
UPDATE public.patient_profiles 
SET medcircle_code = LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0')
WHERE medcircle_code IS NULL;

ALTER TABLE public.patient_profiles ALTER COLUMN medcircle_code SET DEFAULT LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');

-- Add caretaker user linking table
CREATE TABLE IF NOT EXISTS public.caretaker_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caretaker_user_id uuid NOT NULL,
  patient_profile_id uuid NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(caretaker_user_id, patient_profile_id)
);

ALTER TABLE public.caretaker_links ENABLE ROW LEVEL SECURITY;

-- Caretakers can see their own links
CREATE POLICY "Users can view own caretaker_links" ON public.caretaker_links 
  FOR SELECT TO authenticated USING (caretaker_user_id = auth.uid());
CREATE POLICY "Users can insert own caretaker_links" ON public.caretaker_links 
  FOR INSERT TO authenticated WITH CHECK (caretaker_user_id = auth.uid());
CREATE POLICY "Users can delete own caretaker_links" ON public.caretaker_links 
  FOR DELETE TO authenticated USING (caretaker_user_id = auth.uid());

-- Add onboarding_complete flag
ALTER TABLE public.patient_profiles ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;

-- Update the handle_new_user trigger to include medcircle_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.patient_profiles (user_id, name, age, medcircle_code, onboarding_complete)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Patient'), 
    0,
    LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0'),
    false
  );
  RETURN NEW;
END;
$$;
