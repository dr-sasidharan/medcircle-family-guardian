
-- Auto-create patient profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.patient_profiles (user_id, name, age)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Patient'), 0);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper function to get patient_profile_id for current user
CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.patient_profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- Helper: check if medicine belongs to current user
CREATE OR REPLACE FUNCTION public.is_my_medicine(_medicine_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.medicines WHERE id = _medicine_id AND user_id = auth.uid())
$$;

-- ========= patient_profiles =========
DROP POLICY IF EXISTS "Anyone can insert patient_profiles" ON public.patient_profiles;
DROP POLICY IF EXISTS "Anyone can update patient_profiles" ON public.patient_profiles;
DROP POLICY IF EXISTS "Anyone can view patient_profiles" ON public.patient_profiles;

CREATE POLICY "Users can view own profile" ON public.patient_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.patient_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.patient_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ========= medicines =========
DROP POLICY IF EXISTS "Anyone can insert medicines" ON public.medicines;
DROP POLICY IF EXISTS "Anyone can update medicines" ON public.medicines;
DROP POLICY IF EXISTS "Anyone can view medicines" ON public.medicines;
DROP POLICY IF EXISTS "Anyone can delete medicines" ON public.medicines;

CREATE POLICY "Users can view own medicines" ON public.medicines FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own medicines" ON public.medicines FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own medicines" ON public.medicines FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own medicines" ON public.medicines FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ========= doses =========
DROP POLICY IF EXISTS "Anyone can insert doses" ON public.doses;
DROP POLICY IF EXISTS "Anyone can update doses" ON public.doses;
DROP POLICY IF EXISTS "Anyone can view doses" ON public.doses;
DROP POLICY IF EXISTS "Anyone can delete doses" ON public.doses;

CREATE POLICY "Users can view own doses" ON public.doses FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own doses" ON public.doses FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own doses" ON public.doses FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own doses" ON public.doses FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ========= caretakers =========
DROP POLICY IF EXISTS "Anyone can insert caretakers" ON public.caretakers;
DROP POLICY IF EXISTS "Anyone can update caretakers" ON public.caretakers;
DROP POLICY IF EXISTS "Anyone can view caretakers" ON public.caretakers;
DROP POLICY IF EXISTS "Anyone can delete caretakers" ON public.caretakers;

CREATE POLICY "Users can view own caretakers" ON public.caretakers FOR SELECT TO authenticated USING (patient_profile_id = public.get_my_profile_id());
CREATE POLICY "Users can insert own caretakers" ON public.caretakers FOR INSERT TO authenticated WITH CHECK (patient_profile_id = public.get_my_profile_id());
CREATE POLICY "Users can update own caretakers" ON public.caretakers FOR UPDATE TO authenticated USING (patient_profile_id = public.get_my_profile_id());
CREATE POLICY "Users can delete own caretakers" ON public.caretakers FOR DELETE TO authenticated USING (patient_profile_id = public.get_my_profile_id());

-- ========= hospital_visits =========
DROP POLICY IF EXISTS "Anyone can insert hospital_visits" ON public.hospital_visits;
DROP POLICY IF EXISTS "Anyone can update hospital_visits" ON public.hospital_visits;
DROP POLICY IF EXISTS "Anyone can view hospital_visits" ON public.hospital_visits;

CREATE POLICY "Users can view own hospital_visits" ON public.hospital_visits FOR SELECT TO authenticated USING (patient_profile_id = public.get_my_profile_id());
CREATE POLICY "Users can insert own hospital_visits" ON public.hospital_visits FOR INSERT TO authenticated WITH CHECK (patient_profile_id = public.get_my_profile_id());
CREATE POLICY "Users can update own hospital_visits" ON public.hospital_visits FOR UPDATE TO authenticated USING (patient_profile_id = public.get_my_profile_id());

-- ========= medicine_refills =========
DROP POLICY IF EXISTS "Anyone can insert medicine_refills" ON public.medicine_refills;
DROP POLICY IF EXISTS "Anyone can update medicine_refills" ON public.medicine_refills;
DROP POLICY IF EXISTS "Anyone can view medicine_refills" ON public.medicine_refills;

CREATE POLICY "Users can view own medicine_refills" ON public.medicine_refills FOR SELECT TO authenticated USING (public.is_my_medicine(medicine_id));
CREATE POLICY "Users can insert own medicine_refills" ON public.medicine_refills FOR INSERT TO authenticated WITH CHECK (public.is_my_medicine(medicine_id));
CREATE POLICY "Users can update own medicine_refills" ON public.medicine_refills FOR UPDATE TO authenticated USING (public.is_my_medicine(medicine_id));

-- ========= symptom_checks =========
DROP POLICY IF EXISTS "Anyone can insert symptom_checks" ON public.symptom_checks;
DROP POLICY IF EXISTS "Anyone can view symptom_checks" ON public.symptom_checks;

CREATE POLICY "Users can view own symptom_checks" ON public.symptom_checks FOR SELECT TO authenticated USING (patient_profile_id = public.get_my_profile_id());
CREATE POLICY "Users can insert own symptom_checks" ON public.symptom_checks FOR INSERT TO authenticated WITH CHECK (patient_profile_id = public.get_my_profile_id());

-- ========= payments =========
DROP POLICY IF EXISTS "Anyone can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Anyone can update payments" ON public.payments;
DROP POLICY IF EXISTS "Anyone can view payments" ON public.payments;

CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT TO authenticated USING (patient_profile_id = public.get_my_profile_id());
CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (patient_profile_id = public.get_my_profile_id());
CREATE POLICY "Users can update own payments" ON public.payments FOR UPDATE TO authenticated USING (patient_profile_id = public.get_my_profile_id());
