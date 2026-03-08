-- Patient profiles with health info
CREATE TABLE public.patient_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Rajesh Kumar',
  age INTEGER NOT NULL DEFAULT 62,
  blood_group TEXT DEFAULT 'B+',
  allergies TEXT[] DEFAULT ARRAY['Penicillin', 'Sulfa drugs'],
  emergency_contact TEXT DEFAULT '+91 98765 43210',
  emergency_notes TEXT DEFAULT 'Has Type 2 Diabetes and Hypertension. On blood thinners. Avoid NSAIDs.',
  chronic_conditions TEXT[] DEFAULT ARRAY['Type 2 Diabetes', 'Hypertension', 'High Cholesterol'],
  photo_url TEXT,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Caretakers linked to patient
CREATE TABLE public.caretakers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_profile_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Medicine refills tracker
CREATE TABLE public.medicine_refills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  total_tablets INTEGER NOT NULL DEFAULT 30,
  tablets_remaining INTEGER NOT NULL DEFAULT 30,
  refill_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Hospital visits
CREATE TABLE public.hospital_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_profile_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  hospital_name TEXT NOT NULL,
  visit_date DATE NOT NULL,
  doctor_name TEXT NOT NULL,
  diagnosis TEXT NOT NULL,
  notes TEXT,
  report_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caretakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_refills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_visits ENABLE ROW LEVEL SECURITY;

-- Open policies for demo (no auth)
CREATE POLICY "Anyone can view patient_profiles" ON public.patient_profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert patient_profiles" ON public.patient_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update patient_profiles" ON public.patient_profiles FOR UPDATE USING (true);

CREATE POLICY "Anyone can view caretakers" ON public.caretakers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert caretakers" ON public.caretakers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update caretakers" ON public.caretakers FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete caretakers" ON public.caretakers FOR DELETE USING (true);

CREATE POLICY "Anyone can view medicine_refills" ON public.medicine_refills FOR SELECT USING (true);
CREATE POLICY "Anyone can insert medicine_refills" ON public.medicine_refills FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update medicine_refills" ON public.medicine_refills FOR UPDATE USING (true);

CREATE POLICY "Anyone can view hospital_visits" ON public.hospital_visits FOR SELECT USING (true);
CREATE POLICY "Anyone can insert hospital_visits" ON public.hospital_visits FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update hospital_visits" ON public.hospital_visits FOR UPDATE USING (true);

-- Enable realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.caretakers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.medicine_refills;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hospital_visits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_profiles;

-- Trigger for updated_at
CREATE TRIGGER update_patient_profiles_updated_at
  BEFORE UPDATE ON public.patient_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medicine_refills_updated_at
  BEFORE UPDATE ON public.medicine_refills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();