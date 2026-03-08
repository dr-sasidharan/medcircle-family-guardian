CREATE TABLE public.symptom_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_profile_id uuid NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  symptom text NOT NULL,
  urgency text NOT NULL DEFAULT 'NORMAL',
  urgency_color text NOT NULL DEFAULT 'green',
  likely_medicine text,
  is_side_effect boolean NOT NULL DEFAULT false,
  summary text,
  what_to_do text[] DEFAULT '{}',
  tamil_explanation text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.symptom_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view symptom_checks" ON public.symptom_checks FOR SELECT USING (true);
CREATE POLICY "Anyone can insert symptom_checks" ON public.symptom_checks FOR INSERT WITH CHECK (true);

CREATE INDEX idx_symptom_checks_patient ON public.symptom_checks(patient_profile_id, created_at DESC);