import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";
import BottomNav from "@/components/BottomNav";
import { Sun, CloudSun, Moon, Check, Plus, ScanLine, HelpCircle, FlaskConical } from "lucide-react";
import DailyInsights from "@/components/DailyInsights";

interface Medicine {
  id: number;
  name: string;
  dosage: string;
  timing: "morning" | "afternoon" | "night";
  food: string;
  taken: boolean;
}

const defaultMedicines: Medicine[] = [
  { id: 1, name: "Metformin", dosage: "500mg", timing: "morning", food: "After Food", taken: false },
  { id: 2, name: "Amlodipine", dosage: "5mg", timing: "morning", food: "Before Food", taken: true },
  { id: 3, name: "Pantoprazole", dosage: "40mg", timing: "morning", food: "Before Food", taken: true },
  { id: 4, name: "Metformin", dosage: "500mg", timing: "afternoon", food: "After Food", taken: false },
  { id: 5, name: "Atorvastatin", dosage: "10mg", timing: "night", food: "After Food", taken: false },
  { id: 6, name: "Telmisartan", dosage: "40mg", timing: "night", food: "After Food", taken: true },
];

const PatientDashboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [medicines, setMedicines] = useState(defaultMedicines);

  const takenCount = medicines.filter((m) => m.taken).length;
  const totalCount = medicines.length;
  const progressPercent = (takenCount / totalCount) * 100;

  const toggleTaken = (id: number) => {
    setMedicines((prev) => prev.map((m) => (m.id === id ? { ...m, taken: !m.taken } : m)));
  };

  const sections: { key: "morning" | "afternoon" | "night"; icon: React.ReactNode }[] = [
    { key: "morning", icon: <Sun size={20} /> },
    { key: "afternoon", icon: <CloudSun size={20} /> },
    { key: "night", icon: <Moon size={20} /> },
  ];

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-5 rounded-b-3xl">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xl font-bold">
              R
            </div>
            <div>
              <h1 className="text-lg font-bold">Rajesh Kumar</h1>
              <p className="text-primary-foreground/80 text-sm">{today}</p>
            </div>
          </div>
          <LanguageToggle />
        </div>

        {/* Progress */}
        <div className="mt-3">
          <div className="flex justify-between text-sm mb-2">
            <span>{takenCount} {t("of")} {totalCount} {t("medicines_taken")}</span>
            <span className="font-bold">{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full h-3 bg-primary-foreground/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-foreground rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Medicine Sections */}
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
                {sectionMeds.map((med) => (
                  <div
                    key={med.id}
                    className={`bg-card rounded-2xl p-4 border transition-all cursor-pointer ${
                      med.taken ? "border-success/30 bg-success/5" : "border-border"
                    }`}
                    onClick={() => navigate("/medicine-detail")}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-base font-bold text-foreground">{med.name}</h3>
                        <p className="text-muted-foreground text-sm">{med.dosage} · {med.food}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleTaken(med.id); }}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                          med.taken
                            ? "bg-success text-success-foreground"
                            : "bg-primary text-primary-foreground shadow-md hover:opacity-90"
                        }`}
                      >
                        {med.taken ? (
                          <span className="flex items-center gap-1"><Check size={16} /> {t("taken")}</span>
                        ) : t("mark_taken")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Daily Insights */}
      <DailyInsights />

      {/* Action Buttons */}
      <div className="px-4 mt-6 space-y-3">
        <button
          onClick={() => navigate("/scan")}
          className="w-full flex items-center justify-center gap-3 bg-card border-2 border-primary rounded-2xl py-4 text-base font-bold text-primary hover:bg-secondary transition-colors"
        >
          <ScanLine size={22} />
          Scan Prescription
        </button>
        <button
          onClick={() => navigate("/scan-tablet?mode=identify")}
          className="w-full flex items-center justify-center gap-3 bg-secondary rounded-2xl py-4 text-base font-bold text-secondary-foreground hover:bg-accent transition-colors"
        >
          <HelpCircle size={22} />
          What Is This Tablet?
        </button>
        <button
          onClick={() => navigate("/drug-interaction")}
          className="w-full flex items-center justify-center gap-3 bg-card border border-border rounded-2xl py-4 text-base font-bold text-foreground hover:bg-secondary transition-colors"
        >
          <FlaskConical size={22} className="text-warning" />
          Drug Interaction Checker
        </button>
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate("/add-medicine")}
        className="fixed bottom-24 right-5 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl flex items-center justify-center hover:opacity-90 transition-opacity z-40"
      >
        <Plus size={28} />
      </button>

      <BottomNav />
    </div>
  );
};

export default PatientDashboard;
