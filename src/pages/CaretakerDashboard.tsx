import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";
import { ArrowLeft, Check, X, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface DoseWithMedicine {
  id: string;
  taken: boolean;
  missed: boolean;
  scheduled_time: string;
  medicine: { name: string; dosage: string };
}

const CaretakerDashboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [doses, setDoses] = useState<DoseWithMedicine[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDoses = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("doses")
      .select("id, taken, missed, scheduled_time, medicines(name, dosage)")
      .eq("scheduled_date", today)
      .order("scheduled_time");

    if (error) { console.error(error); return; }

    setDoses((data || []).map((d: any) => ({
      id: d.id,
      taken: d.taken,
      missed: d.missed,
      scheduled_time: d.scheduled_time,
      medicine: d.medicines,
    })));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDoses();
    const channel = supabase
      .channel("caretaker-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "doses" }, () => fetchDoses())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchDoses]);

  const takenCount = doses.filter((d) => d.taken).length;
  const adherence = doses.length > 0 ? Math.round((takenCount / doses.length) * 100) : 0;
  const missedDoses = doses.filter((d) => d.missed && !d.taken);

  const getColor = (pct: number) =>
    pct >= 80 ? "hsl(var(--success))" : pct >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))";

  const ringColor = adherence >= 80 ? "text-success" : adherence >= 50 ? "text-warning" : "text-destructive";
  const ringStroke = adherence >= 80 ? "stroke-success" : adherence >= 50 ? "stroke-warning" : "stroke-destructive";

  // Mock weekly data (would come from DB in production)
  const weeklyData = [
    { day: "Mon", pct: 100 }, { day: "Tue", pct: 83 }, { day: "Wed", pct: 67 },
    { day: "Thu", pct: 100 }, { day: "Fri", pct: 50 }, { day: "Sat", pct: 83 },
    { day: "Sun", pct: adherence },
  ];

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={() => navigate("/")} className="text-foreground p-1"><ArrowLeft size={24} /></button>
        <h1 className="text-lg font-bold text-foreground">{t("dashboard")}</h1>
        <LanguageToggle />
      </div>

      {/* Missed Alert */}
      {missedDoses.length > 0 && (
        <div className="mx-4 mt-4 bg-destructive/10 border border-destructive/30 rounded-2xl p-4 flex items-start gap-3 pulse-alert">
          <AlertTriangle className="text-destructive flex-shrink-0 mt-0.5" size={24} />
          <div>
            <h3 className="text-destructive font-bold text-sm">{t("missed_alert")}</h3>
            {missedDoses.map((d) => (
              <p key={d.id} className="text-destructive text-sm">{d.medicine.name} {d.medicine.dosage} ({d.scheduled_time})</p>
            ))}
          </div>
        </div>
      )}

      {/* Patient Info + Adherence Circle */}
      <div className="flex flex-col items-center mt-6 px-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-2xl font-bold text-secondary-foreground mb-2">R</div>
        <h2 className="text-xl font-bold text-foreground">Rajesh Kumar</h2>
        <p className="text-muted-foreground text-sm mb-4">Father · Age 62</p>

        <div className="relative w-36 h-36 mb-2">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
            <circle cx="60" cy="60" r="50" fill="none" className={ringStroke} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${adherence * 3.14} ${314 - adherence * 3.14}`} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-extrabold ${ringColor}`}>{adherence}%</span>
            <span className="text-xs text-muted-foreground">{t("adherence")}</span>
          </div>
        </div>
      </div>

      {/* Medicine Status - Realtime */}
      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <div className="px-4 mt-6 space-y-2">
          {doses.map((d) => (
            <div key={d.id} className="flex items-center justify-between bg-card rounded-xl p-3.5 border border-border">
              <div>
                <span className="text-sm font-semibold text-foreground">{d.medicine.name} {d.medicine.dosage}</span>
                <span className="text-xs text-muted-foreground ml-2">({d.scheduled_time})</span>
              </div>
              {d.taken ? (
                <span className="w-8 h-8 rounded-full bg-success/15 flex items-center justify-center"><Check size={18} className="text-success" /></span>
              ) : (
                <span className="w-8 h-8 rounded-full bg-destructive/15 flex items-center justify-center"><X size={18} className="text-destructive" /></span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Weekly Chart */}
      <div className="px-4 mt-8">
        <h3 className="text-base font-bold text-foreground mb-4">{t("weekly_adherence")}</h3>
        <div className="bg-card rounded-2xl border border-border p-4 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 100]} />
              <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
                {weeklyData.map((entry, index) => (
                  <Cell key={index} fill={getColor(entry.pct)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-6 px-8">
        🔄 This dashboard updates in real-time as the patient takes their medicines
      </p>
    </div>
  );
};

export default CaretakerDashboard;
