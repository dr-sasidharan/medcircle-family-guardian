
-- Create patient_profiles for existing auth users who don't have one
INSERT INTO public.patient_profiles (user_id, name, onboarding_complete)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', 'User'), false
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.patient_profiles pp WHERE pp.user_id = u.id
);
