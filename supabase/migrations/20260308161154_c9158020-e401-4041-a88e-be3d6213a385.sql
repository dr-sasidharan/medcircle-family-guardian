
-- Allow caretakers to insert bookings for their linked patients
CREATE POLICY "Caretakers can insert bookings for linked patients"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (patient_profile_id IN (SELECT get_linked_patient_ids()));

-- Allow caretakers to view bookings for their linked patients
CREATE POLICY "Caretakers can view linked patient bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (patient_profile_id IN (SELECT get_linked_patient_ids()));
