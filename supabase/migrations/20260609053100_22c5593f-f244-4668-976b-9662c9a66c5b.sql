
-- 1. Caretakers can view linked patient hospital visits
CREATE POLICY "Caretakers can view linked hospital_visits"
ON public.hospital_visits
FOR SELECT
TO authenticated
USING (patient_profile_id IN (SELECT public.get_linked_patient_ids()));

-- 2. Restrict payment UPDATE to only the upi_transaction_id column
DROP POLICY IF EXISTS "Users can update own payment reference" ON public.payments;
REVOKE UPDATE ON public.payments FROM authenticated;
GRANT UPDATE (upi_transaction_id) ON public.payments TO authenticated;

CREATE POLICY "Users can update own payment upi reference"
ON public.payments
FOR UPDATE
TO authenticated
USING (patient_profile_id = public.get_my_profile_id())
WITH CHECK (patient_profile_id = public.get_my_profile_id());
