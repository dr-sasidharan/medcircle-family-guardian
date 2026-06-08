import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Mail, Phone, Link as LinkIcon, Copy, Send } from "lucide-react";
import { toast } from "sonner";

const ROLES = ["Caregiver", "Family Manager"];

const DEFAULT_PERMS = {
  can_view_medicines: true, can_view_adherence: true, can_view_alerts: true,
  can_view_reports: false, can_view_appointments: false,
  can_add_medicines: false, can_edit_medicines: false,
  can_add_reports: false, can_manage_appointments: false,
  email_notifications: true, push_notifications: true, sms_notifications: false,
};

const PERM_FIELDS: { key: keyof typeof DEFAULT_PERMS; label: string }[] = [
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
const NOTIFY_FIELDS: { key: keyof typeof DEFAULT_PERMS; label: string }[] = [
  { key: "email_notifications", label: "Email" },
  { key: "push_notifications", label: "Push" },
  { key: "sms_notifications", label: "SMS" },
];

export default function InviteCaregiver() {
  const navigate = useNavigate();
  const { id: profileId } = useParams();
  const [profileName, setProfileName] = useState("");
  const [method, setMethod] = useState<"email" | "mobile" | "link">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Caregiver");
  const [perms, setPerms] = useState({ ...DEFAULT_PERMS });
  const [sending, setSending] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) return;
    supabase.from("family_profiles").select("name").eq("id", profileId).maybeSingle().then(({ data }) => {
      if (data) setProfileName((data as any).name);
    });
  }, [profileId]);

  const send = async () => {
    if (method === "email" && !email.trim()) { toast.error("Email required"); return; }
    if (method === "mobile" && !phone.trim()) { toast.error("Phone required"); return; }
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { data, error } = await supabase.from("caregiver_invitations").insert({
        profile_id: profileId,
        invited_by: user.id,
        invitee_email: method === "email" ? email.trim() : null,
        invitee_phone: method === "mobile" ? phone.trim() : null,
        method,
        role,
        permissions_template: perms,
      }).select("invite_token").single();
      if (error) throw error;

      await supabase.from("caregiver_audit_logs").insert({
        actor_user_id: user.id, profile_id: profileId, action: "Invitation Created",
        metadata: { method, role, invitee: email || phone || "link" },
      });

      const link = `${window.location.origin}/invite/${data!.invite_token}`;
      setGeneratedLink(link);
      navigator.clipboard.writeText(link).catch(() => {});
      toast.success("Invitation created — link copied");
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally { setSending(false); }
  };

  const ip = "w-full bg-muted border border-border rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-ring";
  const methodBtn = (m: "email" | "mobile" | "link", Icon: any, label: string) => (
    <button onClick={() => setMethod(m)} className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-colors ${method === m ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
      <Icon size={18} className={method === m ? "text-primary" : "text-muted-foreground"} />
      <span className={`text-xs font-semibold ${method === m ? "text-primary" : "text-foreground"}`}>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="bg-primary text-primary-foreground p-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/10"><ArrowLeft size={18} /></button>
          <div>
            <h1 className="text-xl font-bold text-white">Invite Caregiver</h1>
            <p className="text-white/70 text-xs">For {profileName}</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        <div>
          <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Method</p>
          <div className="flex gap-2">
            {methodBtn("email", Mail, "Email")}
            {methodBtn("mobile", Phone, "Mobile")}
            {methodBtn("link", LinkIcon, "Share Link")}
          </div>
        </div>

        {method === "email" && (
          <div>
            <label className="text-sm font-semibold mb-1 block">Email</label>
            <input className={ip} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="caregiver@email.com" />
          </div>
        )}
        {method === "mobile" && (
          <div>
            <label className="text-sm font-semibold mb-1 block">Phone</label>
            <input className={ip} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
          </div>
        )}

        <div>
          <label className="text-sm font-semibold mb-1 block">Role</label>
          <select className={ip} value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div>
          <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Permissions</p>
          <div className="bg-card border border-border rounded-2xl p-3 space-y-1">
            {PERM_FIELDS.map((f) => (
              <label key={f.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm">{f.label}</span>
                <input type="checkbox" checked={perms[f.key]} onChange={(e) => setPerms({ ...perms, [f.key]: e.target.checked })} className="h-4 w-4" />
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Notify caregiver via</p>
          <div className="bg-card border border-border rounded-2xl p-3 space-y-1">
            {NOTIFY_FIELDS.map((f) => (
              <label key={f.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm">{f.label}</span>
                <input type="checkbox" checked={perms[f.key]} onChange={(e) => setPerms({ ...perms, [f.key]: e.target.checked })} className="h-4 w-4" />
              </label>
            ))}
          </div>
        </div>

        {generatedLink ? (
          <div className="bg-success/5 border border-success/30 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-success">Invitation ready — share this link</p>
            <p className="text-xs font-mono break-all bg-card p-2 rounded-lg">{generatedLink}</p>
            <div className="flex gap-2">
              <button onClick={() => { navigator.clipboard.writeText(generatedLink); toast.success("Copied"); }} className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold">
                <Copy size={14} /> Copy Link
              </button>
              <button onClick={() => navigate(`/family/${profileId}/caregivers`)} className="flex-1 bg-card border border-border py-2.5 rounded-xl text-sm font-semibold">Done</button>
            </div>
          </div>
        ) : (
          <button onClick={send} disabled={sending} className="w-full bg-primary text-primary-foreground rounded-2xl py-4 font-bold flex items-center justify-center gap-2 disabled:opacity-60">
            <Send size={16} /> {sending ? "Creating…" : "Create Invitation"}
          </button>
        )}
      </div>
    </div>
  );
}
