import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useElderlyMode } from "@/contexts/ElderlyModeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import LanguageToggle from "@/components/LanguageToggle";
import BottomNav from "@/components/BottomNav";
import EmergencyInfoButton from "@/components/EmergencyInfoButton";
import RefillBanner from "@/components/RefillBanner";
import DailyInsights from "@/components/DailyInsights";
import WhatsAppPreview from "@/components/WhatsAppPreview";
import { supabase } from "@/integrations/supabase/client";
import { Check, ScanLine, HelpCircle, FlaskConical, Pill, Settings, AlertTriangle, Bell, Stethoscope, Undo2, X, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
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

const MEDICINE_ICONS = ["💊", "🩹", "💉", "🧬", "🫀", "🧪"];

const getFoodLabels = (t: (key: string) => string): Record<string, string> => ({
  before_food: t("before_food"),
  after_food: t("after_food"),
  with_food: t("with_food"),
});

const sectionConfig = (t: (key: string) => string) => ({
  morning: { emoji: "☀️", label: t("morning"), color: "hsl(var(--warning))" },
  afternoon: { emoji: "🌤️", label: t("afternoon"), color: "hsl(var(--blue, 217 91% 60%))" },
  night: { emoji: "🌙", label: t("night"), color: "hsl(var(--violet, 258 90% 66%))" },
});

const PatientDashboard = () => {
  const { t } = useLanguage();
  const { elderlyMode } = useElderlyMode();
  const navigate = useNavigate();
  const { canInstall, install } = useInstallPrompt();
  const [dismissedInstall, setDismissedInstall] = useState(false);
  const FOOD_LABELS = getFoodLabels(t);
  useNotificationReminders();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [takenIds, setTakenIds] = useState<Set<string>>(new Set());
  const [missedDoses, setMissedDoses] = useState<MissedDose[]>([]);
  const [patientName, setPatientName] = useState("Patient");

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

      const now = new Date();
      const currentHour = now.getHours();
      const TIMING_HOURS: Record<string, number> = { morning: 8, afternoon: 14, night: 21 };
      const GRACE_MINUTES = 30;

      for (const med of medsList) {
        const timings = med.timing.split(",");
        for (const timingSlot of timings) {
          const targetHour = TIMING_HOURS[timingSlot];
          if (targetHour === undefined) continue;
          const totalNow = currentHour * 60 + now.getMinutes();
          const targetMin = targetHour * 60 + GRACE_MINUTES;
          if (totalNow < targetMin) continue;

          const { data: existing } = await supabase
            .from("doses")
            .select("id, taken, missed")
            .eq("medicine_id", med.id)
            .eq("scheduled_date", today)
            .eq("scheduled_time", timingSlot)
            .maybeSingle();

          if (existing?.taken || existing?.missed) continue;

          if (existing) {
            await supabase.from("doses").update({ missed: true }).eq("id", existing.id);
          } else {
            await supabase.from("doses").insert({
              medicine_id: med.id,
              user_id: user.id,
              scheduled_date: today,
              scheduled_time: timingSlot,
              taken: false,
              missed: true,
            });
          }
        }
      }

      const { data: missed } = await supabase
        .from("doses")
        .select("id, scheduled_time, medicines(name)")
        .eq("scheduled_date", today)
        .eq("missed", true)
        .eq("taken", false);

      const missedList = (missed || []).map((d: any) => ({
        id: d.id,
        medicine_name: d.medicines?.name || "Unknown",
        scheduled_time: d.scheduled_time,
      }));
      setMissedDoses(missedList);

      for (const missed of missedList) {
        supabase.functions.invoke("caretaker-alert", {
          body: {
            type: "missed_dose",
            details: {
              medicine_name: missed.medicine_name,
              timing: missed.scheduled_time,
            },
          },
        }).catch(() => {});
      }

      setLoading(false);
    };

    fetchData();

    const channel = supabase
      .channel("dashboard-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "doses" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "medicines" }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleUndoTaken = async (medicineId: string, timing: string) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      await supabase
        .from("doses")
        .update({ taken: false, taken_at: null })
        .eq("medicine_id", medicineId)
        .eq("scheduled_date", today)
        .eq("scheduled_time", timing);

      setTakenIds((prev) => {
        const next = new Set(prev);
        next.delete(`${medicineId}:${timing}`);
        return next;
      });
      toast.success("Undo successful");
    } catch {
      toast.error("Failed to undo");
    }
  };

  const handleMarkMissed = async (medicineId: string, timing: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const today = new Date().toISOString().split("T")[0];
      const med = medicines.find((m) => m.id === medicineId);

      const { data: existing } = await supabase
        .from("doses")
        .select("id")
        .eq("medicine_id", medicineId)
        .eq("scheduled_date", today)
        .eq("scheduled_time", timing)
        .maybeSingle();

      if (existing) {
        await supabase.from("doses").update({ taken: false, missed: true, taken_at: null }).eq("id", existing.id);
      } else {
        await supabase.from("doses").insert({
          medicine_id: medicineId,
          user_id: user.id,
          scheduled_date: today,
          scheduled_time: timing,
          taken: false,
          missed: true,
        });
      }

      setMissedDoses((prev) => [...prev, { id: medicineId, medicine_name: med?.name || "", scheduled_time: timing }]);
      
      supabase.functions.invoke("caretaker-alert", {
        body: {
          type: "missed_dose",
          details: { medicine_name: med?.name, timing },
        },
      }).catch(() => {});

      toast(`${med?.name} marked as skipped`, {
        action: { label: "Undo", onClick: () => handleMarkTaken(medicineId, timing) },
        duration: 5000,
      });
    } catch {
      toast.error("Failed to mark as missed");
    }
  };

  const handleMarkTaken = async (medicineId: string, timing: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];
      const med = medicines.find((m) => m.id === medicineId);

      const { data: existing } = await supabase
        .from("doses")
        .select("id")
        .eq("medicine_id", medicineId)
        .eq("scheduled_date", today)
        .eq("scheduled_time", timing)
        .maybeSingle();

      if (existing) {
        await supabase.from("doses").update({ taken: true, missed: false, taken_at: new Date().toISOString() }).eq("id", existing.id);
      } else {
        await supabase.from("doses").insert({
          medicine_id: medicineId,
          user_id: user.id,
          scheduled_date: today,
          scheduled_time: timing,
          taken: true,
          missed: false,
          taken_at: new Date().toISOString(),
        });
      }

      setTakenIds((prev) => new Set([...prev, `${medicineId}:${timing}`]));
      setMissedDoses((prev) => prev.filter((d) => !(d.medicine_name === med?.name && d.scheduled_time === timing)));
      toast.success(`${med?.name} marked as taken!`, {
        action: {
          label: "Undo",
          onClick: () => handleUndoTaken(medicineId, timing),
        },
        duration: 5000,
      });
    } catch (err: any) {
      toast.error("Failed to mark as taken");
    }
  };

  const totalCount = medicines.reduce((sum, m) => sum + m.timing.split(",").length, 0);
  const takenCount = takenIds.size;
  const progressPercent = totalCount > 0 ? (takenCount / totalCount) * 100 : 0;

  const sections: { key: string }[] = [
    { key: "morning" },
    { key: "afternoon" },
    { key: "night" },
  ];

  // Elderly simplified home
  if (elderlyMode) {
    return (
      <div className="min-h-screen bg-background pb-24 page-transition">
        <div className="bg-primary text-primary-foreground p-6">
          <h1 className="text-2xl font-bold">{t("good_morning")}</h1>
          <p className="text-primary-foreground/70 mt-1">{takenCount} {t("of")} {totalCount} {t("medicines_taken_label")}</p>
          <div className="w-full h-4 bg-primary-foreground/20 rounded-full overflow-hidden mt-3">
            <div
              className="h-full rounded-full bg-primary-foreground animate-progress-fill"
              style={{ "--progress-width": `${progressPercent}%`, width: `${progressPercent}%` } as React.CSSProperties}
            />
          </div>
        </div>

        {missedDoses.length > 0 && (
          <div className="px-4 mt-4 space-y-2">
            {missedDoses.map((d) => (
              <div key={d.id} className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 flex items-center gap-3 pulse-alert">
                <AlertTriangle className="text-destructive flex-shrink-0" size={24} />
                <span className="text-foreground font-bold text-base">
                  {t("missed_label")}: {d.medicine_name} ({d.scheduled_time})
                </span>
              </div>
            ))}
          </div>
        )}

        <RefillBanner />

        {canInstall && !dismissedInstall && (
          <div className="mx-4 mt-4 bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 flex-shrink-0">
              <Download size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground">Install MedCircle</p>
              <p className="text-xs text-muted-foreground">Add to home screen for quick access</p>
            </div>
            <button onClick={install} className="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 bg-primary text-primary-foreground">Install</button>
            <button onClick={() => setDismissedInstall(true)} className="p-1 text-muted-foreground hover:text-foreground"><X size={16} /></button>
          </div>
        )}

        <div className="px-4 mt-8 grid grid-cols-2 gap-4">
          <button onClick={() => navigate("/reminders")}
            className="bg-card border-2 border-primary/30 rounded-2xl p-8 flex flex-col items-center gap-4 min-h-[140px] shadow-sm">
            <Pill size={40} className="text-primary" />
            <span className="text-lg font-bold text-foreground">{t("medicines")}</span>
          </button>
          <button onClick={() => navigate("/scan")}
            className="bg-card border-2 border-primary/30 rounded-2xl p-8 flex flex-col items-center gap-4 min-h-[140px] shadow-sm">
            <ScanLine size={40} className="text-primary" />
            <span className="text-lg font-bold text-foreground">{t("scan")}</span>
          </button>
          <button onClick={() => navigate("/drug-interaction")}
            className="bg-card border-2 border-warning/30 rounded-2xl p-8 flex flex-col items-center gap-4 min-h-[140px] shadow-sm">
            <FlaskConical size={40} className="text-warning" />
            <span className="text-lg font-bold text-foreground">{t("drug_interaction_checker")}</span>
          </button>
          <button onClick={() => navigate("/hospital-booking")}
            className="bg-card border-2 border-primary/30 rounded-2xl p-8 flex flex-col items-center gap-4 min-h-[140px] shadow-sm">
            <Stethoscope size={40} className="text-primary" />
            <span className="text-lg font-bold text-foreground">{t("book_checkup")}</span>
          </button>
          <button onClick={() => navigate("/profile")}
            className="bg-card border-2 border-primary/30 rounded-2xl p-8 flex flex-col items-center gap-4 min-h-[140px] shadow-sm">
            <Settings size={40} className="text-primary" />
            <span className="text-lg font-bold text-foreground">{t("profile")}</span>
          </button>
        </div>

        <EmergencyInfoButton />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-24 page-transition">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-5 relative overflow-hidden">
        <div className="absolute top-[-40px] right-[-40px] w-[140px] h-[140px] rounded-full bg-white/5" />
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center text-xl font-bold bg-white/20 rounded-[14px] text-white">
                {patientName.charAt(0)}
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">{patientName}</h1>
                <p className="text-white/60 text-sm">
                  {new Date().toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate("/notifications")} className="p-2 rounded-xl bg-white/10 hover:bg-white/20">
                <Bell size={18} className="text-white" />
              </button>
              <button onClick={() => navigate("/settings")} className="p-2 rounded-xl bg-white/10 hover:bg-white/20">
                <Settings size={18} className="text-white" />
              </button>
              <LanguageToggle />
            </div>
          </div>

          {/* Progress */}
          <div className="bg-white/10 rounded-2xl p-4 mt-2">
            <div className="flex justify-between items-baseline mb-2">
              <span className="font-bold text-2xl text-white">
                {takenCount}<span className="text-white/50 text-base font-normal">/{totalCount}</span>
              </span>
              <span className="font-bold text-emerald-300">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-400 animate-progress-fill"
                style={{ "--progress-width": `${progressPercent}%`, width: `${progressPercent}%` } as React.CSSProperties}
              />
            </div>
            <p className="text-white/50 text-xs mt-2">{t("medicines_taken_label")}</p>
          </div>
        </div>
      </div>

      {/* Missed Dose Alerts */}
      {missedDoses.length > 0 && (
        <div className="px-4 mt-4 space-y-2">
          {missedDoses.map((d) => (
            <div key={d.id} className="bg-destructive/10 border border-destructive/30 rounded-2xl p-3.5 flex items-center gap-3 pulse-alert">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-destructive/20 flex-shrink-0">
                <AlertTriangle size={18} className="text-destructive" />
              </div>
              <span className="text-foreground font-bold text-sm">
                {t("missed_label")}: {d.medicine_name} ({d.scheduled_time})
              </span>
            </div>
          ))}
        </div>
      )}

      <RefillBanner />

      {canInstall && !dismissedInstall && (
        <div className="mx-4 mt-4 bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 flex-shrink-0">
            <Download size={20} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground">Install MedCircle</p>
            <p className="text-xs text-muted-foreground">Add to home screen for quick access</p>
          </div>
          <button onClick={install} className="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 bg-primary text-primary-foreground">Install</button>
          <button onClick={() => setDismissedInstall(true)} className="p-1 text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>
      )}

      {/* Weekly Adherence Chart */}
      {medicines.length > 0 && (() => {
        const getColor = (pct: number) => pct >= 80 ? "hsl(var(--success))" : pct >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
        const weeklyData = [
          { day: "Mon", pct: 100 }, { day: "Tue", pct: 83 }, { day: "Wed", pct: 67 },
          { day: "Thu", pct: 100 }, { day: "Fri", pct: 50 }, { day: "Sat", pct: 83 },
          { day: "Sun", pct: Math.round(progressPercent) },
        ];
        return (
          <div className="px-4 mt-5">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">{t("weekly_progress")}</h3>
            <div className="bg-card border border-border rounded-2xl p-4 h-48 shadow-sm">
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
        );
      })()}

      {!loading && medicines.length === 0 && (
        <div className="px-4 mt-12 text-center animate-fade-in">
          <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Pill size={48} className="text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">{t("no_medicines_title")}</h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">{t("add_first_medicine_tracking")}</p>
          <button onClick={() => navigate("/add-medicine")}
            className="mt-6 bg-primary text-primary-foreground px-8 py-4 rounded-2xl text-base font-bold shadow-lg hover:opacity-90 transition-opacity">
            {t("add_medicine_btn")}
          </button>
        </div>
      )}

      {/* Medicine Sections */}
      {medicines.length > 0 && (
        <div className="px-4 mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-foreground">{t("todays_medicines")}</h2>
            <button
              onClick={() => navigate("/scan")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20"
            >
              <ScanLine size={16} className="text-primary" />
              <span className="text-xs font-bold text-primary">{t("scan")}</span>
            </button>
          </div>
          {sections.map((section) => {
            const configs = sectionConfig(t);
            const config = configs[section.key as keyof typeof configs];
            const sectionMeds = medicines.filter((m) => m.timing.split(",").includes(section.key));
            if (sectionMeds.length === 0) return null;
            return (
              <div key={section.key}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1.5 shadow-sm flex-shrink-0">
                    <span className="text-sm">{config.emoji}</span>
                    <span className="font-bold text-sm text-foreground">{config.label}</span>
                  </div>
                  <div className="flex-1 h-[1px] bg-border rounded-full" />
                </div>

                <div className="space-y-3">
                  {sectionMeds.map((med, idx) => {
                    const isTaken = takenIds.has(`${med.id}:${section.key}`);
                    const isMissed = missedDoses.some((d) => d.medicine_name === med.name && d.scheduled_time === section.key);
                    const iconIdx = idx % MEDICINE_ICONS.length;

                    return (
                      <div
                        key={`${med.id}-${section.key}`}
                        className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 cursor-pointer shadow-sm animate-slide-up hover:shadow-md transition-shadow"
                        style={{
                          borderLeftWidth: "4px",
                          borderLeftColor: isTaken ? "hsl(var(--success))" : isMissed ? "hsl(var(--destructive))" : "hsl(var(--warning))",
                          animationDelay: `${idx * 80}ms`,
                        }}
                        onClick={() => navigate(`/medicine-detail/${med.id}`)}
                      >
                        <div className="w-[46px] h-[46px] flex items-center justify-center flex-shrink-0 text-xl bg-muted rounded-[14px]">
                          {MEDICINE_ICONS[iconIdx]}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[15px] text-foreground truncate">{med.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-muted-foreground text-xs">{med.dosage}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              med.food_instruction === "before_food" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"
                            }`}>
                              {FOOD_LABELS[med.food_instruction] || med.food_instruction}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {isTaken ? (
                            <>
                              <div className="px-3 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1 bg-success pulse-green">
                                <Check size={14} /> {t("taken_label")}
                              </div>
                              <button
                                onClick={() => handleUndoTaken(med.id, section.key)}
                                className="p-2 rounded-xl text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                title="Undo"
                              >
                                <Undo2 size={16} />
                              </button>
                            </>
                          ) : isMissed ? (
                            <div className="flex items-center gap-1.5">
                              <div className="px-3 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1 bg-destructive">
                                <X size={14} /> {t("missed_label")}
                              </div>
                              <button
                                onClick={() => handleMarkTaken(med.id, section.key)}
                                className="px-3 py-2 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                              >
                                {t("take_now")}
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleMarkTaken(med.id, section.key)}
                                className="px-3 py-2 rounded-xl text-xs font-bold text-foreground border border-warning/40 bg-card hover:bg-muted transition-colors"
                              >
                                {t("mark_taken_btn")}
                              </button>
                              <button
                                onClick={() => handleMarkMissed(med.id, section.key)}
                                className="p-2 rounded-xl text-xs text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
                                title="Skip / Missed"
                              >
                                <X size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DailyInsights />

      {/* Action Buttons */}
      <div className="px-4 mt-6 space-y-3">
        <button onClick={() => navigate("/scan")}
          className="w-full flex items-center justify-center gap-3 bg-card border-2 border-primary/30 rounded-2xl py-4 text-base font-bold text-primary hover:bg-primary/5 shadow-sm">
          <ScanLine size={22} /> {t("scan_prescription")}
        </button>
        <button onClick={() => navigate("/scan-tablet?mode=identify")}
          className="w-full flex items-center justify-center gap-3 bg-card border border-border rounded-2xl py-4 text-base font-bold text-muted-foreground hover:bg-muted shadow-sm">
          <HelpCircle size={22} /> {t("what_is_tablet")}
        </button>
        <button onClick={() => navigate("/drug-interaction")}
          className="w-full flex items-center justify-center gap-3 bg-card border border-border rounded-2xl py-4 text-base font-bold text-foreground hover:bg-muted shadow-sm">
          <FlaskConical size={22} className="text-warning" /> {t("drug_interaction_checker")}
        </button>
      </div>

      <EmergencyInfoButton />
      <BottomNav />
    </div>
  );
};

export default PatientDashboard;
