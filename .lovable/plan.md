## MedCircle Build 1 — Family & Caregiver Foundation

This is a large foundation build. I want to confirm scope before writing any code or migrations. Existing MedCircle features (auth, meds, reminders, AI, emergency QR, etc.) are not touched.

### 1. Database migration (single migration, all tables in `public`)

Tables (exactly per spec, with GRANTs + RLS + policies):

- `family_profiles` — patient/family members, owned by `auth.users.id`. `is_self` unique per owner via partial unique index.
- `family_relationships` — links between two `family_profiles`.
- `caregiver_invitations` — pending/accepted/declined/expired invites. `invite_token` unique. `expires_at` default = `now() + interval '7 days'`.
- `caregiver_permissions` — fine-grained capability flags + notification prefs per caregiver/profile.
- `caregiver_notifications` — event feed for caregivers.
- `caregiver_audit_logs` — sensitive-action log.

Helpers:

- Security-definer functions: `is_profile_owner(profile_id)`, `is_caregiver_of(profile_id)`, `has_permission(profile_id, perm_name)` to avoid recursive RLS.
- `handle_new_user_self_profile()` trigger on `auth.users` insert → creates one `family_profiles` row with `relationship='Self'`, `is_self=true`. Idempotent; coexists with the existing `handle_new_user()` patient-profile trigger (both fire, neither replaces the other).
- `updated_at` trigger on `family_profiles`.
- `accept_caregiver_invitation(token)` SECURITY DEFINER RPC: validates token + expiry, sets status=Accepted, creates `caregiver_permissions` from the invitation's role defaults, writes audit log, inserts notification for owner.
- `expire_old_invitations()` helper used inline by the accept RPC (lazy expiry — no cron needed for Build 1).

RLS summary:

- `family_profiles`: owner full access; caregiver SELECT when `has_permission(id, 'can_view_*')` (any view perm).
- `caregiver_invitations`: inviter full access; invitee SELECT/UPDATE via token through the RPC only (no direct policy for invitee email matching to keep it simple and safe).
- `caregiver_permissions`: owner of profile full access; caregiver SELECT own rows.
- `caregiver_notifications`: caregiver SELECT/UPDATE own rows.
- `caregiver_audit_logs`: profile owner SELECT; inserts via SECURITY DEFINER paths only.

### 2. Edge functions

- `send-caregiver-invite` — generates token, inserts invitation, sends email via existing email infra if domain set up (otherwise returns share link only), returns invite URL. Logs to audit.
- `accept-caregiver-invite` — thin wrapper calling the `accept_caregiver_invitation` RPC; also creates notification for inviter.

(Both `verify_jwt = false` only where needed; accept requires login so JWT verified in code.)

### 3. Frontend screens & routes

New routes under `/family`:

- `/family` — Family Members list (relationship, name, age, actions). CTA: Add Family Member, Manage Caregivers.
- `/family/new` and `/family/:id/edit` — Add/Edit profile form (all spec fields).
- `/family/:id/caregivers` — Caregiver management for that profile: list caregivers, edit permissions sheet, revoke, resend invite.
- `/family/:id/invite` — Invite caregiver: method (email/mobile/link), role, permission checkboxes, notification prefs.
- `/invite/:token` — Invitation acceptance screen (public route, prompts login if needed, then shows Accept/Decline; expired state).

Add a "Family" entry to `BottomNav` (or Profile page card) — minimal nav change only.

Components: reuse existing UI primitives (Card, Sheet, Button, Input, Checkbox). No new design system work.

### 4. Notification triggers (backend only, no UI)

Inserts into `caregiver_notifications` on:
- invitation_accepted → notify inviter
- permission_changed → notify caregiver
- profile_updated → notify all caregivers of that profile
- caregiver_removed → notify caregiver
- invitation_expiring_soon → handled lazily when invitation is listed (computed); no cron in Build 1

Each event also writes a `caregiver_audit_logs` row.

### 5. Out of scope (explicitly Build 2)

Family dashboard, family AI, refill intelligence, family analytics, caregiver notification UI/inbox, push/SMS delivery, cron-based expiry sweeper.

### Technical notes

- All new tables grant `SELECT/INSERT/UPDATE/DELETE` to `authenticated` and `ALL` to `service_role`. No `anon` grants.
- `family_profiles` does not store medications; later builds can link `medicines.profile_id` (not added now).
- The existing `patient_profiles` table is left alone. `family_profiles` is the new family-member structure; the Self profile in `family_profiles` is created in parallel and references `auth.users` directly via `owner_id`.
- I will NOT touch: auth, `patient_profiles`, `medicines`, `doses`, `caretakers`, `caretaker_links`, reminders, AI edge functions, emergency QR, settings.

### Questions before I build

1. **Self-profile name source** — for the auto-created Self row, use `raw_user_meta_data->>'full_name'` (fallback `'You'`)? Age will be `null` (column nullable) until the user edits — confirm nullable age is OK, since the spec lists `age integer` without `not null`.
2. **Email sending for invites** — should I wire `send-caregiver-invite` to actually send via the existing email infrastructure (will require an email domain to be configured), or for Build 1 just generate the share link + store the invitation and skip email delivery? Share link works for all three methods (email/mobile/link) since the link is the source of truth.
3. **Nav placement** — add "Family" as a new tab in `BottomNav`, or as a card on the existing `Profile` page only? (Bottom nav is already crowded.)
