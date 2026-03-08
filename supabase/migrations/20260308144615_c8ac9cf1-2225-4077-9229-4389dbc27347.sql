
-- Allow caretakers to view their linked patients' profiles
CREATE OR REPLACE FUNCTION public.get_linked_patient_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT patient_profile_id FROM public.caretaker_links WHERE caretaker_user_id = auth.uid()
$$;

-- Update patient_profiles policy to allow caretakers to view linked patients
DROP POLICY IF EXISTS "Users can view own profile" ON public.patient_profiles;
CREATE POLICY "Users can view own or linked profiles" ON public.patient_profiles 
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid() OR id IN (SELECT public.get_linked_patient_ids()));

-- Update medicines policy to allow caretakers to view linked patient medicines
DROP POLICY IF EXISTS "Users can view own medicines" ON public.medicines;
CREATE POLICY "Users can view own or linked medicines" ON public.medicines 
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid() OR user_id IN (SELECT pp.user_id FROM public.patient_profiles pp WHERE pp.id IN (SELECT public.get_linked_patient_ids())));

-- Update doses for caretaker viewing
DROP POLICY IF EXISTS "Users can view own doses" ON public.doses;
CREATE POLICY "Users can view own or linked doses" ON public.doses 
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid() OR user_id IN (SELECT pp.user_id FROM public.patient_profiles pp WHERE pp.id IN (SELECT public.get_linked_patient_ids())));

-- Update caretakers table for caretaker viewing
DROP POLICY IF EXISTS "Users can view own caretakers" ON public.caretakers;
CREATE POLICY "Users can view own or linked caretakers" ON public.caretakers 
  FOR SELECT TO authenticated 
  USING (patient_profile_id = public.get_my_profile_id() OR patient_profile_id IN (SELECT public.get_linked_patient_ids()));

-- Allow looking up patient by medcircle_code (needed for caretaker linking)
-- This needs a separate permissive policy for authenticated users
CREATE POLICY "Anyone can lookup by medcircle_code" ON public.patient_profiles
  FOR SELECT TO authenticated
  USING (medcircle_code IS NOT NULL);
