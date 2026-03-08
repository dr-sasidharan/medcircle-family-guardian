
-- Add plan column to patient_profiles
ALTER TABLE public.patient_profiles ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';

-- Create payments table
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_profile_id uuid REFERENCES public.patient_profiles(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,
  plan text NOT NULL,
  razorpay_payment_id text,
  razorpay_order_id text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert payments" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update payments" ON public.payments FOR UPDATE USING (true);
