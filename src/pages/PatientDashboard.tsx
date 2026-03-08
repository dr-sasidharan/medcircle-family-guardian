import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useElderlyMode } from "@/contexts/ElderlyModeContext";
import LanguageToggle from "@/components/LanguageToggle";
import BottomNav from "@/components/BottomNav";
import EmergencyInfoButton from "@/components/EmergencyInfoButton";
import RefillBanner from "@/components/RefillBanner";
import DailyInsights from "@/components/DailyInsights";
import { supabase } from "@/integrations/supabase/client";
import { Check, ScanLine, HelpCircle, FlaskConical, Pill, Settings, AlertTriangle } from "lucide-react";

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

const FOOD_LABELS: Record<string, string> = {
  before_food: "Before Food",
  after_food: "After Food",
  with_food: "With Food",
};

const sectionConfig = {
  morning: { emoji: "☀️", label: "Morning", gradient: "from-[#fef3c7] to-[#fffbeb]", pillBg: "bg-[#fef3c7]", iconBg: "bg-[#f59e0b]", text: "text-[#92400e]", line: "bg-[#fcd34d]" },
  afternoon: { emoji: "🌤️", label: "Afternoon", gradient: "from-[#dbeafe] to-[#eff6ff]", pillBg: "bg-[#dbeafe]", iconBg: "bg-[#3b82f6]", text: "text-[#1e3a5f]", line: "bg-[#93c5fd]" },
  night: { emoji: "🌙", label: "Night", gradient: "from-[#ede9fe] to-[#f5f3ff]", pillBg: "bg-[#ede9fe]", iconBg: "bg-[#8b5cf6]", text: "text-[#4c1d95]", line: "bg-[#c4b5fd]" },
};

const PatientDashboard = () => {
  const { elderlyMode } = useElderlyMode();
  const navigate = useNavigate();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [takenIds, setTakenIds] = useState<Set<string>>(new Set());
  const [missedDoses, setMissedDoses] = useState<MissedDose[]>([]);
  const [patientName, setPatientName] = useState("Patient");

  useEffect(() => {
    const fetchData = async () => {
      const { data: profiles } = await supabase.from("patient_profiles").select("name").limit(1);
      if (profiles?.length) setPatientName(profiles[0].name);

      const { data } = await supabase.from("medicines").select("id, name, dosage, timing, food_instruction").eq("is_active", true);
      setMedicines((data || []) as Medicine[]);

      const today = new Date().toISOString().split("T")[0];
      const { data: takenDoses } = await supabase.from("doses").select("medicine_id").eq("scheduled_date", today).eq("taken", true);
      setTakenIds(new Set((takenDoses || []).map((d: any) => d.medicine_id)));

      const { data: missed } = await supabase
        .from("doses")
        .select("id, scheduled_time, medicines(name)")
        .eq("scheduled_date", today)
        .eq("missed", true)
        .eq("taken", false);

      setMissedDoses((missed || []).map((d: any) => ({
        id: d.id,
        medicine_name: d.medicines?.name || "Unknown",
        scheduled_time: d.scheduled_time,
      })));

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

  const takenCount = medicines.filter((m) => takenIds.has(m.id)).length;
  const totalCount = medicines.length;
  const progressPercent = totalCount > 0 ? (takenCount / totalCount) * 100 : 0;

  const sections: { key: string }[] = [
    { key: "morning" },
    { key: "afternoon" },
    { key: "night" },
  ];

  // Elderly simplified home
  if (elderlyMode) {
    return (
      <div className="min-h-screen bg-surface pb-24 page-transition">
        <div
          className="text-white p-6 rounded-b-3xl relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0f766e 0%, #134e4a 60%, #0c3532 100%)" }}
        >
          <div className="absolute top-[-30px] right-[-30px] w-[120px] h-[120px] rounded-full bg-white/5 animate-float" />
          <div className="relative z-10">
            <h1 className="font-heading text-2xl font-extrabold">Good Morning</h1>
            <p className="text-white/70 mt-1">{takenCount} of {totalCount} Medicines Taken</p>
            <div className="w-full h-4 bg-white/20 rounded-full overflow-hidden mt-3">
              <div
                className="h-full rounded-full animate-progress-fill"
                style={{
                  background: "linear-gradient(90deg, #34d399, #f59e0b, #f97316)",
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
              <div key={d.id} className="bg-[#fff1f2] border-2 border-[#fda4af] rounded-2xl p-4 flex items-center gap-3 pulse-alert">
                <AlertTriangle className="text-coral flex-shrink-0" size={24} />
                <span className="text-[#9f1239] font-heading font-extrabold text-base">
                  Missed: {d.medicine_name} ({d.scheduled_time})
                </span>
              </div>
            ))}
          </div>
        )}

        <RefillBanner />

        <div className="px-4 mt-8 grid grid-cols-2 gap-4">
          <button onClick={() => navigate("/reminders")}
            className="bg-card border-2 border-primary rounded-2xl p-8 flex flex-col items-center gap-4 min-h-[140px] hover:bg-secondary transition-colors">
            <Pill size={40} className="text-primary" />
            <span className="text-lg font-heading font-bold text-foreground">Medicines</span>
          </button>
          <button onClick={() => navigate("/scan")}
            className="bg-card border-2 border-primary rounded-2xl p-8 flex flex-col items-center gap-4 min-h-[140px] hover:bg-secondary transition-colors">
            <ScanLine size={40} className="text-primary" />
            <span className="text-lg font-heading font-bold text-foreground">Scan</span>
          </button>
          <button onClick={() => navigate("/drug-interaction")}
            className="bg-card border-2 border-warning rounded-2xl p-8 flex flex-col items-center gap-4 min-h-[140px] hover:bg-secondary transition-colors">
            <FlaskConical size={40} className="text-warning" />
            <span className="text-lg font-heading font-bold text-foreground">Drug Interaction</span>
          </button>
          <button onClick={() => navigate("/profile")}
            className="bg-card border-2 border-primary rounded-2xl p-8 flex flex-col items-center gap-4 min-h-[140px] hover:bg-secondary transition-colors">
            <Settings size={40} className="text-primary" />
            <span className="text-lg font-heading font-bold text-foreground">Profile</span>
          </button>
        </div>

        <EmergencyInfoButton />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-24 page-transition">
      {/* Header */}
      <div
        className="text-white p-5 rounded-b-[28px] relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f766e 0%, #134e4a 60%, #0c3532 100%)" }}
      >
        {/* Decorative circles */}
        <div className="absolute top-[-40px] right-[-40px] w-[140px] h-[140px] rounded-full bg-white/5 animate-float" />
        <div className="absolute bottom-[-20px] left-[-20px] w-[100px] h-[100px] rounded-full bg-white/5 animate-float" style={{ animationDelay: "3s" }} />

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div
                className="w-12 h-12 flex items-center justify-center text-xl font-heading font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #f97316)",
                  borderRadius: "14px",
                  boxShadow: "0 0 16px rgba(245, 158, 11, 0.4)",
                }}
              >
                {patientName.charAt(0)}
              </div>
              <div>
                <h1 className="text-lg font-heading font-extrabold">{patientName}</h1>
                <p className="text-white/60 text-sm">
                  {new Date().toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate("/settings")} className="p-2 rounded-xl bg-white/10 hover:bg-white/20">
                <Settings size={18} />
              </button>
              <LanguageToggle />
            </div>
          </div>

          {/* Progress — glass card */}
          <div className="glass-card rounded-2xl p-4 mt-2">
            <div className="flex justify-between items-baseline mb-2">
              <span className="font-heading font-extrabold text-2xl">
                {takenCount}<span className="text-white/50 text-base font-sans font-normal">/{totalCount}</span>
              </span>
              <span className="font-heading font-bold text-[#f59e0b]">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full h-3 bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full animate-progress-fill"
                style={{
                  background: "linear-gradient(90deg, #34d399, #f59e0b, #f97316)",
                  "--progress-width": `${progressPercent}%`,
                  width: `${progressPercent}%`,
                } as React.CSSProperties}
              />
            </div>
            <p className="text-white/50 text-xs mt-2">Medicines Taken</p>
          </div>
        </div>
      </div>

      {/* Missed Dose Alerts */}
      {missedDoses.length > 0 && (
        <div className="px-4 mt-4 space-y-2">
          {missedDoses.map((d) => (
            <div
              key={d.id}
              className="border rounded-2xl p-3.5 flex items-center gap-3 pulse-alert"
              style={{ background: "linear-gradient(135deg, #fff1f2, #ffe4e6)", borderColor: "#fda4af" }}
            >
              <div className="w-9 h-9 rounded-xl bg-[#fda4af]/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-[#e11d48]" />
              </div>
              <span className="text-[#9f1239] font-heading font-bold text-sm">
                Missed: {d.medicine_name} ({d.scheduled_time})
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Refill Banner */}
      <RefillBanner />

      {/* Empty State */}
      {!loading && medicines.length === 0 && (
        <div className="px-4 mt-12 text-center animate-fade-in">
          <div className="w-24 h-24 mx-auto bg-secondary rounded-full flex items-center justify-center mb-4">
            <Pill size={48} className="text-primary" />
          </div>
          <h2 className="text-xl font-heading font-bold text-foreground">No Medicines Yet</h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">Add your first medicine to start tracking</p>
          <button onClick={() => navigate("/add-medicine")}
            className="mt-6 text-white px-8 py-4 rounded-2xl text-base font-heading font-bold shadow-lg hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}
          >
            + Add Medicine
          </button>
        </div>
      )}

      {/* Medicine Sections */}
      {medicines.length > 0 && (
        <div className="px-4 mt-6 space-y-6">
          {sections.map((section) => {
            const config = sectionConfig[section.key as keyof typeof sectionConfig];
            const sectionMeds = medicines.filter((m) => m.timing === section.key);
            if (sectionMeds.length === 0) return null;
            return (
              <div key={section.key}>
                {/* Section header pill + line */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex items-center gap-2 ${config.pillBg} rounded-full px-3 py-1.5 flex-shrink-0`}>
                    <div className={`w-7 h-7 ${config.iconBg} rounded-full flex items-center justify-center text-sm`}>
                      {config.emoji}
                    </div>
                    <span className={`font-heading font-bold text-sm ${config.text}`}>{config.label}</span>
                  </div>
                  <div className={`flex-1 h-[2px] ${config.line} rounded-full`} />
                </div>

                <div className="space-y-3">
                  {sectionMeds.map((med, idx) => {
                    const isTaken = takenIds.has(med.id);
                    const isMissed = missedDoses.some((d) => d.medicine_name === med.name);
                    const iconIdx = idx % MEDICINE_ICONS.length;
                    const colorIdx = idx % ICON_COLORS.length;

                    return (
                      <div
                        key={med.id}
                        className="bg-card rounded-[18px] p-4 flex items-center gap-3 cursor-pointer animate-slide-up"
                        style={{
                          borderLeft: `4px solid ${isTaken ? "#10b981" : isMissed ? "#f43f5e" : "#f59e0b"}`,
                          background: isTaken ? "#ecfdf5" : isMissed ? "#fff1f2" : "white",
                          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                          animationDelay: `${idx * 80}ms`,
                        }}
                        onClick={() => navigate(`/medicine-detail/${med.id}`)}
                      >
                        {/* Icon box */}
                        <div
                          className="w-[46px] h-[46px] flex items-center justify-center flex-shrink-0 text-xl"
                          style={{
                            background: `${ICON_COLORS[colorIdx]}15`,
                            borderRadius: "14px",
                          }}
                        >
                          {MEDICINE_ICONS[iconIdx]}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading font-bold text-[15px] text-ink truncate">{med.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-muted-foreground text-xs">{med.dosage}</span>
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                background: med.food_instruction === "before_food" ? "#ccfbf1" : "#fef3c7",
                                color: med.food_instruction === "before_food" ? "#0d9488" : "#b45309",
                              }}
                            >
                              {FOOD_LABELS[med.food_instruction] || med.food_instruction}
                            </span>
                          </div>
                        </div>

                        {/* Status badge */}
                        <div className="flex-shrink-0">
                          {isTaken ? (
                            <div className="px-3 py-2 rounded-xl text-xs font-heading font-bold text-white bg-emerald glow-emerald flex items-center gap-1">
                              <Check size={14} /> Taken
                            </div>
                          ) : isMissed ? (
                            <div className="px-3 py-2 rounded-xl text-xs font-heading font-bold text-white bg-coral">
                              Missed
                            </div>
                          ) : (
                            <div className="px-3 py-2 rounded-xl text-xs font-heading font-bold text-amber border-2 border-amber/30 bg-white">
                              Mark Taken
                            </div>
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
          className="w-full flex items-center justify-center gap-3 bg-card border-2 border-primary rounded-2xl py-4 text-base font-heading font-bold text-primary hover:bg-secondary transition-colors"
          style={{ boxShadow: "0 2px 12px rgba(13,148,136,0.1)" }}
        >
          <ScanLine size={22} /> Scan Prescription
        </button>
        <button onClick={() => navigate("/scan-tablet?mode=identify")}
          className="w-full flex items-center justify-center gap-3 bg-secondary rounded-2xl py-4 text-base font-heading font-bold text-secondary-foreground hover:bg-accent transition-colors">
          <HelpCircle size={22} /> What Is This Tablet?
        </button>
        <button onClick={() => navigate("/drug-interaction")}
          className="w-full flex items-center justify-center gap-3 bg-card border border-border rounded-2xl py-4 text-base font-heading font-bold text-foreground hover:bg-secondary transition-colors">
          <FlaskConical size={22} className="text-warning" /> Drug Interaction Checker
        </button>
      </div>

      <EmergencyInfoButton />
      <BottomNav />
    </div>
  );
};

export default PatientDashboard;