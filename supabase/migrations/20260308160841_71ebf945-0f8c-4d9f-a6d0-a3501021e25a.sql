
-- Doctors table
CREATE TABLE public.doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  specialty text NOT NULL,
  hospital_name text NOT NULL,
  phone text,
  photo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view doctors
CREATE POLICY "Authenticated users can view doctors"
  ON public.doctors FOR SELECT TO authenticated
  USING (true);

-- Doctor slots table
CREATE TABLE public.doctor_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  slot_date date NOT NULL,
  slot_time text NOT NULL,
  is_booked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, slot_date, slot_time)
);

ALTER TABLE public.doctor_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view slots"
  ON public.doctor_slots FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update slots"
  ON public.doctor_slots FOR UPDATE TO authenticated
  USING (true);

-- Bookings table
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_profile_id uuid NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  doctor_slot_id uuid NOT NULL REFERENCES public.doctor_slots(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id),
  status text NOT NULL DEFAULT 'confirmed',
  notes text,
  caretaker_notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (patient_profile_id = get_my_profile_id());

CREATE POLICY "Users can insert own bookings"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (patient_profile_id = get_my_profile_id());

CREATE POLICY "Users can update own bookings"
  ON public.bookings FOR UPDATE TO authenticated
  USING (patient_profile_id = get_my_profile_id());
