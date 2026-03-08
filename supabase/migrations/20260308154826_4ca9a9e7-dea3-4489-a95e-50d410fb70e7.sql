
-- Table to track WhatsApp reminder status and feedback
CREATE TABLE public.whatsapp_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  medicine_id uuid REFERENCES public.medicines(id) ON DELETE CASCADE NOT NULL,
  medicine_name text NOT NULL,
  dosage text NOT NULL,
  timing text NOT NULL,
  scheduled_date date NOT NULL DEFAULT CURRENT_DATE,
  sent_at timestamptz,
  followup_sent_at timestamptz,
  response text, -- 'aam' or 'illai' or null
  response_at timestamptz,
  caretaker_notified boolean DEFAULT false,
  phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders"
  ON public.whatsapp_reminders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service can insert reminders"
  ON public.whatsapp_reminders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
