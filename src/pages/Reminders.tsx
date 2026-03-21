import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import LanguageToggle from "@/components/LanguageToggle";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Check, Pill, AlertTriangle, ArrowLeft, Plus, Clock } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FOOD_LABELS: Record<string, string> = {
  before_food: "Before Food",
  after_food: "After Food",
  with_food: "With Food",
};

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

const MEDICINE_ICONS = ["💊", "🩹", "💉", "🧬", "🫀", "🧪"];
const ICON_COLORS = ["#0d9488", "#f59e0b", "#8b5cf6", "#3b82f6", "#f43f5e", "#10b981"];

const sectionConfig = {
  morning: { emoji: "☀️", label: "Morning", glowColor: "rgba(245,158,11,0.2)", iconColor: "#f59e0b" },
  afternoon: { emoji: "🌤️", label: "Afternoon", glowColor: "rgba(59,130,246,0.2)", iconColor: "#3b82f6" },
  night: { emoji: "🌙", label: "Night", glowColor: "rgba(139,92,246,0.2)", iconColor: "#8b5cf6" },
};

const Reminders = () => {
  const navigate = useNavigate();
  const [doses, setDoses] = useState<DoseWithMedicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [allMedicines, setAllMedicines] = useState<{ id: string; name: string; dosage: string }[]>([]);
  const [selectedMedicineId, setSelectedMedicineId] = useState("");
  const [selectedTiming, setSelectedTiming] = useState("");
  const [addingReminder, setAddingReminder] = useState(false);

  const fetchDoses = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("doses")
      .select("id, medicine_id, scheduled_time, taken, taken_at, missed, medicines(id, name, dosage, food_instruction, purpose, photo_url)")
      .eq("scheduled_date", today)
      .order("scheduled_time");

    if (error) { console.error("Error fetching doses:", error); return; }

    const mapped = (data || []).map((d: any) => ({
      id: d.id, medicine_id: d.medicine_id, scheduled_time: d.scheduled_time,
      taken: d.taken, taken_at: d.taken_at, missed: d.missed, medicine: d.medicines,
    }));
    setDoses(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDoses();
    const channel = supabase.channel("doses-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "doses" }, () => fetchDoses())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchDoses]);

  useEffect(() => {
    const fetchMedicines = async () => {
      const { data } = await supabase.from("medicines").select("id, name, dosage").eq("is_active", true);
      setAllMedicines(data || []);
    };
    fetchMedicines();
  }, []);

  const handleAddReminder = async () => {
    if (!selectedMedicineId || !selectedTiming) { toast.error("Please select a medicine and timing"); return; }
    setAddingReminder(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");
      const today = new Date().toISOString().split("T")[0];
      const { data: existing } = await supabase.from("doses").select("id")
        .eq("medicine_id", selectedMedicineId).eq("scheduled_date", today).eq("scheduled_time", selectedTiming).maybeSingle();
      if (existing) { toast.error("Reminder already exists for this medicine and timing today"); setAddingReminder(false); return; }
      await supabase.from("doses").insert({
        medicine_id: selectedMedicineId, user_id: user.id, scheduled_date: today,
        scheduled_time: selectedTiming, taken: false, missed: false,
      });
      toast.success("Reminder added! ⏰");
      setDialogOpen(false); setSelectedMedicineId(""); setSelectedTiming(""); fetchDoses();
    } catch { toast.error("Failed to add reminder"); }
    finally { setAddingReminder(false); }
  };

  const markAsTaken = async (doseId: string) => {
    setAnimatingId(doseId);
    const { error } = await supabase.from("doses")
      .update({ taken: true, taken_at: new Date().toISOString(), missed: false }).eq("id", doseId);
    if (error) { toast.error("Failed to update."); setAnimatingId(null); return; }
    setTimeout(() => { setAnimatingId(null); toast.success("Well done! Medicine taken. 💊"); fetchDoses(); }, 600);
  };

  const takenCount = doses.filter((d) => d.taken).length;
  const totalCount = doses.length;
  const progressPercent = totalCount > 0 ? (takenCount / totalCount) * 100 : 0;
  const missedDoses = doses.filter((d) => d.missed && !d.taken);
  const sections = [{ key: "morning" }, { key: "afternoon" }, { key: "night" }];

  return (
    <div className="min-h-screen pb-24 page-transition">
      {/* Header */}
      <div className="glass-header p-5 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-2 rounded-xl glass-pill hover:bg-white/10">
                <ArrowLeft size={18} className="text-white" />
              </button>
              <h1 className="text-xl font-heading font-bold text-white">Reminders</h1>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <button className="p-2 rounded-xl glass-pill hover:bg-white/10 flex items-center gap-1 text-sm font-medium text-white">
                    <Plus size={16} /> Add
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-sm glass-modal border-0">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-white">
                      <Clock size={18} className="text-[#34d399]" /> Add Reminder
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-sm font-medium text-glass-secondary mb-1.5 block">Medicine</label>
                      <Select value={selectedMedicineId} onValueChange={setSelectedMedicineId}>
                        <SelectTrigger className="glass-input"><SelectValue placeholder="Select medicine" /></SelectTrigger>
                        <SelectContent>
                          {allMedicines.map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.name} ({m.dosage})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-glass-secondary mb-1.5 block">Timing</label>
                      <Select value={selectedTiming} onValueChange={setSelectedTiming}>
                        <SelectTrigger className="glass-input"><SelectValue placeholder="Select timing" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="morning">☀️ Morning</SelectItem>
                          <SelectItem value="afternoon">🌤️ Afternoon</SelectItem>
                          <SelectItem value="night">🌙 Night</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddReminder} disabled={addingReminder || !selectedMedicineId || !selectedTiming}
                      className="w-full" style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}>
                      {addingReminder ? "Adding..." : "Add Reminder"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <LanguageToggle />
            </div>
          </div>

          {/* Progress glass card */}
          <div className="glass-card p-4 mt-2">
            <div className="flex justify-between items-baseline mb-2">
              <span className="font-heading font-extrabold text-2xl text-white">
                {takenCount}<span className="text-white/50 text-base font-normal">/{totalCount}</span>
              </span>
              <span className="font-heading font-bold text-[#34d399]">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full animate-progress-fill"
                style={{
                  background: "linear-gradient(90deg, white, #0d9488, #10b981)",
                  boxShadow: "0 0 12px rgba(52,211,153,0.6)",
                  "--progress-width": `${progressPercent}%`,
                  width: `${progressPercent}%`,
                } as React.CSSProperties} />
            </div>
            <p className="text-glass-muted text-xs mt-2">Medicines Taken today</p>
          </div>
        </div>
      </div>

      {/* Missed Dose Alerts */}
      {missedDoses.length > 0 && (
        <div className="px-4 mt-4 space-y-2">
          {missedDoses.map((dose) => (
            <div key={dose.id} className="glass-card p-3.5 flex items-center gap-3 pulse-alert"
              style={{ boxShadow: "inset 3px 0 0 #f43f5e, 0 8px 32px rgba(0,0,0,0.3)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(244,63,94,0.2)" }}>
                <AlertTriangle size={18} className="text-[#f43f5e]" />
              </div>
              <span className="text-white font-heading font-bold text-sm">
                Missed: {dose.medicine.name} ({dose.scheduled_time})
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#34d399]" />
        </div>
      )}

      {/* Medicine Sections */}
      {!loading && (
        <div className="px-4 mt-6 space-y-6">
          {sections.map((section) => {
            const config = sectionConfig[section.key as keyof typeof sectionConfig];
            const sectionDoses = doses.filter((d) => d.scheduled_time === section.key);
            if (sectionDoses.length === 0) return null;
            return (
              <div key={section.key}>
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
                  <span className="text-xs text-glass-muted font-semibold">
                    {sectionDoses.filter((d) => d.taken).length}/{sectionDoses.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {sectionDoses.map((dose, idx) => {
                    const isAnimating = animatingId === dose.id;
                    const iconIdx = idx % MEDICINE_ICONS.length;

                    return (
                      <div key={dose.id}
                        className="glass-card p-4 flex items-center gap-3 animate-slide-up"
                        style={{
                          borderLeft: `4px solid ${dose.taken ? "#10b981" : dose.missed ? "#f43f5e" : "#f59e0b"}`,
                          background: dose.taken ? "rgba(16,185,129,0.13)" : dose.missed ? "rgba(244,63,94,0.08)" : "rgba(255,255,255,0.08)",
                          animationDelay: `${idx * 80}ms`,
                        }}
                      >
                        <div className="w-[46px] h-[46px] flex items-center justify-center flex-shrink-0 text-xl overflow-hidden rounded-[14px]"
                          style={{ background: "rgba(255,255,255,0.12)" }}>
                          {dose.medicine.photo_url ? (
                            <img src={dose.medicine.photo_url} alt={dose.medicine.name} className="w-full h-full object-cover" />
                          ) : MEDICINE_ICONS[iconIdx]}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading font-bold text-[15px] text-white truncate">{dose.medicine.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-glass-muted text-xs">{dose.medicine.dosage}</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full glass-pill"
                              style={{ color: dose.medicine.food_instruction === "before_food" ? "#0d9488" : dose.medicine.food_instruction === "after_food" ? "#f59e0b" : "#3b82f6" }}>
                              {FOOD_LABELS[dose.medicine.food_instruction] || dose.medicine.food_instruction}
                            </span>
                          </div>
                        </div>

                        <div className="flex-shrink-0">
                          {dose.taken ? (
                            <div className="px-3 py-2 rounded-xl text-xs font-heading font-bold text-white flex items-center gap-1 pulse-green"
                              style={{ background: "#10b981", boxShadow: "0 0 16px rgba(16,185,129,0.4)" }}>
                              <Check size={14} /> Taken
                            </div>
                          ) : isAnimating ? (
                            <div className="px-3 py-2 rounded-xl text-xs font-heading font-bold text-white flex items-center gap-1 animate-scale-in"
                              style={{ background: "#10b981", boxShadow: "0 0 16px rgba(16,185,129,0.4)" }}>
                              <Check size={14} /> ✓
                            </div>
                          ) : dose.missed ? (
                            <button onClick={() => markAsTaken(dose.id)}
                              className="px-3 py-2 rounded-xl text-xs font-heading font-bold text-white"
                              style={{ background: "#f43f5e" }}>
                              Take Now
                            </button>
                          ) : (
                            <button onClick={() => markAsTaken(dose.id)}
                              className="px-3 py-2 rounded-xl text-xs font-heading font-bold text-white glass-pill hover:bg-white/15"
                              style={{ borderColor: "rgba(245,158,11,0.4)" }}>
                              Mark Taken
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {doses.length === 0 && !loading && (
            <div className="text-center py-16 animate-fade-in">
              <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(255,255,255,0.08)" }}>
                <Pill size={40} className="text-[#34d399]" />
              </div>
              <p className="text-lg font-heading font-bold text-white">No medicines scheduled</p>
              <p className="text-sm text-glass-secondary mt-1">Add medicines to see reminders here</p>
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Reminders;
