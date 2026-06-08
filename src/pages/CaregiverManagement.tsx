import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Copy, Mail, Phone, Link as LinkIcon, X, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Permission {
  id: string;
  caregiver_id: string;
  role: string;
  can_view_medicines: boolean;
  can_view_adherence: boolean;
  can_view_alerts: boolean;
  can_view_reports: boolean;
  can_view_appointments: boolean;
  can_add_medicines: boolean;
  can_edit_medicines: boolean;
  can_add_reports: boolean;
  can_manage_appointments: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
}

interface Invitation {
  id: string;
  invitee_email: string | null;
  invitee_phone: string | null;
  invite_token: string;
  method: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
}

const PERM_FIELDS: { key: keyof Permission; label: string }[] = [
  { key: "can_view_medicines", label: "View medicines" },
  { key: "can_view_adherence", label: "View adherence" },
  { key: "can_view_alerts", label: "View alerts" },
  { key: "can_view_reports", label: "View reports" },
  { key: "can_view_appointments", label: "View appointments" },
  { key: "can_add_medicines", label: "Add medicines" },
  { key: "can_edit_medicines", label: "Edit medicines" },
  { key: "can_add_reports", label: "Add reports" },
  { key: "can_manage_appointments", label: "Manage appointments" },
];
const NOTIFY_FIELDS: { key: keyof Permission; label: string }[] = [
  { key: "email_notifications", label: "Email" },
  { key: "push_notifications", label: "Push" },
  { key: "sms_notifications", label: "SMS" },
];

export default function CaregiverManagement() {
  const navigate = useNavigate();
  const { id: profileId } = useParams();
  const [profileName, setProfileName] = useState("");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [editing, setEditing] = useState<Permission | null>(null);

  const load = async () => {
    if (!profileId) return;
    const [{ data: prof }, { data: perms }, { data: invs }] = await Promise.all([
      supabase.from("family_profiles").select("name").eq("id", profileId).maybeSingle(),
      supabase.from("caregiver_permissions").select("*").eq("profile_id", profileId),
      supabase.from("caregiver_invitations").select("*").eq("profile_id", profileId).order("created_at", { ascending: false }),
    ]);
    if (prof) setProfileName((prof as any).name);
    setPermissions((perms || []) as any);
    setInvitations((invs || []) as any);
  };

  useEffect(() => { load(); }, [profileId]);

  const revoke = async (perm: Permission) => {
    if (!confirm("Revoke this caregiver's access?")) return;
    const { error } = await supabase.from("caregiver_permissions").delete().eq("id", perm.id);
    if (error) return toast.error(error.message);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("caregiver_audit_logs").insert({ actor_user_id: user?.id, profile_id: profileId, action: "Caregiver Removed", metadata: { caregiver_id: perm.caregiver_id } });
    await supabase.from("caregiver_notifications").insert({ caregiver_id: perm.caregiver_id, profile_id: profileId, type: "caregiver_removed", message: `Your access to ${profileName} was revoked.` });
    toast.success("Access revoked");
    load();
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { id, caregiver_id, ...rest } = editing;
    const { error } = await supabase.from("caregiver_permissions").update(rest).eq("id", id);
    if (error) return toast.error(error.message);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("caregiver_audit_logs").insert({ actor_user_id: user?.id, profile_id: profileId, action: "Permission Changed", metadata: { caregiver_id, permission_id: id } });
    await supabase.from("caregiver_notifications").insert({ caregiver_id, profile_id: profileId, type: "permission_changed", message: `Your permissions for ${profileName} changed.` });
    toast.success("Permissions updated");
    setEditing(null);
    load();
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied");
  };

  const resend = async (inv: Invitation) => {
    // extend expiry & keep token
    const newExpiry = new Date(Date.now() + 7 * 86400 * 1000).toISOString();
    const { error } = await supabase.from("caregiver_invitations").update({ expires_at: newExpiry, status: "Pending" }).eq("id", inv.id);
    if (error) return toast.error(error.message);
    copyLink(inv.invite_token);
    load();
  };

  const deleteInvite = async (inv: Invitation) => {
    if (!confirm("Delete this invitation?")) return;
    await supabase.from("caregiver_invitations").delete().eq("id", inv.id);
    load();
  };

  const methodIcon = (m: string) => m === "email" ? <Mail size={12} /> : m === "mobile" ? <Phone size={12} /> : <LinkIcon size={12} />;
  const statusColor = (s: string) => s === "Accepted" ? "bg-success/10 text-success" : s === "Pending" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground";

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-primary text-primary-foreground p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/10"><ArrowLeft size={18} /></button>
            <div>
              <h1 className="text-xl font-bold text-white">Caregivers</h1>
              <p className="text-white/70 text-xs">{profileName}</p>
            </div>
          </div>
          <button onClick={() => navigate(`/family/${profileId}/invite`)} className="flex items-center gap-1.5 bg-white/15 px-3 py-2 rounded-xl text-sm font-semibold">
            <Plus size={16} /> Invite
          </button>
        </div>
      </div>

      <div className="px-4 mt-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Active Caregivers</h2>
        {permissions.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No caregivers yet</p>}
        <div className="space-y-2">
          {permissions.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm font-mono truncate">{p.caregiver_id.slice(0, 8)}…</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.role}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {PERM_FIELDS.filter((f) => p[f.key]).slice(0, 4).map((f) => (
                      <span key={f.key} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{f.label}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => setEditing(p)} className="p-2 rounded-lg bg-muted text-xs">Edit</button>
                  <button onClick={() => revoke(p)} className="p-2 rounded-lg bg-destructive/10 text-destructive"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 mt-6">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Invitations</h2>
        {invitations.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No invitations sent</p>}
        <div className="space-y-2">
          {invitations.map((inv) => {
            const expired = new Date(inv.expires_at) < new Date() && inv.status === "Pending";
            const status = expired ? "Expired" : inv.status;
            return (
              <div key={inv.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(status)}`}>{status}</span>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">{methodIcon(inv.method)} {inv.method}</span>
                    </div>
                    <p className="text-sm text-foreground truncate">{inv.invitee_email || inv.invitee_phone || "Share link"}</p>
                    <p className="text-xs text-muted-foreground">{inv.role} · expires {new Date(inv.expires_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => copyLink(inv.invite_token)} className="p-2 rounded-lg bg-muted" title="Copy link"><Copy size={14} /></button>
                    {(inv.status === "Pending" || expired) && (
                      <button onClick={() => resend(inv)} className="p-2 rounded-lg bg-muted" title="Resend"><RefreshCw size={14} /></button>
                    )}
                    <button onClick={() => deleteInvite(inv)} className="p-2 rounded-lg bg-destructive/10 text-destructive"><X size={14} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-card w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Edit Permissions</h2>
              <button onClick={() => setEditing(null)}><X size={20} /></button>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase text-muted-foreground">Access</p>
              {PERM_FIELDS.map((f) => (
                <label key={f.key} className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm">{f.label}</span>
                  <input type="checkbox" checked={!!editing[f.key]} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.checked } as Permission)} className="h-4 w-4" />
                </label>
              ))}
              <p className="text-xs font-bold uppercase text-muted-foreground pt-3">Notifications</p>
              {NOTIFY_FIELDS.map((f) => (
                <label key={f.key} className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm">{f.label}</span>
                  <input type="checkbox" checked={!!editing[f.key]} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.checked } as Permission)} className="h-4 w-4" />
                </label>
              ))}
            </div>
            <button onClick={saveEdit} className="w-full mt-5 bg-primary text-primary-foreground rounded-xl py-3 font-bold">Save</button>
          </div>
        </div>
      )}
    </div>
  );
}
