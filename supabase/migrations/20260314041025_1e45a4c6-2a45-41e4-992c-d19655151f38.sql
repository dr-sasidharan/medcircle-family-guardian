
CREATE TABLE public.interaction_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  drug1 text NOT NULL,
  drug2 text NOT NULL,
  severity text NOT NULL DEFAULT 'unknown',
  source text NOT NULL DEFAULT 'claude',
  rxcui1 text,
  rxcui2 text,
  interaction_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.interaction_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own interaction checks"
  ON public.interaction_cache FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own interaction checks"
  ON public.interaction_cache FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access"
  ON public.interaction_cache FOR ALL TO service_role
  USING (true) WITH CHECK (true);
