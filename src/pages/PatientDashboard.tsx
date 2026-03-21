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
const ICON_COLORS = ["#0d9488", "#f59e0b", "#8b5cf6", "#3b82f6", "#f43f5e", "#10b981"];

const getFoodLabels = (t: (key: string) => string): Record<string, string> => ({
  before_food: t("before_food"),
  after_food: t("after_food"),
  with_food: t("with_food"),
});

const sectionConfig = (t: (key: string) => string) => ({
  morning: { emoji: "☀️", label: t("morning"), glowColor: "rgba(245,158,11,0.2)", iconColor: "#f59e0b", textColor: "#f59e0b" },
  afternoon: { emoji: "🌤️", label: t("afternoon"), glowColor: "rgba(59,130,246,0.2)", iconColor: "#3b82f6", textColor: "#3b82f6" },
  night: { emoji: "🌙", label: t("night"), glowColor: "rgba(139,92,246,0.2)", iconColor: "#8b5cf6", textColor: "#8b5cf6" },
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
      <div className="min-h-screen pb-24 page-transition">
        {/* Header */}
        <div className="glass-header p-6">
          <div className="relative z-10">
            <h1 className="font-heading text-2xl font-extrabold text-white">{t("good_morning")}</h1>
            <p className="text-glass-secondary mt-1">{takenCount} {t("of")} {totalCount} {t("medicines_taken_label")}</p>
            <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden mt-3">
              <div
                className="h-full rounded-full animate-progress-fill"
                style={{
                  background: "linear-gradient(90deg, white, #0d9488, #10b981)",
                  boxShadow: "0 0 12px rgba(52,211,153,0.6)",
                  "--progress-width": `${progressPercent}%`,
                  width: `${progressPercent}%`,
                } as React.CSSProperties}
              />
            </div>
          </div>
        </div>

        {missedDoses.length > 0 && (
          <div className="px-4 mt-4 space-y-2">
            {missedDoses.map((d) => (
              <div key={d.id} className="glass-card p-4 flex items-center gap-3 pulse-alert" style={{ boxShadow: "inset 3px 0 0 #f43f5e" }}>
                <AlertTriangle className="text-[#f43f5e] flex-shrink-0" size={24} />
                <span className="text-white font-heading font-extrabold text-base">
                  {t("missed_label")}: {d.medicine_name} ({d.scheduled_time})
                </span>
              </div>
            ))}
          </div>
        )}

        <RefillBanner />

        {canInstall && !dismissedInstall && (
          <div className="mx-4 mt-4 glass-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(13,148,136,0.2)" }}>
              <Download size={20} className="text-[#34d399]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading font-bold text-sm text-white">Install MedCircle</p>
              <p className="text-xs text-glass-muted">Add to home screen for quick access</p>
            </div>
            <button onClick={install} className="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 text-white" style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}>Install</button>
            <button onClick={() => setDismissedInstall(true)} className="p-1 text-white/40 hover:text-white"><X size={16} /></button>
          </div>
        )}

        <div className="px-4 mt-8 grid grid-cols-2 gap-4">
          <button onClick={() => navigate("/reminders")}
            className="glass-card p-8 flex flex-col items-center gap-4 min-h-[140px]" style={{ border: "2px solid rgba(13,148,136,0.4)" }}>
            <Pill size={40} className="text-[#34d399]" />
            <span className="text-lg font-heading font-bold text-white">{t("medicines")}</span>
          </button>
          <button onClick={() => navigate("/scan")}
            className="glass-card p-8 flex flex-col items-center gap-4 min-h-[140px]" style={{ border: "2px solid rgba(13,148,136,0.4)" }}>
            <ScanLine size={40} className="text-[#34d399]" />
            <span className="text-lg font-heading font-bold text-white">{t("scan")}</span>
          </button>
          <button onClick={() => navigate("/drug-interaction")}
            className="glass-card p-8 flex flex-col items-center gap-4 min-h-[140px]" style={{ border: "2px solid rgba(245,158,11,0.4)" }}>
            <FlaskConical size={40} className="text-[#f59e0b]" />
            <span className="text-lg font-heading font-bold text-white">{t("drug_interaction_checker")}</span>
          </button>
          <button onClick={() => navigate("/hospital-booking")}
            className="glass-card p-8 flex flex-col items-center gap-4 min-h-[140px]" style={{ border: "2px solid rgba(13,148,136,0.4)" }}>
            <Stethoscope size={40} className="text-[#34d399]" />
            <span className="text-lg font-heading font-bold text-white">{t("book_checkup")}</span>
          </button>
          <button onClick={() => navigate("/profile")}
            className="glass-card p-8 flex flex-col items-center gap-4 min-h-[140px]" style={{ border: "2px solid rgba(13,148,136,0.4)" }}>
            <Settings size={40} className="text-[#34d399]" />
            <span className="text-lg font-heading font-bold text-white">{t("profile")}</span>
          </button>
        </div>

        <EmergencyInfoButton />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 page-transition">
      {/* Header */}
      <div className="glass-header p-5 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div
                className="w-12 h-12 flex items-center justify-center text-xl font-heading font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #0d9488, #10b981)",
                  borderRadius: "14px",
                  boxShadow: "0 0 16px rgba(13, 148, 136, 0.4)",
                }}
              >
                {patientName.charAt(0)}
              </div>
              <div>
                <h1 className="text-lg font-heading font-extrabold text-white">{patientName}</h1>
                <p className="text-glass-muted text-sm">
                  {new Date().toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate("/notifications")} className="p-2 rounded-xl glass-pill hover:bg-white/10">
                <Bell size={18} className="text-white" />
              </button>
              <button onClick={() => navigate("/settings")} className="p-2 rounded-xl glass-pill hover:bg-white/10">
                <Settings size={18} className="text-white" />
              </button>
              <LanguageToggle />
            </div>
          </div>

          {/* Progress — glass card */}
          <div className="glass-card p-4 mt-2">
            <div className="flex justify-between items-baseline mb-2">
              <span className="font-heading font-extrabold text-2xl text-white">
                {takenCount}<span className="text-white/50 text-base font-sans font-normal">/{totalCount}</span>
              </span>
              <span className="font-heading font-bold text-[#34d399]">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full animate-progress-fill"
                style={{
                  background: "linear-gradient(90deg, white, #0d9488, #10b981)",
                  boxShadow: "0 0 12px rgba(52,211,153,0.6)",
                  "--progress-width": `${progressPercent}%`,
                  width: `${progressPercent}%`,
                } as React.CSSProperties}
              />
            </div>
            <p className="text-glass-muted text-xs mt-2">{t("medicines_taken_label")}</p>
          </div>
        </div>
      </div>

      {/* Missed Dose Alerts */}
      {missedDoses.length > 0 && (
        <div className="px-4 mt-4 space-y-2">
          {missedDoses.map((d) => (
            <div
              key={d.id}
              className="glass-card p-3.5 flex items-center gap-3 pulse-alert"
              style={{ boxShadow: "inset 3px 0 0 #f43f5e, 0 8px 32px rgba(0,0,0,0.3)" }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(244,63,94,0.2)" }}>
                <AlertTriangle size={18} className="text-[#f43f5e]" />
              </div>
              <span className="text-white font-heading font-bold text-sm">
                {t("missed_label")}: {d.medicine_name} ({d.scheduled_time})
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Refill Banner */}
      <RefillBanner />

      {canInstall && !dismissedInstall && (
        <div className="mx-4 mt-4 glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(13,148,136,0.2)" }}>
            <Download size={20} className="text-[#34d399]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-heading font-bold text-sm text-white">Install MedCircle</p>
            <p className="text-xs text-glass-muted">Add to home screen for quick access</p>
          </div>
          <button onClick={install} className="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 text-white" style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}>Install</button>
          <button onClick={() => setDismissedInstall(true)} className="p-1 text-white/40 hover:text-white"><X size={16} /></button>
        </div>
      )}

      {/* Weekly Adherence Chart */}
      {medicines.length > 0 && (() => {
        const getColor = (pct: number) => pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#f43f5e";
        const weeklyData = [
          { day: "Mon", pct: 100 }, { day: "Tue", pct: 83 }, { day: "Wed", pct: 67 },
          { day: "Thu", pct: 100 }, { day: "Fri", pct: 50 }, { day: "Sat", pct: 83 },
          { day: "Sun", pct: Math.round(progressPercent) },
        ];
        return (
          <div className="px-4 mt-5">
            <h3 className="text-sm font-bold text-glass-secondary uppercase tracking-wide mb-3">{t("weekly_progress")}</h3>
            <div className="glass-card p-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
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
          <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(255,255,255,0.08)" }}>
            <Pill size={48} className="text-[#34d399]" />
          </div>
          <h2 className="text-xl font-heading font-bold text-white">{t("no_medicines_title")}</h2>
          <p className="text-glass-secondary text-sm mt-2 max-w-xs mx-auto">{t("add_first_medicine_tracking")}</p>
          <button onClick={() => navigate("/add-medicine")}
            className="mt-6 text-white px-8 py-4 rounded-2xl text-base font-heading font-bold shadow-lg hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)", boxShadow: "0 6px 20px rgba(13,148,136,0.4)" }}
          >
            {t("add_medicine_btn")}
          </button>
        </div>
      )}

      {/* Medicine Sections */}
      {medicines.length > 0 && (
        <div className="px-4 mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-extrabold text-lg text-white">{t("todays_medicines")}</h2>
            <button
              onClick={() => navigate("/scan")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-pill hover:bg-white/15"
            >
              <ScanLine size={16} className="text-[#34d399]" />
              <span className="text-xs font-heading font-bold text-[#34d399]">{t("scan")}</span>
            </button>
          </div>
          {sections.map((section) => {
            const configs = sectionConfig(t);
            const config = configs[section.key as keyof typeof configs];
            const sectionMeds = medicines.filter((m) => m.timing.split(",").includes(section.key));
            if (sectionMeds.length === 0) return null;
            return (
              <div key={section.key}>
                {/* Section header pill */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2 glass-pill px-3 py-1.5 flex-shrink-0"
                    style={{ boxShadow: `inset 0 0 12px ${config.glowColor}` }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
                      style={{ background: `${config.iconColor}30` }}>
                      {config.emoji}
                    </div>
                    <span className="font-heading font-bold text-sm text-white">{config.label}</span>
                  </div>
                  <div className="flex-1 h-[1px] bg-white/15 rounded-full" />
                </div>

                <div className="space-y-3">
                  {sectionMeds.map((med, idx) => {
                    const isTaken = takenIds.has(`${med.id}:${section.key}`);
                    const isMissed = missedDoses.some((d) => d.medicine_name === med.name && d.scheduled_time === section.key);
                    const iconIdx = idx % MEDICINE_ICONS.length;
                    const colorIdx = idx % ICON_COLORS.length;

                    return (
                      <div
                        key={`${med.id}-${section.key}`}
                        className="glass-card p-4 flex items-center gap-3 cursor-pointer animate-slide-up"
                        style={{
                          borderLeft: `4px solid ${isTaken ? "#10b981" : isMissed ? "#f43f5e" : "#f59e0b"}`,
                          background: isTaken ? "rgba(16,185,129,0.13)" : isMissed ? "rgba(244,63,94,0.08)" : "rgba(255,255,255,0.08)",
                          animationDelay: `${idx * 80}ms`,
                        }}
                        onClick={() => navigate(`/medicine-detail/${med.id}`)}
                      >
                        {/* Icon box */}
                        <div
                          className="w-[46px] h-[46px] flex items-center justify-center flex-shrink-0 text-xl rounded-[14px]"
                          style={{ background: "rgba(255,255,255,0.12)" }}
                        >
                          {MEDICINE_ICONS[iconIdx]}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading font-bold text-[15px] text-white truncate">{med.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-glass-muted text-xs">{med.dosage}</span>
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full glass-pill"
                              style={{
                                color: med.food_instruction === "before_food" ? "#0d9488" : "#f59e0b",
                              }}
                            >
                              {FOOD_LABELS[med.food_instruction] || med.food_instruction}
                            </span>
                          </div>
                        </div>

                        {/* Status badges */}
                        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {isTaken ? (
                            <>
                              <div className="px-3 py-2 rounded-xl text-xs font-heading font-bold text-white flex items-center gap-1 pulse-green"
                                style={{ background: "#10b981", boxShadow: "0 0 16px rgba(16,185,129,0.4)" }}>
                                <Check size={14} /> {t("taken_label")}
                              </div>
                              <button
                                onClick={() => handleUndoTaken(med.id, section.key)}
                                className="p-2 rounded-xl text-xs text-white/40 hover:bg-white/10 hover:text-white transition-colors"
                                title="Undo"
                              >
                                <Undo2 size={16} />
                              </button>
                            </>
                          ) : isMissed ? (
                            <div className="flex items-center gap-1.5">
                              <div className="px-3 py-2 rounded-xl text-xs font-heading font-bold text-white flex items-center gap-1"
                                style={{ background: "#f43f5e" }}>
                                <X size={14} /> {t("missed_label")}
                              </div>
                              <button
                                onClick={() => handleMarkTaken(med.id, section.key)}
                                className="px-3 py-2 rounded-xl text-xs font-heading font-bold text-[#34d399] glass-pill hover:bg-white/10 transition-colors"
                              >
                                {t("take_now")}
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleMarkTaken(med.id, section.key)}
                                className="px-3 py-2 rounded-xl text-xs font-heading font-bold text-white glass-pill hover:bg-white/15 transition-colors"
                                style={{ borderColor: "rgba(245,158,11,0.4)" }}
                              >
                                {t("mark_taken_btn")}
                              </button>
                              <button
                                onClick={() => handleMarkMissed(med.id, section.key)}
                                className="p-2 rounded-xl text-xs text-white/40 hover:bg-white/10 hover:text-[#f43f5e] transition-colors"
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

      {/* Daily Insights */}
      <DailyInsights />

      {/* Action Buttons */}
      <div className="px-4 mt-6 space-y-3">
        <button onClick={() => navigate("/scan")}
          className="w-full flex items-center justify-center gap-3 glass-card py-4 text-base font-heading font-bold text-[#34d399] hover:bg-white/12"
          style={{ border: "2px solid rgba(13,148,136,0.4)" }}
        >
          <ScanLine size={22} /> {t("scan_prescription")}
        </button>
        <button onClick={() => navigate("/scan-tablet?mode=identify")}
          className="w-full flex items-center justify-center gap-3 glass-card py-4 text-base font-heading font-bold text-glass-secondary hover:bg-white/12">
          <HelpCircle size={22} /> {t("what_is_tablet")}
        </button>
        <button onClick={() => navigate("/drug-interaction")}
          className="w-full flex items-center justify-center gap-3 glass-card py-4 text-base font-heading font-bold text-white hover:bg-white/12">
          <FlaskConical size={22} className="text-[#f59e0b]" /> {t("drug_interaction_checker")}
        </button>
      </div>

      <EmergencyInfoButton />
      <BottomNav />
    </div>
  );
};

export default PatientDashboard;
