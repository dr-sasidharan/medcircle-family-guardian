-- Fix: Make medcircle_code lookup PERMISSIVE so caretakers can find patients
DROP POLICY IF EXISTS "Anyone can lookup by medcircle_code" ON public.patient_profiles;

CREATE POLICY "Anyone can lookup by medcircle_code"
ON public.patient_profiles
FOR SELECT
TO authenticated
USING (medcircle_code IS NOT NULL);