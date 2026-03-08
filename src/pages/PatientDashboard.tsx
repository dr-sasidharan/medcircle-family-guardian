import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useElderlyMode } from "@/contexts/ElderlyModeContext";
import LanguageToggle from "@/components/LanguageToggle";
import BottomNav from "@/components/BottomNav";
import EmergencyInfoButton from "@/components/EmergencyInfoButton";
import RefillBanner from "@/components/RefillBanner";
import DailyInsights from "@/components/DailyInsights";
import { supabase } from "@/integrations/supabase/client";
import { Sun, CloudSun, Moon, Check, Plus, ScanLine, HelpCircle, FlaskConical, Pill, Settings, AlertTriangle } from "lucide-react";

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

const PatientDashboard = () => {
  const { t } = useLanguage();
  const { elderlyMode } = useElderlyMode();
  const navigate = useNavigate();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [takenIds, setTakenIds] = useState<Set<string>>(new Set());
  const [missedDoses, setMissedDoses] = useState<MissedDose[]>([]);
  const [patientName, setPatientName] = useState("Patient");

  useEffect(() => {
    const fetchData = async () => {
      // Fetch patient name
      const { data: profiles } = await supabase.from("patient_profiles").select("name").limit(1);
      if (profiles?.length) setPatientName(profiles[0].name);

      // Fetch medicines
      const { data } = await supabase.from("medicines").select("id, name, dosage, timing, food_instruction").eq("is_active", true);
      setMedicines((data || []) as Medicine[]);

      // Get today's doses
      const today = new Date().toISOString().split("T")[0];
      const { data: takenDoses } = await supabase.from("doses").select("medicine_id").eq("scheduled_date", today).eq("taken", true);
      setTakenIds(new Set((takenDoses || []).map((d: any) => d.medicine_id)));

      // Get missed doses today
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

  const sections: { key: string; icon: React.ReactNode }[] = [
    { key: "morning", icon: <Sun size={20} /> },
    { key: "afternoon", icon: <CloudSun size={20} /> },
    { key: "night", icon: <Moon size={20} /> },
  ];

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  // Elderly simplified home
  if (elderlyMode) {
    return (
      <div className="min-h-screen bg-background pb-24 page-transition">
        <div className="bg-primary text-primary-foreground p-6 rounded-b-3xl">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h1 className="text-2xl font-extrabold">{t("good_morning")}</h1>
              <p className="text-primary-foreground/80 mt-1">{takenCount} {t("of")} {totalCount} {t("medicines_taken")}</p>
            </div>
            <button onClick={() => navigate("/settings")} className="p-2">
              <Settings size={24} />
            </button>
          </div>
          <div className="w-full h-4 bg-primary-foreground/20 rounded-full overflow-hidden mt-3">
            <div className="h-full bg-primary-foreground rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {/* Missed dose alerts */}
        {missedDoses.length > 0 && (
          <div className="px-4 mt-4 space-y-2">
            {missedDoses.map((d) => (
              <div key={d.id} className="bg-destructive/10 border-2 border-destructive/40 rounded-2xl p-4 flex items-center gap-3 pulse-alert">
                <AlertTriangle className="text-destructive flex-shrink-0" size={24} />
                <span className="text-destructive font-extrabold text-base">
                  {t("missed_alert")}: {d.medicine_name} ({d.scheduled_time})
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
            <span className="text-lg font-bold text-foreground">{t("medicines")}</span>
          </button>
          <button onClick={() => navigate("/scan")}
            className="bg-card border-2 border-primary rounded-2xl p-8 flex flex-col items-center gap-4 min-h-[140px] hover:bg-secondary transition-colors">
            <ScanLine size={40} className="text-primary" />
            <span className="text-lg font-bold text-foreground">{t("scan")}</span>
          </button>
          <button onClick={() => navigate("/drug-interaction")}
            className="bg-card border-2 border-warning rounded-2xl p-8 flex flex-col items-center gap-4 min-h-[140px] hover:bg-secondary transition-colors">
            <FlaskConical size={40} className="text-warning" />
            <span className="text-lg font-bold text-foreground">{t("drug_interaction_checker")}</span>
          </button>
          <button onClick={() => navigate("/profile")}
            className="bg-card border-2 border-primary rounded-2xl p-8 flex flex-col items-center gap-4 min-h-[140px] hover:bg-secondary transition-colors">
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
    <div className="min-h-screen bg-background pb-24 page-transition">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-5 rounded-b-3xl">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xl font-bold">
              {patientName.charAt(0)}
            </div>
            <div>
              <h1 className="text-lg font-bold">{patientName}</h1>
              <p className="text-primary-foreground/80 text-sm">{today}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/settings")} className="p-1.5 rounded-lg bg-primary-foreground/10">
              <Settings size={18} />
            </button>
            <LanguageToggle />
          </div>
        </div>

        {/* Progress */}
        <div className="mt-3">
          <div className="flex justify-between text-sm mb-2">
            <span>{takenCount} {t("of")} {totalCount} {t("medicines_taken")}</span>
            <span className="font-bold">{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full h-3 bg-primary-foreground/20 rounded-full overflow-hidden">
            <div className="h-full bg-primary-foreground rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      {/* Missed Dose Alerts - Pulsing Red */}
      {missedDoses.length > 0 && (
        <div className="px-4 mt-4 space-y-2">
          {missedDoses.map((d) => (
            <div key={d.id} className="bg-destructive/10 border-2 border-destructive/40 rounded-2xl p-3.5 flex items-center gap-3 pulse-alert">
              <AlertTriangle className="text-destructive flex-shrink-0" size={20} />
              <span className="text-destructive font-bold text-sm">
                {t("missed_alert")}: {d.medicine_name} ({d.scheduled_time})
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
          <h2 className="text-xl font-bold text-foreground">{t("no_medicines_yet")}</h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">{t("add_first_medicine")}</p>
          <button onClick={() => navigate("/add-medicine")}
            className="mt-6 bg-primary text-primary-foreground px-8 py-4 rounded-2xl text-base font-bold shadow-lg hover:opacity-90 transition-opacity">
            + {t("add_medicine")}
          </button>
        </div>
      )}

      {/* Medicine Sections */}
      {medicines.length > 0 && (
        <div className="px-4 mt-6 space-y-6">
          {sections.map((section) => {
            const sectionMeds = medicines.filter((m) => m.timing === section.key);
            if (sectionMeds.length === 0) return null;
            return (
              <div key={section.key}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-primary">{section.icon}</span>
                  <h2 className="text-lg font-bold text-foreground">{t(section.key)}</h2>
                </div>
                <div className="space-y-3">
                  {sectionMeds.map((med) => {
                    const isTaken = takenIds.has(med.id);
                    const isMissed = missedDoses.some((d) => d.medicine_name === med.name && d.scheduled_time === section.key);
                    return (
                      <div key={med.id}
                        className={`bg-card rounded-2xl p-4 border transition-all cursor-pointer ${
                          isTaken ? "border-success/30 bg-success/5" : isMissed ? "border-destructive/30 bg-destructive/5" : "border-border"
                        }`}
                        onClick={() => navigate("/medicine-detail")}>
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-base font-bold text-foreground">{med.name}</h3>
                            <p className="text-muted-foreground text-sm">
                              {med.dosage} · {t(med.food_instruction) || med.food_instruction}
                            </p>
                          </div>
                          <div className={`px-4 py-2.5 rounded-xl text-sm font-bold ${
                            isTaken ? "bg-success text-success-foreground"
                              : isMissed ? "bg-destructive text-destructive-foreground"
                              : "bg-primary text-primary-foreground shadow-md"
                          }`}>
                            {isTaken ? (
                              <span className="flex items-center gap-1"><Check size={16} /> {t("taken")}</span>
                            ) : isMissed ? (
                              <span className="flex items-center gap-1"><AlertTriangle size={16} /> Missed</span>
                            ) : t("mark_taken")}
                          </div>
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
          className="w-full flex items-center justify-center gap-3 bg-card border-2 border-primary rounded-2xl py-4 text-base font-bold text-primary hover:bg-secondary transition-colors">
          <ScanLine size={22} /> {t("scan_prescription")}
        </button>
        <button onClick={() => navigate("/scan-tablet?mode=identify")}
          className="w-full flex items-center justify-center gap-3 bg-secondary rounded-2xl py-4 text-base font-bold text-secondary-foreground hover:bg-accent transition-colors">
          <HelpCircle size={22} /> {t("what_is_tablet")}
        </button>
        <button onClick={() => navigate("/drug-interaction")}
          className="w-full flex items-center justify-center gap-3 bg-card border border-border rounded-2xl py-4 text-base font-bold text-foreground hover:bg-secondary transition-colors">
          <FlaskConical size={22} className="text-warning" /> {t("drug_interaction_checker")}
        </button>
      </div>

      {/* FAB */}
      <button onClick={() => navigate("/add-medicine")}
        className="fixed bottom-24 right-5 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl flex items-center justify-center hover:opacity-90 transition-opacity z-40">
        <Plus size={28} />
      </button>

      <EmergencyInfoButton />
      <BottomNav />
    </div>
  );
};

export default PatientDashboard;
