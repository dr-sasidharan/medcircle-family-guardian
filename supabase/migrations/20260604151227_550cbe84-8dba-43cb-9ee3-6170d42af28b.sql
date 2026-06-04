
-- 1. Admin role infrastructure
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2. Fix patient_profiles medcircle_code overexposure
DROP POLICY IF EXISTS "Anyone can lookup by medcircle_code" ON public.patient_profiles;

CREATE OR REPLACE FUNCTION public.lookup_patient_by_medcircle_code(_code text)
RETURNS TABLE (id uuid, name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name FROM public.patient_profiles
  WHERE medcircle_code = _code
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.lookup_patient_by_medcircle_code(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.lookup_patient_by_medcircle_code(text) TO authenticated;

-- 3. Add DELETE policies on hospital_visits and medicine_refills
DROP POLICY IF EXISTS "Users can delete their own hospital visits" ON public.hospital_visits;
CREATE POLICY "Users can delete their own hospital visits" ON public.hospital_visits
  FOR DELETE TO authenticated
  USING (patient_profile_id = public.get_my_profile_id());

DROP POLICY IF EXISTS "Users can delete their own medicine refills" ON public.medicine_refills;
CREATE POLICY "Users can delete their own medicine refills" ON public.medicine_refills
  FOR DELETE TO authenticated
  USING (public.is_my_medicine(medicine_id));

-- 4. Restrict doctor_slots UPDATE to owning doctor only
DROP POLICY IF EXISTS "Authenticated users can update slots" ON public.doctor_slots;
CREATE POLICY "Doctors can update their own slots" ON public.doctor_slots
  FOR UPDATE TO authenticated
  USING (doctor_id = public.get_my_doctor_id())
  WITH CHECK (doctor_id = public.get_my_doctor_id());

-- Allow booking flow: patient can flip is_booked false->true on a slot (handled via service role in booking edge function ideally)
-- Keep simple: doctors manage their slots; booking inserts go through bookings table.

-- 5. Storage: profile-photos UPDATE/DELETE require ownership (path prefix = auth.uid())
DROP POLICY IF EXISTS "Anyone can update profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile photo" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile photo" ON storage.objects;

CREATE POLICY "Users can update own profile photo" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own profile photo" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 6. phone_otps: explicit deny for client roles (only service role inserts/reads)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='phone_otps') THEN
    EXECUTE 'ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON public.phone_otps FROM anon, authenticated';
    EXECUTE 'GRANT ALL ON public.phone_otps TO service_role';
    EXECUTE 'DROP POLICY IF EXISTS "Deny all client access to phone_otps" ON public.phone_otps';
    EXECUTE 'CREATE POLICY "Deny all client access to phone_otps" ON public.phone_otps FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)';
  END IF;
END $$;
