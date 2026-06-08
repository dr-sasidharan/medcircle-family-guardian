
-- ============================================================
-- FAMILY PROFILES
-- ============================================================
CREATE TABLE public.family_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship text,
  name text NOT NULL,
  age integer,
  gender text,
  blood_group text,
  height numeric,
  weight numeric,
  conditions text[],
  allergies text[],
  emergency_contact_name text,
  emergency_contact_phone text,
  doctor_name text,
  doctor_phone text,
  is_self boolean NOT NULL DEFAULT false,
  allow_emergency_access boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX family_profiles_one_self_per_owner
  ON public.family_profiles(owner_id) WHERE is_self = true;
CREATE INDEX family_profiles_owner_idx ON public.family_profiles(owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_profiles TO authenticated;
GRANT ALL ON public.family_profiles TO service_role;
ALTER TABLE public.family_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FAMILY RELATIONSHIPS
-- ============================================================
CREATE TABLE public.family_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.family_profiles(id) ON DELETE CASCADE,
  related_profile_id uuid NOT NULL REFERENCES public.family_profiles(id) ON DELETE CASCADE,
  relationship_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (profile_id <> related_profile_id)
);
CREATE INDEX family_relationships_profile_idx ON public.family_relationships(profile_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_relationships TO authenticated;
GRANT ALL ON public.family_relationships TO service_role;
ALTER TABLE public.family_relationships ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CAREGIVER INVITATIONS
-- ============================================================
CREATE TABLE public.caregiver_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.family_profiles(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email text,
  invitee_phone text,
  invite_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  method text NOT NULL DEFAULT 'link',
  role text NOT NULL DEFAULT 'Caregiver',
  status text NOT NULL DEFAULT 'Pending',
  permissions_template jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX caregiver_invitations_profile_idx ON public.caregiver_invitations(profile_id);
CREATE INDEX caregiver_invitations_inviter_idx ON public.caregiver_invitations(invited_by);
CREATE INDEX caregiver_invitations_token_idx ON public.caregiver_invitations(invite_token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.caregiver_invitations TO authenticated;
GRANT ALL ON public.caregiver_invitations TO service_role;
ALTER TABLE public.caregiver_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CAREGIVER PERMISSIONS
-- ============================================================
CREATE TABLE public.caregiver_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid REFERENCES public.caregiver_invitations(id) ON DELETE SET NULL,
  caregiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.family_profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'Caregiver',
  can_view_medicines boolean NOT NULL DEFAULT true,
  can_view_adherence boolean NOT NULL DEFAULT true,
  can_view_alerts boolean NOT NULL DEFAULT true,
  can_view_reports boolean NOT NULL DEFAULT false,
  can_view_appointments boolean NOT NULL DEFAULT false,
  can_add_medicines boolean NOT NULL DEFAULT false,
  can_edit_medicines boolean NOT NULL DEFAULT false,
  can_add_reports boolean NOT NULL DEFAULT false,
  can_manage_appointments boolean NOT NULL DEFAULT false,
  email_notifications boolean NOT NULL DEFAULT true,
  push_notifications boolean NOT NULL DEFAULT true,
  sms_notifications boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (caregiver_id, profile_id)
);
CREATE INDEX caregiver_permissions_caregiver_idx ON public.caregiver_permissions(caregiver_id);
CREATE INDEX caregiver_permissions_profile_idx ON public.caregiver_permissions(profile_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.caregiver_permissions TO authenticated;
GRANT ALL ON public.caregiver_permissions TO service_role;
ALTER TABLE public.caregiver_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CAREGIVER NOTIFICATIONS
-- ============================================================
CREATE TABLE public.caregiver_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.family_profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX caregiver_notifications_caregiver_idx ON public.caregiver_notifications(caregiver_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.caregiver_notifications TO authenticated;
GRANT ALL ON public.caregiver_notifications TO service_role;
ALTER TABLE public.caregiver_notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CAREGIVER AUDIT LOGS
-- ============================================================
CREATE TABLE public.caregiver_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES public.family_profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX caregiver_audit_logs_profile_idx ON public.caregiver_audit_logs(profile_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.caregiver_audit_logs TO authenticated;
GRANT ALL ON public.caregiver_audit_logs TO service_role;
ALTER TABLE public.caregiver_audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_family_profile_owner(_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.family_profiles WHERE id = _profile_id AND owner_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.is_caregiver_of_profile(_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.caregiver_permissions
    WHERE profile_id = _profile_id AND caregiver_id = auth.uid()
  )
$$;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- family_profiles
CREATE POLICY "fp_owner_all" ON public.family_profiles
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "fp_caregiver_select" ON public.family_profiles
  FOR SELECT TO authenticated
  USING (public.is_caregiver_of_profile(id));

-- family_relationships
CREATE POLICY "fr_owner_all" ON public.family_relationships
  FOR ALL TO authenticated
  USING (public.is_family_profile_owner(profile_id))
  WITH CHECK (public.is_family_profile_owner(profile_id));

CREATE POLICY "fr_caregiver_select" ON public.family_relationships
  FOR SELECT TO authenticated
  USING (public.is_caregiver_of_profile(profile_id));

-- caregiver_invitations
CREATE POLICY "ci_inviter_all" ON public.caregiver_invitations
  FOR ALL TO authenticated
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid() AND public.is_family_profile_owner(profile_id));

-- caregiver_permissions
CREATE POLICY "cp_owner_all" ON public.caregiver_permissions
  FOR ALL TO authenticated
  USING (public.is_family_profile_owner(profile_id))
  WITH CHECK (public.is_family_profile_owner(profile_id));

CREATE POLICY "cp_caregiver_select" ON public.caregiver_permissions
  FOR SELECT TO authenticated
  USING (caregiver_id = auth.uid());

-- caregiver_notifications
CREATE POLICY "cn_caregiver_select" ON public.caregiver_notifications
  FOR SELECT TO authenticated
  USING (caregiver_id = auth.uid());

CREATE POLICY "cn_caregiver_update" ON public.caregiver_notifications
  FOR UPDATE TO authenticated
  USING (caregiver_id = auth.uid())
  WITH CHECK (caregiver_id = auth.uid());

-- caregiver_audit_logs
CREATE POLICY "cal_owner_select" ON public.caregiver_audit_logs
  FOR SELECT TO authenticated
  USING (public.is_family_profile_owner(profile_id));

-- ============================================================
-- updated_at trigger
-- ============================================================
CREATE TRIGGER family_profiles_updated_at
  BEFORE UPDATE ON public.family_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER caregiver_permissions_updated_at
  BEFORE UPDATE ON public.caregiver_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- SELF PROFILE AUTOMATION
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_self_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.family_profiles (owner_id, relationship, name, is_self)
  VALUES (
    NEW.id,
    'Self',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'You'),
    true
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_family_self
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_self_profile();

-- Backfill Self profile for existing users
INSERT INTO public.family_profiles (owner_id, relationship, name, is_self)
SELECT u.id, 'Self',
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', 'You'),
  true
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.family_profiles fp WHERE fp.owner_id = u.id AND fp.is_self = true
);

-- ============================================================
-- ACCEPT INVITATION RPC (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_caregiver_invitation(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inv public.caregiver_invitations%ROWTYPE;
  v_uid uuid := auth.uid();
  v_perm_id uuid;
  v_tmpl jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_inv FROM public.caregiver_invitations WHERE invite_token = _token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_inv.status = 'Accepted' THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'profile_id', v_inv.profile_id);
  END IF;

  IF v_inv.status IN ('Declined','Expired') THEN
    RETURN jsonb_build_object('ok', false, 'error', lower(v_inv.status));
  END IF;

  IF v_inv.expires_at < now() THEN
    UPDATE public.caregiver_invitations SET status='Expired' WHERE id = v_inv.id;
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  v_tmpl := COALESCE(v_inv.permissions_template, '{}'::jsonb);

  INSERT INTO public.caregiver_permissions (
    invitation_id, caregiver_id, profile_id, role,
    can_view_medicines, can_view_adherence, can_view_alerts,
    can_view_reports, can_view_appointments,
    can_add_medicines, can_edit_medicines, can_add_reports, can_manage_appointments,
    email_notifications, push_notifications, sms_notifications
  ) VALUES (
    v_inv.id, v_uid, v_inv.profile_id, v_inv.role,
    COALESCE((v_tmpl->>'can_view_medicines')::boolean, true),
    COALESCE((v_tmpl->>'can_view_adherence')::boolean, true),
    COALESCE((v_tmpl->>'can_view_alerts')::boolean, true),
    COALESCE((v_tmpl->>'can_view_reports')::boolean, false),
    COALESCE((v_tmpl->>'can_view_appointments')::boolean, false),
    COALESCE((v_tmpl->>'can_add_medicines')::boolean, false),
    COALESCE((v_tmpl->>'can_edit_medicines')::boolean, false),
    COALESCE((v_tmpl->>'can_add_reports')::boolean, false),
    COALESCE((v_tmpl->>'can_manage_appointments')::boolean, false),
    COALESCE((v_tmpl->>'email_notifications')::boolean, true),
    COALESCE((v_tmpl->>'push_notifications')::boolean, true),
    COALESCE((v_tmpl->>'sms_notifications')::boolean, false)
  )
  ON CONFLICT (caregiver_id, profile_id) DO UPDATE
    SET invitation_id = EXCLUDED.invitation_id, role = EXCLUDED.role
  RETURNING id INTO v_perm_id;

  UPDATE public.caregiver_invitations SET status='Accepted' WHERE id = v_inv.id;

  INSERT INTO public.caregiver_audit_logs (actor_user_id, profile_id, action, metadata)
  VALUES (v_uid, v_inv.profile_id, 'Invitation Accepted',
    jsonb_build_object('invitation_id', v_inv.id, 'permission_id', v_perm_id));

  INSERT INTO public.caregiver_notifications (caregiver_id, profile_id, type, message)
  VALUES (v_inv.invited_by, v_inv.profile_id, 'invitation_accepted',
    'Your caregiver invitation was accepted.');

  RETURN jsonb_build_object('ok', true, 'profile_id', v_inv.profile_id, 'permission_id', v_perm_id);
END;
$$;

REVOKE ALL ON FUNCTION public.accept_caregiver_invitation(text) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_caregiver_invitation(text) TO authenticated;

-- ============================================================
-- DECLINE INVITATION RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.decline_caregiver_invitation(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inv public.caregiver_invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_inv FROM public.caregiver_invitations WHERE invite_token = _token;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF v_inv.status <> 'Pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', lower(v_inv.status));
  END IF;
  UPDATE public.caregiver_invitations SET status='Declined' WHERE id = v_inv.id;
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.decline_caregiver_invitation(text) FROM public;
GRANT EXECUTE ON FUNCTION public.decline_caregiver_invitation(text) TO authenticated;

-- ============================================================
-- LOOKUP INVITATION RPC (read invite by token without exposing table)
-- ============================================================
CREATE OR REPLACE FUNCTION public.lookup_caregiver_invitation(_token text)
RETURNS TABLE (
  id uuid, profile_id uuid, profile_name text, inviter_email text,
  role text, status text, expires_at timestamptz, method text,
  permissions_template jsonb
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ci.id, ci.profile_id, fp.name AS profile_name,
         u.email AS inviter_email, ci.role,
         CASE WHEN ci.status='Pending' AND ci.expires_at < now() THEN 'Expired' ELSE ci.status END,
         ci.expires_at, ci.method, ci.permissions_template
  FROM public.caregiver_invitations ci
  LEFT JOIN public.family_profiles fp ON fp.id = ci.profile_id
  LEFT JOIN auth.users u ON u.id = ci.invited_by
  WHERE ci.invite_token = _token
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.lookup_caregiver_invitation(text) FROM public;
GRANT EXECUTE ON FUNCTION public.lookup_caregiver_invitation(text) TO authenticated, anon;
