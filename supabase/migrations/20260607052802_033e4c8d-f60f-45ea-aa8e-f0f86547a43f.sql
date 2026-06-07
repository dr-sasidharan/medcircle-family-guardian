
-- Allow patients to delete their own bookings
CREATE POLICY "Patients can delete their own bookings"
ON public.bookings
FOR DELETE
TO authenticated
USING (patient_profile_id = public.get_my_profile_id());

-- Allow patients to see caretaker links pointing to their own profile
CREATE POLICY "Patients can view their caretaker links"
ON public.caretaker_links
FOR SELECT
TO authenticated
USING (patient_profile_id = public.get_my_profile_id());

-- Allow patients to remove caretaker links to their own profile
CREATE POLICY "Patients can delete their caretaker links"
ON public.caretaker_links
FOR DELETE
TO authenticated
USING (patient_profile_id = public.get_my_profile_id());

-- Allow users to update and delete their own WhatsApp reminders
CREATE POLICY "Users can update their own whatsapp reminders"
ON public.whatsapp_reminders
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own whatsapp reminders"
ON public.whatsapp_reminders
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
