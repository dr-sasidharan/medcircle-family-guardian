import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, AlertTriangle, RefreshCcw, Pill, Stethoscope, CheckCheck, Bell } from "lucide-react";
import { toast } from "sonner";

interface Notif {
  id: string; profile_id: string | null; category: string; severity: "info" | "warning" | "critical";
  message: string; created_at: string; is_read: boolean; action_url: string | null;
}

const ICONS: Record<string, any> = {
  missed_dose: AlertTriangle, refill: RefreshCcw, interaction: Pill,
  appointment: Stethoscope, monitoring: AlertTriangle, general: Bell,
};
const SEV_TONE: Record<string, string> = {
  critical: "bg-destructive/10 border-destructive/30 text-destructive",
  warning:  "bg-warning/10 border-warning/30 text-warning",
  info:     "bg-primary/10 border-primary/30 text-primary",
};

export default function CaregiverNotifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase.from("caregiver_notifications")
      .select("id, profile_id, category, severity, message, created_at, is_read, action_url")
      .eq("caregiver_id", user.id)
      .order("created_at", { ascending: false }).limit(100);
    if (error) { toast.error("Failed to load notifications"); }
    setItems((data || []) as Notif[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("notif-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "caregiver_notifications" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const markRead = async (id: string) => {
    await supabase.from("caregiver_notifications").update({ is_read: true }).eq("id", id);
  };
  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    await supabase.from("caregiver_notifications").update({ is_read: true })
      .eq("caregiver_id", user.id).eq("is_read", false);
    toast.success("All marked as read");
  };

  const visible = filter === "unread" ? items.filter((i) => !i.is_read) : items;

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-white/10">
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-white/70 text-[11px]">Caregiver Alerts</p>
            <h1 className="text-base font-semibold">Notifications</h1>
          </div>
        </div>
        <button onClick={markAllRead} className="text-xs px-3 py-1.5 rounded-lg bg-white/15 flex items-center gap-1">
          <CheckCheck size={13} /> Mark all read
        </button>
      </header>

      <div className="px-4 mt-3 flex gap-2">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
            }`}
          >
            {f === "all" ? "All" : "Unread"}
          </button>
        ))}
      </div>

      <div className="px-4 mt-3 space-y-2">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center text-sm text-muted-foreground">
            No notifications.
          </div>
        ) : visible.map((n) => {
          const Icon = ICONS[n.category] || Bell;
          return (
            <button
              key={n.id}
              onClick={async () => {
                if (!n.is_read) await markRead(n.id);
                if (n.action_url) navigate(n.action_url);
              }}
              className={`w-full text-left bg-card border rounded-2xl p-3 flex items-start gap-3 ${
                n.is_read ? "border-border opacity-70" : "border-primary/30"
              }`}
            >
              <div className={`p-2 rounded-lg border ${SEV_TONE[n.severity] || SEV_TONE.info}`}>
                <Icon size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground">{n.message}</div>
                <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">
                  {n.category.replace("_", " ")} · {n.severity} · {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
              {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
            </button>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}
