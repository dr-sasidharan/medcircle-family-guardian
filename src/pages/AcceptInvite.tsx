import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface Invitation {
  id: string;
  profile_id: string;
  profile_name: string;
  inviter_email: string | null;
  role: string;
  status: string;
  expires_at: string;
  method: string;
  permissions_template: Record<string, boolean> | null;
}

const PERM_LABELS: Record<string, string> = {
  can_view_medicines: "View medicines",
  can_view_adherence: "View adherence",
  can_view_alerts: "View alerts",
  can_view_reports: "View reports",
  can_view_appointments: "View appointments",
  can_add_medicines: "Add medicines",
  can_edit_medicines: "Edit medicines",
  can_add_reports: "Add reports",
  can_manage_appointments: "Manage appointments",
};

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [inv, setInv] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("lookup_caregiver_invitation", { _token: token });
      if (error) toast.error(error.message);
      setInv(((data && (data as any)[0]) || null) as Invitation | null);
      setLoading(false);
    })();
  }, [token]);

  const accept = async () => {
    if (!authed) { navigate(`/auth?redirect=/invite/${token}`); return; }
    setActing(true);
    const { data, error } = await supabase.rpc("accept_caregiver_invitation", { _token: token! });
    setActing(false);
    if (error) return toast.error(error.message);
    const res = data as any;
    if (!res?.ok) return toast.error(res?.error || "Could not accept");
    toast.success("Invitation accepted");
    navigate("/family");
  };

  const decline = async () => {
    if (!confirm("Decline this invitation?")) return;
    setActing(true);
    const { data, error } = await supabase.rpc("decline_caregiver_invitation", { _token: token! });
    setActing(false);
    if (error) return toast.error(error.message);
    const res = data as any;
    if (!res?.ok) return toast.error(res?.error || "Failed");
    toast.success("Declined");
    navigate("/");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!inv) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center">
        <AlertTriangle className="mx-auto text-destructive mb-3" size={40} />
        <h1 className="text-xl font-bold">Invitation not found</h1>
        <p className="text-sm text-muted-foreground mt-1">This link is invalid or has been removed.</p>
      </div>
    </div>
  );

  const expired = inv.status === "Expired" || new Date(inv.expires_at) < new Date();
  const grantedPerms = Object.entries(inv.permissions_template || {}).filter(([k, v]) => v && PERM_LABELS[k]);

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center"><ShieldCheck className="text-primary" /></div>
          <div>
            <h1 className="text-lg font-bold">Caregiver Invitation</h1>
            <p className="text-xs text-muted-foreground">Review and respond</p>
          </div>
        </div>

        {expired ? (
          <div className="bg-destructive/5 border border-destructive/30 rounded-xl p-4 text-center">
            <AlertTriangle className="mx-auto text-destructive mb-2" size={28} />
            <p className="font-bold text-destructive">Invitation Expired</p>
            <p className="text-xs text-muted-foreground mt-1">Please ask the sender to resend.</p>
          </div>
        ) : inv.status === "Accepted" ? (
          <div className="bg-success/5 border border-success/30 rounded-xl p-4 text-center">
            <Check className="mx-auto text-success mb-2" size={28} />
            <p className="font-bold text-success">Already Accepted</p>
            <button onClick={() => navigate("/family")} className="mt-3 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold">Open Family</button>
          </div>
        ) : inv.status === "Declined" ? (
          <p className="text-center text-muted-foreground py-6">This invitation was declined.</p>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              <Row label="From" value={inv.inviter_email || "Someone"} />
              <Row label="Profile shared" value={inv.profile_name} />
              <Row label="Role" value={inv.role} />
              <Row label="Expires" value={new Date(inv.expires_at).toLocaleString()} />
            </div>

            {grantedPerms.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-bold uppercase text-muted-foreground mb-2">You'll be able to</p>
                <div className="flex flex-wrap gap-1.5">
                  {grantedPerms.map(([k]) => (
                    <span key={k} className="text-[11px] bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">{PERM_LABELS[k]}</span>
                  ))}
                </div>
              </div>
            )}

            {!authed && (
              <div className="mb-3 text-xs bg-warning/5 border border-warning/30 rounded-xl p-3 text-warning">
                Sign in or create an account to accept this invitation.
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={decline} disabled={acting} className="flex-1 bg-muted text-foreground rounded-xl py-3 font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60">
                <X size={16} /> Decline
              </button>
              <button onClick={accept} disabled={acting} className="flex-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60">
                <Check size={16} /> {authed ? "Accept" : "Sign in & Accept"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-semibold text-foreground text-right truncate ml-3">{value}</span>
  </div>
);
