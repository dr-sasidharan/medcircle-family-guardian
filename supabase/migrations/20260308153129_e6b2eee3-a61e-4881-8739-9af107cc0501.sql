
-- Remove demo defaults from patient_profiles columns
ALTER TABLE public.patient_profiles ALTER COLUMN name SET DEFAULT 'User';
ALTER TABLE public.patient_profiles ALTER COLUMN age SET DEFAULT 0;
ALTER TABLE public.patient_profiles ALTER COLUMN blood_group SET DEFAULT NULL;
ALTER TABLE public.patient_profiles ALTER COLUMN allergies SET DEFAULT NULL;
ALTER TABLE public.patient_profiles ALTER COLUMN chronic_conditions SET DEFAULT NULL;
ALTER TABLE public.patient_profiles ALTER COLUMN emergency_contact SET DEFAULT NULL;
ALTER TABLE public.patient_profiles ALTER COLUMN emergency_notes SET DEFAULT NULL;

-- Update trigger to set clean defaults for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.patient_profiles (user_id, name, age, onboarding_complete)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
    0,
    false
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
