import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Pill, RefreshCcw, Stethoscope, ChevronRight, ShieldCheck } from "lucide-react";

interface Attention {
  id: string;
  profile_id: string | null;
  category: string;
  severity: "info" | "warning" | "critical";
  message: string;
  created_at: string;
  action_url: string | null;
}

const SEV_RANK = { critical: 0, warning: 1, info: 2 } as const;
const ICONS: Record<string, any> = {
  missed_dose: AlertTriangle,
  refill: RefreshCcw,
  interaction: Pill,
  appointment: Stethoscope,
  monitoring: AlertTriangle,
  general: AlertTriangle,
};
const SEV_TONE: Record<string, string> = {
  critical: "bg-destructive/10 border-destructive/30 text-destructive",
  warning:  "bg-warning/10 border-warning/30 text-warning",
  info:     "bg-primary/10 border-primary/30 text-primary",
};

export default function WhoNeedsAttention() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Attention[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    // run refill scan opportunistically
    try { await supabase.rpc("scan_refills_for_owner"); } catch { /* ignore */ }
    const { data } = await supabase
      .from("caregiver_notifications")
      .select("id, profile_id, category, severity, message, created_at, action_url")
      .eq("caregiver_id", user.id).eq("is_read", false)
      .order("created_at", { ascending: false }).limit(20);
    const sorted = ((data || []) as Attention[]).sort(
      (a, b) => (SEV_RANK[a.severity] ?? 3) - (SEV_RANK[b.severity] ?? 3),
    );
    setItems(sorted.slice(0, 5));
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("attn-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "caregiver_notifications" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (loading) return null;

  return (
    <section className="px-4 mt-3">
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-warning" />
            <h2 className="text-sm font-semibold">Who Needs Attention</h2>
          </div>
          <button onClick={() => navigate("/notifications")} className="text-xs text-primary">
            View all
          </button>
        </div>
        {items.length === 0 ? (
          <div className="px-4 py-6 flex items-center gap-3 text-sm">
            <ShieldCheck size={18} className="text-success" />
            <div>
              <div className="font-medium text-foreground">Everyone is on track today</div>
              <div className="text-xs text-muted-foreground">No missed doses, refills or alerts.</div>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((a) => {
              const Icon = ICONS[a.category] || AlertTriangle;
              return (
                <button
                  key={a.id}
                  onClick={() => a.action_url ? navigate(a.action_url) : navigate("/notifications")}
                  className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/40"
                >
                  <div className={`p-2 rounded-lg border ${SEV_TONE[a.severity] || SEV_TONE.info}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground line-clamp-2">{a.message}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 uppercase">
                      {a.category.replace("_", " ")} · {a.severity}
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground mt-1" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
