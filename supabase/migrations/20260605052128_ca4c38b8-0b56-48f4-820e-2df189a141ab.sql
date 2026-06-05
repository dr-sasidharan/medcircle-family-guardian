
-- 1. Payments: restrict UPDATE to only the reference column
DROP POLICY IF EXISTS "Users can update own payments" ON public.payments;
CREATE POLICY "Users can update own payment reference"
ON public.payments
FOR UPDATE
TO authenticated
USING (patient_profile_id = public.get_my_profile_id())
WITH CHECK (
  patient_profile_id = public.get_my_profile_id()
  AND status = (SELECT status FROM public.payments p WHERE p.id = payments.id)
  AND amount = (SELECT amount FROM public.payments p WHERE p.id = payments.id)
);

-- 2. Storage: remove overly permissive policies, tighten INSERT
DROP POLICY IF EXISTS "Users can delete profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload profile photos" ON storage.objects;

CREATE POLICY "Users can upload own profile photo"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Remove sensitive tables from realtime publication (no app feature subscribes)
ALTER PUBLICATION supabase_realtime DROP TABLE public.patient_profiles;
ALTER PUBLICATION supabase_realtime DROP TABLE public.payments;
ALTER PUBLICATION supabase_realtime DROP TABLE public.hospital_visits;
ALTER PUBLICATION supabase_realtime DROP TABLE public.caretakers;
ALTER PUBLICATION supabase_realtime DROP TABLE public.doses;
ALTER PUBLICATION supabase_realtime DROP TABLE public.medicine_refills;
