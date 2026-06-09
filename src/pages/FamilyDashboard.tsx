import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import WhoNeedsAttention from "@/components/WhoNeedsAttention";
import { ArrowLeft, MessageSquare, Pill, RefreshCcw, AlertTriangle, CheckCircle2, Plus } from "lucide-react";

interface Row {
  profile_id: string; name: string; relationship: string | null; is_self: boolean;
  conditions: string[] | null;
  status: any; is_owner: boolean;
}

const STATUS_META: Record<string, { label: string; tone: string; Icon: any }> = {
  all_taken:     { label: "All taken",      tone: "text-success border-success/30 bg-success/5",         Icon: CheckCircle2 },
  on_track:      { label: "On track",       tone: "text-primary border-primary/30 bg-primary/5",         Icon: CheckCircle2 },
  missed_dose:   { label: "Missed dose",    tone: "text-warning border-warning/30 bg-warning/5",         Icon: AlertTriangle },
  refill_needed: { label: "Refill needed",  tone: "text-destructive border-destructive/30 bg-destructive/5", Icon: RefreshCcw },
  no_medicines:  { label: "No medicines",   tone: "text-muted-foreground border-border bg-muted/30",     Icon: Pill },
};

export default function FamilyDashboard() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.rpc("get_family_overview");
      setRows((data || []) as any);
      setLoading(false);
    };
    load();
    const ch = supabase.channel("fd-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "doses" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "family_profiles" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "medicines" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-white/10">
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-white/70 text-[11px]">Family Healthcare</p>
            <h1 className="text-base font-semibold">Command Center</h1>
          </div>
        </div>
        <button
          onClick={() => navigate("/family/ai")}
          className="px-3 py-1.5 rounded-lg bg-white/15 text-xs font-medium flex items-center gap-1.5"
        >
          <MessageSquare size={14} /> Ask AI
        </button>
      </header>

      <WhoNeedsAttention />

      <section className="px-4 mt-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Family Members</h2>
          <button onClick={() => navigate("/family/new")} className="text-xs text-primary flex items-center gap-1">
            <Plus size={12} /> Add
          </button>
        </div>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-2">
            {rows.map((m) => {
              const meta = STATUS_META[m.status?.status ?? "no_medicines"] ?? STATUS_META.no_medicines;
              const Icon = meta.Icon;
              const s = m.status || {};
              return (
                <div key={m.profile_id} className="bg-card border border-border rounded-2xl p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {m.relationship || (m.is_self ? "Self" : "Member")}
                      </div>
                      <div className="text-base font-semibold truncate">{m.name}</div>
                      {(m.conditions || []).length > 0 && (
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {(m.conditions || []).join(" · ")}
                        </div>
                      )}
                    </div>
                    <span className={`shrink-0 text-xs px-2 py-1 rounded-full border flex items-center gap-1 ${meta.tone}`}>
                      <Icon size={12} /> {meta.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                    <Stat label="Today" value={`${s.taken ?? 0}/${s.total ?? 0}`} />
                    <Stat label="Missed" value={`${s.missed ?? 0}`} />
                    <Stat label="Meds" value={`${s.meds_count ?? 0}`} />
                    <Stat label="Refill" value={`${s.low_refill_count ?? 0}`} />
                  </div>
                  {m.is_owner && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => navigate(`/family/${m.profile_id}/edit`)}
                        className="flex-1 text-xs py-1.5 rounded-lg border border-border bg-background"
                      >
                        Edit Profile
                      </button>
                      <button
                        onClick={() => navigate(`/family/${m.profile_id}/caregivers`)}
                        className="flex-1 text-xs py-1.5 rounded-lg border border-border bg-background"
                      >
                        Caregivers
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
      <BottomNav />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-lg py-1.5">
      <div className="text-sm font-semibold">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
    </div>
  );
}
