import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useElderlyMode } from "@/contexts/ElderlyModeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import LanguageToggle from "@/components/LanguageToggle";
import BottomNav from "@/components/BottomNav";
import EmergencyInfoButton from "@/components/EmergencyInfoButton";
import RefillBanner from "@/components/RefillBanner";
import DailyInsights from "@/components/DailyInsights";
import { supabase } from "@/integrations/supabase/client";
import {
  Check, ScanLine, HelpCircle, FlaskConical, Pill, Settings, AlertTriangle, Bell,
  Stethoscope, Undo2, X, Download, Clock, Flame, TrendingUp, ShieldCheck, ChevronRight, Info,
} from "lucide-react";
import { toast } from "sonner";
import { useNotificationReminders } from "@/hooks/useNotificationReminders";

interface Medicine {
  id: string;
  name: string;
  dosage: string;
  timing: string;
  food_instruction: string;
}

interface MissedDose {
  id: string;
  medicine_name: string;
  scheduled_time: string;
}

const TIMING_HOURS: Record<string, number> = { morning: 8, afternoon: 14, night: 21 };
const TIMING_LABEL: Record<string, string> = { morning: "Morning", afternoon: "Afternoon", night: "Evening" };
const TIMING_EMOJI: Record<string, string> = { morning: "☀️", afternoon: "🌤️", night: "🌙" };

// Lightweight rule-based alerts derived from medicine names / food instructions
const buildAiAlerts = (medicines: Medicine[], missedCount: number) => {
  const alerts: { severity: "critical" | "moderate" | "info" | "good"; text: string }[] = [];
  const lc = medicines.map((m) => m.name.toLowerCase());

  if (lc.some((n) => n.includes("metrogyl") || n.includes("metronidazole") || n.includes("tinidazole"))) {
    alerts.push({ severity: "critical", text: "Avoid alcohol while taking Metronidazole — can cause severe reaction." });
  }
  if (lc.some((n) => n.includes("aceclofenac") || n.includes("ibuprofen") || n.includes("diclofenac") || n.includes("naproxen"))) {
    alerts.push({ severity: "moderate", text: "Take pain relievers after food to avoid stomach irritation." });
  }
  if (lc.some((n) => n.includes("warfarin")) && lc.some((n) => n.includes("aspirin"))) {
    alerts.push({ severity: "critical", text: "Warfarin + Aspirin together — high bleeding risk. Confirm with your doctor." });
  }
  if (lc.some((n) => n.includes("metformin"))) {
    alerts.push({ severity: "info", text: "Take Metformin with meals to reduce nausea." });
  }
  if (missedCount > 0) {
    alerts.push({ severity: "moderate", text: `${missedCount} dose${missedCount > 1 ? "s" : ""} missed today — please catch up if safe.` });
  }
  if (alerts.length === 0) {
    alerts.push({ severity: "good", text: "No significant interactions or warnings detected today." });
  }
  return alerts.slice(0, 4);
};

const severityStyle = (s: string) => {
  switch (s) {
    case "critical": return { bg: "bg-destructive/10", border: "border-destructive/30", icon: "text-destructive", Icon: AlertTriangle };
    case "moderate": return { bg: "bg-warning/10", border: "border-warning/30", icon: "text-warning", Icon: AlertTriangle };
    case "good":     return { bg: "bg-success/10", border: "border-success/30", icon: "text-success", Icon: ShieldCheck };
    default:         return { bg: "bg-primary/10", border: "border-primary/30", icon: "text-primary", Icon: Info };
  }
};

const PatientDashboard = () => {
  const { t } = useLanguage();
  const { elderlyMode } = useElderlyMode();
  const navigate = useNavigate();
  const { canInstall, install } = useInstallPrompt();
  const [dismissedInstall, setDismissedInstall] = useState(false);
  useNotificationReminders();

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [takenIds, setTakenIds] = useState<Set<string>>(new Set());
  const [missedDoses, setMissedDoses] = useState<MissedDose[]>([]);
  const [patientName, setPatientName] = useState("Patient");
  const [weekly, setWeekly] = useState<{ day: string; pct: number }[]>([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profiles } = await supabase.from("patient_profiles").select("name").eq("user_id", user.id).limit(1);
      if (profiles?.length) setPatientName(profiles[0].name);

      const { data } = await supabase.from("medicines").select("id, name, dosage, timing, food_instruction").eq("is_active", true).eq("user_id", user.id);
      const medsList = (data || []) as Medicine[];
      setMedicines(medsList);

      const today = new Date().toISOString().split("T")[0];
      const { data: takenDoses } = await supabase.from("doses").select("medicine_id, scheduled_time").eq("scheduled_date", today).eq("taken", true);
      setTakenIds(new Set((takenDoses || []).map((d: any) => `${d.medicine_id}:${d.scheduled_time}`)));

      // mark missed
      const now = new Date();
      const currentHour = now.getHours();
      const GRACE_MINUTES = 30;
      for (const med of medsList) {
        const timings = med.timing.split(",");
        for (const timingSlot of timings) {
          const targetHour = TIMING_HOURS[timingSlot];
          if (targetHour === undefined) continue;
          const totalNow = currentHour * 60 + now.getMinutes();
          const targetMin = targetHour * 60 + GRACE_MINUTES;
          if (totalNow < targetMin) continue;
          const { data: existing } = await supabase.from("doses")
            .select("id, taken, missed")
            .eq("medicine_id", med.id).eq("scheduled_date", today).eq("scheduled_time", timingSlot).maybeSingle();
          if (existing?.taken || existing?.missed) continue;
          if (existing) await supabase.from("doses").update({ missed: true }).eq("id", existing.id);
          else await supabase.from("doses").insert({ medicine_id: med.id, user_id: user.id, scheduled_date: today, scheduled_time: timingSlot, taken: false, missed: true });
        }
      }

      const { data: missed } = await supabase.from("doses").select("id, scheduled_time, medicines(name)")
        .eq("scheduled_date", today).eq("missed", true).eq("taken", false);
      const missedList = (missed || []).map((d: any) => ({ id: d.id, medicine_name: d.medicines?.name || "Unknown", scheduled_time: d.scheduled_time }));
      setMissedDoses(missedList);

      // 7-day adherence
      const days: { day: string; pct: number; date: string }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const iso = d.toISOString().split("T")[0];
        const label = d.toLocaleDateString("en-IN", { weekday: "short" });
        days.push({ day: label, pct: 0, date: iso });
      }
      const totalSlots = medsList.reduce((s, m) => s + m.timing.split(",").length, 0);
      if (totalSlots > 0) {
        const { data: weekDoses } = await supabase.from("doses")
          .select("scheduled_date, taken")
          .gte("scheduled_date", days[0].date).lte("scheduled_date", days[6].date)
          .eq("user_id", user.id);
        const byDay: Record<string, number> = {};
        (weekDoses || []).forEach((d: any) => { if (d.taken) byDay[d.scheduled_date] = (byDay[d.scheduled_date] || 0) + 1; });
        days.forEach((d) => { d.pct = Math.min(100, Math.round(((byDay[d.date] || 0) / totalSlots) * 100)); });
      }
      setWeekly(days.map(({ day, pct }) => ({ day, pct })));

      // streak = consecutive days (ending yesterday or today) with >= 80% adherence
      let s = 0;
      for (let i = days.length - 1; i >= 0; i--) {
        if (days[i].pct >= 80) s++; else break;
      }
      setStreak(s);

      setLoading(false);
    };

    fetchData();
    const channel = supabase.channel("dashboard-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "doses" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "medicines" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleMarkTaken = async (medicineId: string, timing: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
      const today = new Date().toISOString().split("T")[0];
      const med = medicines.find((m) => m.id === medicineId);
      const { data: existing } = await supabase.from("doses").select("id")
        .eq("medicine_id", medicineId).eq("scheduled_date", today).eq("scheduled_time", timing).maybeSingle();
      if (existing) await supabase.from("doses").update({ taken: true, missed: false, taken_at: new Date().toISOString() }).eq("id", existing.id);
      else await supabase.from("doses").insert({ medicine_id: medicineId, user_id: user.id, scheduled_date: today, scheduled_time: timing, taken: true, missed: false, taken_at: new Date().toISOString() });
      setTakenIds((prev) => new Set([...prev, `${medicineId}:${timing}`]));
      setMissedDoses((prev) => prev.filter((d) => !(d.medicine_name === med?.name && d.scheduled_time === timing)));
      toast.success(`${med?.name} marked as taken`, {
        action: { label: "Undo", onClick: () => handleUndoTaken(medicineId, timing) },
        duration: 4000,
      });
    } catch { toast.error("Failed to mark as taken"); }
  };

  const handleUndoTaken = async (medicineId: string, timing: string) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      await supabase.from("doses").update({ taken: false, taken_at: null })
        .eq("medicine_id", medicineId).eq("scheduled_date", today).eq("scheduled_time", timing);
      setTakenIds((prev) => { const n = new Set(prev); n.delete(`${medicineId}:${timing}`); return n; });
      toast.success("Undo successful");
    } catch { toast.error("Failed to undo"); }
  };

  // Derived metrics
  const totalCount = medicines.reduce((sum, m) => sum + m.timing.split(",").length, 0);
  const takenCount = takenIds.size;
  const missedCount = missedDoses.length;
  const pendingCount = Math.max(0, totalCount - takenCount - missedCount);
  const progressPercent = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  // Build all today's slots
  const todaySlots = useMemo(() => {
    const slots: { med: Medicine; timing: string; status: "taken" | "missed" | "pending"; hour: number }[] = [];
    medicines.forEach((med) => {
      med.timing.split(",").forEach((tm) => {
        const key = `${med.id}:${tm}`;
        const status: "taken" | "missed" | "pending" =
          takenIds.has(key) ? "taken"
          : missedDoses.some((d) => d.medicine_name === med.name && d.scheduled_time === tm) ? "missed"
          : "pending";
        slots.push({ med, timing: tm, status, hour: TIMING_HOURS[tm] ?? 12 });
      });
    });
    return slots.sort((a, b) => a.hour - b.hour);
  }, [medicines, takenIds, missedDoses]);

  // Next due dose
  const nextDose = useMemo(() => {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const pending = todaySlots.filter((s) => s.status === "pending");
    // prefer future; otherwise earliest pending past
    const future = pending.filter((s) => s.hour * 60 >= nowMin - 30);
    return (future[0] ?? pending[0]) ?? null;
  }, [todaySlots]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const aiAlerts = useMemo(() => buildAiAlerts(medicines, missedCount), [medicines, missedCount]);

  // Elderly simplified home (unchanged)
  if (elderlyMode) {
    return (
      <div className="min-h-screen bg-background pb-24 page-transition">
        <div className="bg-primary text-primary-foreground p-6">
          <h1 className="text-2xl font-bold">{t("good_morning")}</h1>
          <p className="text-primary-foreground/70 mt-1">{takenCount} {t("of")} {totalCount} {t("medicines_taken_label")}</p>
          <div className="w-full h-4 bg-primary-foreground/20 rounded-full overflow-hidden mt-3">
            <div className="h-full rounded-full bg-primary-foreground animate-progress-fill"
              style={{ "--progress-width": `${progressPercent}%`, width: `${progressPercent}%` } as React.CSSProperties} />
          </div>
        </div>
        {missedDoses.length > 0 && (
          <div className="px-4 mt-4 space-y-2">
            {missedDoses.map((d) => (
              <div key={d.id} className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 flex items-center gap-3 pulse-alert">
                <AlertTriangle className="text-destructive flex-shrink-0" size={24} />
                <span className="text-foreground font-bold text-base">{t("missed_label")}: {d.medicine_name} ({d.scheduled_time})</span>
              </div>
            ))}
          </div>
        )}
        <RefillBanner />
        <div className="px-4 mt-8 grid grid-cols-2 gap-4">
          <button onClick={() => navigate("/reminders")} className="bg-card border-2 border-primary/30 rounded-2xl p-8 flex flex-col items-center gap-4 min-h-[140px] shadow-sm">
            <Pill size={40} className="text-primary" /><span className="text-lg font-bold text-foreground">{t("medicines")}</span>
          </button>
          <button onClick={() => navigate("/scan")} className="bg-card border-2 border-primary/30 rounded-2xl p-8 flex flex-col items-center gap-4 min-h-[140px] shadow-sm">
            <ScanLine size={40} className="text-primary" /><span className="text-lg font-bold text-foreground">{t("scan")}</span>
          </button>
        </div>
        <EmergencyInfoButton />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-24 page-transition font-sans">
      {/* === Compact Header === */}
      <header className="bg-primary text-primary-foreground px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 flex items-center justify-center text-sm font-semibold bg-white/15 rounded-xl text-white">
              {patientName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-white/70 text-[11px] leading-tight">{new Date().toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" })}</p>
              <h1 className="text-base font-semibold text-white leading-tight truncate">{greeting()}, {patientName}</h1>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => navigate("/notifications")} className="p-2 rounded-lg hover:bg-white/10"><Bell size={16} className="text-white" /></button>
            <button onClick={() => navigate("/settings")} className="p-2 rounded-lg hover:bg-white/10"><Settings size={16} className="text-white" /></button>
            <LanguageToggle />
          </div>
        </div>
      </header>

      {/* === SECTION 1: Next Action === */}
      <section className="px-4 -mt-2">
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          {nextDose ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-medium text-muted-foreground">Next Medicine Due</span>
                <span className="flex items-center gap-1 text-[11px] font-medium text-primary">
                  <Clock size={12} /> {TIMING_LABEL[nextDose.timing]} • {String(nextDose.hour).padStart(2, "0")}:00
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">{TIMING_EMOJI[nextDose.timing]}</div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-foreground truncate">{nextDose.med.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {nextDose.med.dosage} • {nextDose.med.food_instruction.replace("_", " ")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => handleMarkTaken(nextDose.med.id, nextDose.timing)}
                  className="flex-1 bg-primary text-primary-foreground rounded-xl py-3 text-sm font-medium hover:opacity-95 transition-opacity">
                  Take Now
                </button>
                <button onClick={() => navigate(`/medicine-detail/${nextDose.med.id}`)}
                  className="px-4 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                  Details
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center">
                <Check size={22} className="text-success" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">All caught up</h2>
                <p className="text-sm text-muted-foreground">No medicines due right now.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* === SECTION 2: AI Health Alerts === */}
      <section className="px-4 mt-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">AI Health Alerts</h3>
        <div className="space-y-2">
          {aiAlerts.map((a, i) => {
            const s = severityStyle(a.severity);
            return (
              <div key={i} className={`${s.bg} ${s.border} border rounded-xl px-3 py-2.5 flex items-start gap-2.5`}>
                <s.Icon size={16} className={`${s.icon} mt-0.5 flex-shrink-0`} />
                <p className="text-[13px] text-foreground leading-snug">{a.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <RefillBanner />

      {canInstall && !dismissedInstall && (
        <div className="mx-4 mt-4 bg-card border border-border rounded-xl p-3 flex items-center gap-3 shadow-sm">
          <Download size={18} className="text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-foreground">Install MedCircle</p>
            <p className="text-xs text-muted-foreground">Add to home screen for quick access</p>
          </div>
          <button onClick={install} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground">Install</button>
          <button onClick={() => setDismissedInstall(true)} className="p-1 text-muted-foreground"><X size={14} /></button>
        </div>
      )}

      {/* === SECTION 3: Today's Summary === */}
      <section className="px-4 mt-5">
        <h3 className="text-sm font-semibold text-foreground mb-2">Today's Summary</h3>
        <div className="grid grid-cols-5 gap-2">
          <Stat icon={<Check size={14} className="text-success" />} value={takenCount} label="Taken" />
          <Stat icon={<Clock size={14} className="text-warning" />} value={pendingCount} label="Pending" />
          <Stat icon={<AlertTriangle size={14} className="text-destructive" />} value={missedCount} label="Missed" />
          <Stat icon={<Flame size={14} className="text-orange-500" />} value={streak} label="Streak" />
          <Stat icon={<Pill size={14} className="text-primary" />} value={medicines.length} label="Total" />
        </div>
      </section>

      {/* === SECTION 4: Adherence Analytics === */}
      <section className="px-4 mt-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">Adherence Analytics</h3>
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><TrendingUp size={12} /> 7-day</span>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <p className="text-[11px] text-muted-foreground">Adherence Score</p>
              <p className="text-3xl font-bold text-foreground leading-tight">{progressPercent}<span className="text-base text-muted-foreground font-normal">%</span></p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">Today</p>
              <p className="text-sm font-medium text-foreground">{takenCount}/{totalCount} doses</p>
            </div>
          </div>
          <div className="flex items-end gap-1.5 h-20">
            {weekly.map((d, i) => {
              const color = d.pct >= 80 ? "bg-success" : d.pct >= 50 ? "bg-warning" : d.pct > 0 ? "bg-destructive" : "bg-muted";
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex-1 flex items-end">
                    <div className={`w-full rounded-md ${color} transition-all`} style={{ height: `${Math.max(8, d.pct)}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* === SECTION 5: Medication Timeline === */}
      <section className="px-4 mt-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">Today's Timeline</h3>
          <button onClick={() => navigate("/reminders")} className="flex items-center gap-0.5 text-xs text-primary font-medium">
            All <ChevronRight size={12} />
          </button>
        </div>

        {!loading && medicines.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Pill size={28} className="text-primary" />
            </div>
            <h4 className="text-base font-semibold text-foreground">No medicines yet</h4>
            <p className="text-xs text-muted-foreground mt-1">Add your first medicine to start tracking</p>
            <button onClick={() => navigate("/add-medicine")} className="mt-4 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium">
              Add Medicine
            </button>
          </div>
        )}

        {medicines.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-3 shadow-sm">
            {["morning", "afternoon", "night"].map((slot) => {
              const slotItems = todaySlots.filter((s) => s.timing === slot);
              if (slotItems.length === 0) return null;
              return (
                <div key={slot} className="py-2 first:pt-0 last:pb-0 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border/60">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm">{TIMING_EMOJI[slot]}</span>
                    <span className="text-[11px] font-semibold text-muted-foreground">{TIMING_LABEL[slot]}</span>
                    <span className="text-[11px] text-muted-foreground">• {String(TIMING_HOURS[slot]).padStart(2, "0")}:00</span>
                  </div>
                  <div className="space-y-1.5">
                    {slotItems.map(({ med, status }, idx) => (
                      <div key={`${med.id}-${slot}`}
                        onClick={() => navigate(`/medicine-detail/${med.id}`)}
                        className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/60 cursor-pointer transition-colors">
                        <span className="text-base">💊</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate leading-tight">{med.name}</p>
                          <p className="text-[11px] text-muted-foreground leading-tight">
                            {med.dosage} • {med.food_instruction.replace("_", " ")}
                          </p>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <StatusPill status={status} onTake={() => handleMarkTaken(med.id, slot)} onUndo={() => handleUndoTaken(med.id, slot)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <DailyInsights />

      {/* Quick Actions */}
      <section className="px-4 mt-5 grid grid-cols-3 gap-2">
        <QuickAction icon={<ScanLine size={18} />} label="Scan Rx" onClick={() => navigate("/scan")} />
        <QuickAction icon={<HelpCircle size={18} />} label="ID Tablet" onClick={() => navigate("/scan-tablet?mode=identify")} />
        <QuickAction icon={<FlaskConical size={18} className="text-warning" />} label="Interactions" onClick={() => navigate("/drug-interaction")} />
      </section>

      <EmergencyInfoButton />
      <BottomNav />
    </div>
  );
};

const Stat = ({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) => (
  <div className="bg-card border border-border rounded-xl p-2.5 shadow-sm flex flex-col items-center gap-0.5">
    <div className="flex items-center gap-1">{icon}<span className="text-base font-bold text-foreground leading-none">{value}</span></div>
    <span className="text-[10px] text-muted-foreground">{label}</span>
  </div>
);

const StatusPill = ({ status, onTake, onUndo }: { status: "taken" | "missed" | "pending"; onTake: () => void; onUndo: () => void }) => {
  if (status === "taken") {
    return (
      <div className="flex items-center gap-1">
        <span className="px-2 py-1 rounded-md text-[11px] font-medium bg-success/15 text-success flex items-center gap-1"><Check size={11} /> Taken</span>
        <button onClick={onUndo} className="p-1 text-muted-foreground hover:text-foreground" title="Undo"><Undo2 size={12} /></button>
      </div>
    );
  }
  if (status === "missed") {
    return (
      <button onClick={onTake} className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-destructive/15 text-destructive hover:bg-destructive/20 transition-colors">
        Take Now
      </button>
    );
  }
  return (
    <button onClick={onTake} className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-colors">
      Mark Taken
    </button>
  );
};

const QuickAction = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
  <button onClick={onClick} className="bg-card border border-border rounded-xl p-3 flex flex-col items-center gap-1.5 hover:bg-muted/60 transition-colors shadow-sm">
    <span className="text-primary">{icon}</span>
    <span className="text-[11px] font-medium text-foreground">{label}</span>
  </button>
);

export default PatientDashboard;
