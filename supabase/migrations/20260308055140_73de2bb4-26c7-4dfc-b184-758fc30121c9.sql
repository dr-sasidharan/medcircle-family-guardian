-- Create medicines table
CREATE TABLE public.medicines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  timing TEXT NOT NULL CHECK (timing IN ('morning', 'afternoon', 'night')),
  food_instruction TEXT NOT NULL DEFAULT 'after_food' CHECK (food_instruction IN ('before_food', 'after_food', 'with_food')),
  purpose TEXT,
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create doses table (daily dose tracking)
CREATE TABLE public.doses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
  scheduled_time TEXT NOT NULL CHECK (scheduled_time IN ('morning', 'afternoon', 'night')),
  taken BOOLEAN NOT NULL DEFAULT false,
  taken_at TIMESTAMP WITH TIME ZONE,
  missed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(medicine_id, scheduled_date, scheduled_time)
);

-- Enable RLS
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doses ENABLE ROW LEVEL SECURITY;

-- Medicines policies - allow all for demo (no auth)
CREATE POLICY "Anyone can view medicines" ON public.medicines FOR SELECT USING (true);
CREATE POLICY "Anyone can insert medicines" ON public.medicines FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update medicines" ON public.medicines FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete medicines" ON public.medicines FOR DELETE USING (true);

-- Doses policies
CREATE POLICY "Anyone can view doses" ON public.doses FOR SELECT USING (true);
CREATE POLICY "Anyone can insert doses" ON public.doses FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update doses" ON public.doses FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete doses" ON public.doses FOR DELETE USING (true);

-- Enable realtime on doses table
ALTER PUBLICATION supabase_realtime ADD TABLE public.doses;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_medicines_updated_at
  BEFORE UPDATE ON public.medicines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();