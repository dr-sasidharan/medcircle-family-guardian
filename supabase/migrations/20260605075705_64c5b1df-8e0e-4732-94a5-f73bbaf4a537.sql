
ALTER TABLE public.phone_otps
  ADD COLUMN IF NOT EXISTS send_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS window_started_at timestamptz NOT NULL DEFAULT now();
