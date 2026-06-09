import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle2, Pill, Users, ChevronRight, Bell } from "lucide-react";

interface MemberRow {
  profile_id: string;
  name: string;
  relationship: string | null;
  is_self: boolean;
  conditions: string[] | null;
  status: {
    profile_id: string; total: number; taken: number; missed: number;
    low_refill_count: number; meds_count: number; status: string;
  } | null;
  is_owner: boolean;
}

const STATUS_META: Record<string, { label: string; tone: string; Icon: any }> = {
  all_taken:     { label: "All Medicines Taken",  tone: "text-success bg-success/10 border-success/30",       Icon: CheckCircle2 },
  on_track:      { label: "On Track",             tone: "text-primary bg-primary/10 border-primary/30",       Icon: CheckCircle2 },
  missed_dose:   { label: "Missed Dose",          tone: "text-warning bg-warning/10 border-warning/30",       Icon: AlertTriangle },
  refill_needed: { label: "Refill Needed",        tone: "text-destructive bg-destructive/10 border-destructive/30", Icon: AlertTriangle },
  no_medicines:  { label: "No Medicines",         tone: "text-muted-foreground bg-muted border-border",       Icon: Pill },
};

export default function FamilyOverviewCard() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase.rpc("get_family_overview");
    if (!error) setRows((data || []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("family-overview-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "doses" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "family_profiles" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (loading || rows.length <= 1) return null; // hide if only Self

  return (
    <section className="px-4 mt-3">
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => navigate("/family/dashboard")}
          className="w-full flex items-center justify-between px-4 py-3 border-b border-border"
        >
          <div className="flex items-center gap-2">
            <Users size={16} className="text-primary" />
            <h2 className="text-sm font-semibold">Family Overview</h2>
            <span className="text-[11px] text-muted-foreground">({rows.length} members)</span>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>
        <div className="grid grid-cols-2 gap-2 p-3">
          {rows.slice(0, 4).map((m) => {
            const meta = STATUS_META[m.status?.status ?? "no_medicines"] ?? STATUS_META.no_medicines;
            const Icon = meta.Icon;
            return (
              <button
                key={m.profile_id}
                onClick={() => navigate(`/family/${m.profile_id}/edit`)}
                className={`text-left rounded-xl border p-3 ${meta.tone}`}
              >
                <div className="text-[11px] uppercase tracking-wide opacity-70">
                  {m.relationship || (m.is_self ? "Self" : "Member")}
                </div>
                <div className="text-sm font-semibold truncate">{m.name}</div>
                <div className="flex items-center gap-1 mt-1 text-xs">
                  <Icon size={12} /> <span className="truncate">{meta.label}</span>
                </div>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => navigate("/family/ai")}
          className="w-full flex items-center justify-center gap-2 py-2.5 border-t border-border text-xs font-medium text-primary hover:bg-primary/5"
        >
          <Bell size={13} /> Ask the Family AI Companion
        </button>
      </div>
    </section>
  );
}
