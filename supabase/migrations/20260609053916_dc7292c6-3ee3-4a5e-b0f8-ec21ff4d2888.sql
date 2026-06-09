
-- ============ 1. Add family_profile_id to medicines/doses/refills ============
ALTER TABLE public.medicines
  ADD COLUMN IF NOT EXISTS family_profile_id uuid REFERENCES public.family_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tablets_per_dose integer NOT NULL DEFAULT 1;

ALTER TABLE public.doses
  ADD COLUMN IF NOT EXISTS family_profile_id uuid REFERENCES public.family_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.medicine_refills
  ADD COLUMN IF NOT EXISTS family_profile_id uuid REFERENCES public.family_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS medicines_family_profile_idx ON public.medicines(family_profile_id);
CREATE INDEX IF NOT EXISTS doses_family_profile_idx ON public.doses(family_profile_id);
CREATE INDEX IF NOT EXISTS medicine_refills_family_profile_idx ON public.medicine_refills(family_profile_id);

-- Backfill: set family_profile_id = owner's Self profile
UPDATE public.medicines m
SET family_profile_id = fp.id
FROM public.family_profiles fp
WHERE m.family_profile_id IS NULL
  AND fp.owner_id = m.user_id
  AND fp.is_self = true;

UPDATE public.doses d
SET family_profile_id = m.family_profile_id
FROM public.medicines m
WHERE d.medicine_id = m.id AND d.family_profile_id IS NULL;

UPDATE public.medicine_refills r
SET family_profile_id = m.family_profile_id
FROM public.medicines m
WHERE r.medicine_id = m.id AND r.family_profile_id IS NULL;

-- ============ 2. Extend caregiver_notifications ============
ALTER TABLE public.caregiver_notifications
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info','warning','critical')),
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS action_url text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS caregiver_notifications_profile_idx
  ON public.caregiver_notifications(profile_id, created_at DESC);

-- ============ 3. Permission check helper ============
CREATE OR REPLACE FUNCTION public.caregiver_has_perm(_profile_id uuid, _perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.caregiver_permissions cp
    WHERE cp.profile_id = _profile_id
      AND cp.caregiver_id = auth.uid()
      AND (
        (_perm = 'view_medicines'   AND cp.can_view_medicines)
     OR (_perm = 'view_adherence'   AND cp.can_view_adherence)
     OR (_perm = 'view_alerts'      AND cp.can_view_alerts)
     OR (_perm = 'view_reports'     AND cp.can_view_reports)
     OR (_perm = 'view_appointments'AND cp.can_view_appointments)
      )
  )
$$;

-- ============ 4. Caregiver SELECT policies on medicines/doses/refills ============
DROP POLICY IF EXISTS "Caregivers can view medicines for permitted profiles" ON public.medicines;
CREATE POLICY "Caregivers can view medicines for permitted profiles"
  ON public.medicines FOR SELECT TO authenticated
  USING (family_profile_id IS NOT NULL AND public.caregiver_has_perm(family_profile_id, 'view_medicines'));

DROP POLICY IF EXISTS "Caregivers can view doses for permitted profiles" ON public.doses;
CREATE POLICY "Caregivers can view doses for permitted profiles"
  ON public.doses FOR SELECT TO authenticated
  USING (family_profile_id IS NOT NULL AND public.caregiver_has_perm(family_profile_id, 'view_adherence'));

DROP POLICY IF EXISTS "Caregivers can view refills for permitted profiles" ON public.medicine_refills;
CREATE POLICY "Caregivers can view refills for permitted profiles"
  ON public.medicine_refills FOR SELECT TO authenticated
  USING (family_profile_id IS NOT NULL AND public.caregiver_has_perm(family_profile_id, 'view_medicines'));

-- ============ 5. Push subscriptions ============
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ 6. Family member status helper ============
CREATE OR REPLACE FUNCTION public.family_member_status(_profile_id uuid, _date date DEFAULT CURRENT_DATE)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_is_owner boolean;
  v_total int := 0;
  v_taken int := 0;
  v_missed int := 0;
  v_low_refill int := 0;
  v_status text;
  v_meds_count int := 0;
BEGIN
  SELECT owner_id INTO v_owner FROM public.family_profiles WHERE id = _profile_id;
  IF v_owner IS NULL THEN RETURN NULL; END IF;
  v_is_owner := (v_owner = auth.uid());

  IF NOT v_is_owner AND NOT public.is_caregiver_of_profile(_profile_id) THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*) INTO v_meds_count
    FROM public.medicines WHERE family_profile_id = _profile_id AND is_active = true;

  -- count total scheduled slots today
  SELECT COALESCE(SUM(array_length(string_to_array(timing, ','), 1)),0) INTO v_total
    FROM public.medicines WHERE family_profile_id = _profile_id AND is_active = true;

  SELECT COUNT(*) INTO v_taken FROM public.doses
    WHERE family_profile_id = _profile_id AND scheduled_date = _date AND taken = true;
  SELECT COUNT(*) INTO v_missed FROM public.doses
    WHERE family_profile_id = _profile_id AND scheduled_date = _date AND missed = true AND taken = false;

  -- low refill count (≤7 days)
  SELECT COUNT(*) INTO v_low_refill
    FROM public.medicines m
    JOIN public.medicine_refills r ON r.medicine_id = m.id
    WHERE m.family_profile_id = _profile_id AND m.is_active = true
      AND r.tablets_remaining <= (array_length(string_to_array(m.timing, ','),1) * COALESCE(m.tablets_per_dose,1) * 7);

  v_status := CASE
    WHEN v_missed > 0 THEN 'missed_dose'
    WHEN v_low_refill > 0 THEN 'refill_needed'
    WHEN v_meds_count = 0 THEN 'no_medicines'
    WHEN v_taken >= v_total AND v_total > 0 THEN 'all_taken'
    ELSE 'on_track'
  END;

  RETURN jsonb_build_object(
    'profile_id', _profile_id,
    'total', v_total, 'taken', v_taken, 'missed', v_missed,
    'low_refill_count', v_low_refill, 'meds_count', v_meds_count,
    'status', v_status
  );
END $$;

-- ============ 7. Family overview RPC ============
CREATE OR REPLACE FUNCTION public.get_family_overview()
RETURNS TABLE(
  profile_id uuid, name text, relationship text, is_self boolean,
  conditions text[], status jsonb, is_owner boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT fp.id, fp.name, fp.relationship, fp.is_self, fp.conditions,
         public.family_member_status(fp.id, CURRENT_DATE),
         (fp.owner_id = auth.uid())
  FROM public.family_profiles fp
  WHERE fp.owner_id = auth.uid()
     OR public.is_caregiver_of_profile(fp.id)
  ORDER BY fp.is_self DESC, fp.created_at ASC
$$;

-- ============ 8. Refill scanner — generates alerts ============
CREATE OR REPLACE FUNCTION public.scan_refills_for_owner(_owner uuid DEFAULT auth.uid())
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  rec RECORD;
  v_days_left int;
  v_daily int;
  v_inserted int := 0;
BEGIN
  IF _owner IS NULL THEN RETURN 0; END IF;
  FOR rec IN
    SELECT m.id AS medicine_id, m.name, m.family_profile_id, m.timing, COALESCE(m.tablets_per_dose,1) AS tpd,
           r.tablets_remaining, fp.name AS profile_name
    FROM public.medicines m
    JOIN public.medicine_refills r ON r.medicine_id = m.id
    JOIN public.family_profiles fp ON fp.id = m.family_profile_id
    WHERE m.is_active = true AND fp.owner_id = _owner
  LOOP
    v_daily := GREATEST(array_length(string_to_array(rec.timing, ','),1) * rec.tpd, 1);
    v_days_left := FLOOR(rec.tablets_remaining::numeric / v_daily);
    IF v_days_left <= 7 THEN
      -- skip if alert already exists today for this medicine
      IF NOT EXISTS (
        SELECT 1 FROM public.caregiver_notifications
        WHERE caregiver_id = _owner AND profile_id = rec.family_profile_id
          AND category = 'refill' AND metadata->>'medicine_id' = rec.medicine_id::text
          AND created_at::date = CURRENT_DATE
      ) THEN
        INSERT INTO public.caregiver_notifications
          (caregiver_id, profile_id, type, message, severity, category, action_url, metadata)
        VALUES (
          _owner, rec.family_profile_id, 'refill_needed',
          rec.profile_name || ': ' || rec.name || ' has ~' || v_days_left || ' day(s) left — refill soon.',
          CASE WHEN v_days_left <= 2 THEN 'critical' WHEN v_days_left <= 5 THEN 'warning' ELSE 'info' END,
          'refill', '/medicines/' || rec.medicine_id,
          jsonb_build_object('medicine_id', rec.medicine_id, 'days_left', v_days_left, 'tablets_remaining', rec.tablets_remaining)
        );
        v_inserted := v_inserted + 1;
      END IF;
    END IF;
  END LOOP;
  RETURN v_inserted;
END $$;

-- ============ 9. Trigger: when a dose is marked missed, create caregiver alert ============
CREATE OR REPLACE FUNCTION public.notify_missed_dose()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_med RECORD;
  v_owner uuid;
  v_profile_name text;
BEGIN
  IF NEW.missed = true AND (OLD IS NULL OR OLD.missed = false) AND NEW.taken = false THEN
    SELECT m.name, m.family_profile_id INTO v_med
      FROM public.medicines m WHERE m.id = NEW.medicine_id;
    IF v_med.family_profile_id IS NULL THEN RETURN NEW; END IF;
    SELECT owner_id, name INTO v_owner, v_profile_name
      FROM public.family_profiles WHERE id = v_med.family_profile_id;

    -- notify owner
    INSERT INTO public.caregiver_notifications
      (caregiver_id, profile_id, type, message, severity, category, metadata)
    VALUES (v_owner, v_med.family_profile_id, 'missed_dose',
      v_profile_name || ' missed ' || v_med.name || ' (' || NEW.scheduled_time || ')',
      'warning', 'missed_dose',
      jsonb_build_object('medicine_id', NEW.medicine_id, 'dose_id', NEW.id, 'time', NEW.scheduled_time));

    -- notify caregivers with view_alerts permission
    INSERT INTO public.caregiver_notifications
      (caregiver_id, profile_id, type, message, severity, category, metadata)
    SELECT cp.caregiver_id, v_med.family_profile_id, 'missed_dose',
           v_profile_name || ' missed ' || v_med.name || ' (' || NEW.scheduled_time || ')',
           'warning', 'missed_dose',
           jsonb_build_object('medicine_id', NEW.medicine_id, 'dose_id', NEW.id)
    FROM public.caregiver_permissions cp
    WHERE cp.profile_id = v_med.family_profile_id AND cp.can_view_alerts = true
      AND cp.caregiver_id <> v_owner;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_missed_dose ON public.doses;
CREATE TRIGGER trg_notify_missed_dose
  AFTER INSERT OR UPDATE OF missed ON public.doses
  FOR EACH ROW EXECUTE FUNCTION public.notify_missed_dose();

-- ============ 10. Auto-set family_profile_id on medicines/doses inserts ============
CREATE OR REPLACE FUNCTION public.default_medicine_family_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.family_profile_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT id INTO NEW.family_profile_id FROM public.family_profiles
      WHERE owner_id = NEW.user_id AND is_self = true LIMIT 1;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_default_medicine_family_profile ON public.medicines;
CREATE TRIGGER trg_default_medicine_family_profile
  BEFORE INSERT ON public.medicines
  FOR EACH ROW EXECUTE FUNCTION public.default_medicine_family_profile();

CREATE OR REPLACE FUNCTION public.default_dose_family_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.family_profile_id IS NULL THEN
    SELECT family_profile_id INTO NEW.family_profile_id
      FROM public.medicines WHERE id = NEW.medicine_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_default_dose_family_profile ON public.doses;
CREATE TRIGGER trg_default_dose_family_profile
  BEFORE INSERT ON public.doses
  FOR EACH ROW EXECUTE FUNCTION public.default_dose_family_profile();
