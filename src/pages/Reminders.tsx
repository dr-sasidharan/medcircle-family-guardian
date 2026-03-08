import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Sun, CloudSun, Moon, Check, Pill, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface DoseWithMedicine {
  id: string;
  medicine_id: string;
  scheduled_time: string;
  taken: boolean;
  taken_at: string | null;
  missed: boolean;
  medicine: {
    id: string;
    name: string;
    dosage: string;
    food_instruction: string;
    purpose: string | null;
    photo_url: string | null;
  };
}

const Reminders = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [doses, setDoses] = useState<DoseWithMedicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [animatingId, setAnimatingId] = useState<string | null>(null);

  const fetchDoses = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("doses")
      .select("id, medicine_id, scheduled_time, taken, taken_at, missed, medicines(id, name, dosage, food_instruction, purpose, photo_url)")
      .eq("scheduled_date", today)
      .order("scheduled_time");

    if (error) {
      console.error("Error fetching doses:", error);
      return;
    }

    const mapped = (data || []).map((d: any) => ({
      id: d.id,
      medicine_id: d.medicine_id,
      scheduled_time: d.scheduled_time,
      taken: d.taken,
      taken_at: d.taken_at,
      missed: d.missed,
      medicine: d.medicines,
    }));
    setDoses(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDoses();

    // Subscribe to realtime changes on doses
    const channel = supabase
      .channel("doses-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "doses" }, () => {
        fetchDoses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDoses]);

  const markAsTaken = async (doseId: string) => {
    setAnimatingId(doseId);

    const { error } = await supabase
      .from("doses")
      .update({ taken: true, taken_at: new Date().toISOString(), missed: false })
      .eq("id", doseId);

    if (error) {
      console.error("Error marking dose:", error);
      toast.error("Failed to update. Please try again.");
      setAnimatingId(null);
      return;
    }

    // Show success after brief animation
    setTimeout(() => {
      setAnimatingId(null);
      toast.success("Well done! Medicine taken. 💊");
      fetchDoses();
    }, 600);
  };

  const takenCount = doses.filter((d) => d.taken).length;
  const totalCount = doses.length;
  const progressPercent = totalCount > 0 ? (takenCount / totalCount) * 100 : 0;
  const missedDoses = doses.filter((d) => d.missed && !d.taken);

  const sections: { key: string; icon: React.ReactNode }[] = [
    { key: "morning", icon: <Sun size={20} /> },
    { key: "afternoon", icon: <CloudSun size={20} /> },
    { key: "night", icon: <Moon size={20} /> },
  ];

  const foodBadge = (instruction: string) => {
    if (instruction === "before_food") {
      return <span className="bg-destructive/15 text-destructive px-2.5 py-1 rounded-lg text-xs font-bold">{t("before_food")}</span>;
    }
    if (instruction === "after_food") {
      return <span className="bg-success/15 text-success px-2.5 py-1 rounded-lg text-xs font-bold">{t("after_food")}</span>;
    }
    return <span className="bg-warning/15 text-warning px-2.5 py-1 rounded-lg text-xs font-bold">{t("with_food")}</span>;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h1 className="text-lg font-bold text-foreground">Reminders</h1>
        <LanguageToggle />
      </div>

      {/* Missed Dose Alerts */}
      {missedDoses.length > 0 && (
        <div className="px-4 mt-4 space-y-2">
          {missedDoses.map((dose) => (
            <div key={dose.id} className="bg-destructive/10 border border-destructive/30 rounded-2xl p-3.5 flex items-center gap-3 pulse-alert">
              <AlertTriangle className="text-destructive flex-shrink-0" size={20} />
              <span className="text-destructive font-bold text-sm">
                You missed your {dose.medicine.name} ({dose.scheduled_time})
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Today's Summary */}
      <div className="px-4 mt-4">
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold text-foreground">Today's Summary</h2>
            <span className="text-sm font-semibold text-primary">{Math.round(progressPercent)}%</span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Taken: {takenCount} {t("of")} {totalCount} {t("medicines_taken")}
          </p>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progressPercent}%`,
                background:
                  progressPercent >= 80
                    ? "hsl(var(--success))"
                    : progressPercent >= 50
                    ? "hsl(var(--warning))"
                    : "hsl(var(--destructive))",
              }}
            />
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {/* Medicine Sections */}
      {!loading && (
        <div className="px-4 mt-6 space-y-6">
          {sections.map((section) => {
            const sectionDoses = doses.filter((d) => d.scheduled_time === section.key);
            if (sectionDoses.length === 0) return null;
            return (
              <div key={section.key}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-primary">{section.icon}</span>
                  <h2 className="text-lg font-bold text-foreground">{t(section.key)}</h2>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {sectionDoses.filter((d) => d.taken).length}/{sectionDoses.length} taken
                  </span>
                </div>
                <div className="space-y-3">
                  {sectionDoses.map((dose) => {
                    const isAnimating = animatingId === dose.id;
                    return (
                      <div
                        key={dose.id}
                        className={`bg-card rounded-2xl p-4 border transition-all ${
                          dose.taken ? "border-success/30 bg-success/5" : dose.missed ? "border-destructive/30 bg-destructive/5" : "border-border"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Tablet Icon / Photo */}
                          <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {dose.medicine.photo_url ? (
                              <img src={dose.medicine.photo_url} alt={dose.medicine.name} className="w-full h-full object-cover" />
                            ) : (
                              <Pill size={28} className="text-primary" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-extrabold text-foreground truncate">{dose.medicine.name}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-sm text-muted-foreground">{dose.medicine.dosage}</span>
                              {foodBadge(dose.medicine.food_instruction)}
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="flex-shrink-0">
                            {dose.taken ? (
                              <div className="w-12 h-12 rounded-xl bg-success/15 flex items-center justify-center">
                                <Check size={24} className="text-success" />
                              </div>
                            ) : isAnimating ? (
                              <div className="w-12 h-12 rounded-xl bg-success flex items-center justify-center animate-scale-in">
                                <Check size={24} className="text-success-foreground" />
                              </div>
                            ) : (
                              <button
                                onClick={() => markAsTaken(dose.id)}
                                className="bg-primary text-primary-foreground px-4 py-3 rounded-xl text-sm font-bold shadow-md hover:opacity-90 transition-opacity"
                              >
                                {t("mark_taken")}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {doses.length === 0 && !loading && (
            <div className="text-center py-16">
              <Pill size={48} className="text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold text-foreground">No medicines scheduled</p>
              <p className="text-sm text-muted-foreground">Add medicines to see reminders here</p>
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Reminders;
