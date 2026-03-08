
-- Add user_id to doctors table so doctors can be linked to auth users
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS user_id uuid;

-- Create a security definer function to check if user is a doctor
CREATE OR REPLACE FUNCTION public.get_my_doctor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.doctors WHERE user_id = auth.uid() LIMIT 1
$$;

-- Allow doctors to INSERT their own slots
CREATE POLICY "Doctors can insert own slots"
ON public.doctor_slots
FOR INSERT
TO authenticated
WITH CHECK (doctor_id = get_my_doctor_id());

-- Allow doctors to DELETE their own slots (only unbooked)
CREATE POLICY "Doctors can delete own unbooked slots"
ON public.doctor_slots
FOR DELETE
TO authenticated
USING (doctor_id = get_my_doctor_id() AND is_booked = false);
