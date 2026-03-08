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
  morning: { emoji: "☀️", label: "Morning", pillBg: "bg-[#fef3c7]", iconBg: "bg-[#f59e0b]", text: "text-[#92400e]", line: "bg-[#fcd34d]" },
  afternoon: { emoji: "🌤️", label: "Afternoon", pillBg: "bg-[#dbeafe]", iconBg: "bg-[#3b82f6]", text: "text-[#1e3a5f]", line: "bg-[#93c5fd]" },
  night: { emoji: "🌙", label: "Night", pillBg: "bg-[#ede9fe]", iconBg: "bg-[#8b5cf6]", text: "text-[#4c1d95]", line: "bg-[#c4b5fd]" },
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
    const channel = supabase
      .channel("doses-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "doses" }, () => {
        fetchDoses();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchDoses]);

  // Fetch all active medicines for the add reminder dialog
  useEffect(() => {
    const fetchMedicines = async () => {
      const { data } = await supabase
        .from("medicines")
        .select("id, name, dosage")
        .eq("is_active", true);
      setAllMedicines(data || []);
    };
    fetchMedicines();
  }, []);

  const handleAddReminder = async () => {
    if (!selectedMedicineId || !selectedTiming) {
      toast.error("Please select a medicine and timing");
      return;
    }
    setAddingReminder(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const today = new Date().toISOString().split("T")[0];

      // Check if dose already exists
      const { data: existing } = await supabase
        .from("doses")
        .select("id")
        .eq("medicine_id", selectedMedicineId)
        .eq("scheduled_date", today)
        .eq("scheduled_time", selectedTiming)
        .maybeSingle();

      if (existing) {
        toast.error("Reminder already exists for this medicine and timing today");
        setAddingReminder(false);
        return;
      }

      await supabase.from("doses").insert({
        medicine_id: selectedMedicineId,
        user_id: user.id,
        scheduled_date: today,
        scheduled_time: selectedTiming,
        taken: false,
        missed: false,
      });

      toast.success("Reminder added! ⏰");
      setDialogOpen(false);
      setSelectedMedicineId("");
      setSelectedTiming("");
      fetchDoses();
    } catch (err) {
      toast.error("Failed to add reminder");
    } finally {
      setAddingReminder(false);
    }
  };

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

  const sections = [
    { key: "morning" },
    { key: "afternoon" },
    { key: "night" },
  ];

  return (
    <div className="min-h-screen bg-surface pb-24 page-transition">
      {/* Header */}
      <div
        className="text-white p-5 rounded-b-[28px] relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f766e 0%, #134e4a 60%, #0c3532 100%)" }}
      >
        <div className="absolute top-[-40px] right-[-40px] w-[140px] h-[140px] rounded-full bg-white/5 animate-float" />
        <div className="absolute bottom-[-20px] left-[-20px] w-[100px] h-[100px] rounded-full bg-white/5 animate-float" style={{ animationDelay: "3s" }} />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20">
                <ArrowLeft size={18} />
              </button>
              <h1 className="text-xl font-heading font-bold">Reminders</h1>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <button className="p-2 rounded-xl bg-white/10 hover:bg-white/20 flex items-center gap-1 text-sm font-medium">
                    <Plus size={16} /> Add
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Clock size={18} className="text-primary" /> Add Reminder
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">Medicine</label>
                      <Select value={selectedMedicineId} onValueChange={setSelectedMedicineId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select medicine" />
                        </SelectTrigger>
                        <SelectContent>
                          {allMedicines.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name} ({m.dosage})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">Timing</label>
                      <Select value={selectedTiming} onValueChange={setSelectedTiming}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timing" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="morning">☀️ Morning</SelectItem>
                          <SelectItem value="afternoon">🌤️ Afternoon</SelectItem>
                          <SelectItem value="night">🌙 Night</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleAddReminder}
                      disabled={addingReminder || !selectedMedicineId || !selectedTiming}
                      className="w-full"
                    >
                      {addingReminder ? "Adding..." : "Add Reminder"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <LanguageToggle />
            </div>
          </div>
          {/* Progress glass card */}
          <div className="glass-card rounded-2xl p-4 mt-2">
            <div className="flex justify-between items-baseline mb-2">
              <span className="font-heading font-extrabold text-2xl">
                {takenCount}<span className="text-white/50 text-base font-normal">/{totalCount}</span>
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
            <p className="text-white/50 text-xs mt-2">Medicines Taken today</p>
          </div>
        </div>
      </div>

      {/* Missed Dose Alerts */}
      {missedDoses.length > 0 && (
        <div className="px-4 mt-4 space-y-2">
          {missedDoses.map((dose) => (
            <div
              key={dose.id}
              className="border rounded-2xl p-3.5 flex items-center gap-3 pulse-alert"
              style={{ background: "linear-gradient(135deg, #fff1f2, #ffe4e6)", borderColor: "#fda4af" }}
            >
              <div className="w-9 h-9 rounded-xl bg-[#fda4af]/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-[#e11d48]" />
              </div>
              <span className="text-[#9f1239] font-heading font-bold text-sm">
                Missed: {dose.medicine.name} ({dose.scheduled_time})
              </span>
            </div>
          ))}
        </div>
      )}

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
            const config = sectionConfig[section.key as keyof typeof sectionConfig];
            const sectionDoses = doses.filter((d) => d.scheduled_time === section.key);
            if (sectionDoses.length === 0) return null;
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
                  <span className="text-xs text-muted-foreground font-semibold">
                    {sectionDoses.filter((d) => d.taken).length}/{sectionDoses.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {sectionDoses.map((dose, idx) => {
                    const isAnimating = animatingId === dose.id;
                    const iconIdx = idx % MEDICINE_ICONS.length;
                    const colorIdx = idx % ICON_COLORS.length;

                    return (
                      <div
                        key={dose.id}
                        className="bg-card rounded-[18px] p-4 flex items-center gap-3 animate-slide-up"
                        style={{
                          borderLeft: `4px solid ${dose.taken ? "#10b981" : dose.missed ? "#f43f5e" : "#f59e0b"}`,
                          background: dose.taken ? "#ecfdf5" : dose.missed ? "#fff1f2" : "white",
                          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                          animationDelay: `${idx * 80}ms`,
                        }}
                      >
                        {/* Icon */}
                        <div
                          className="w-[46px] h-[46px] flex items-center justify-center flex-shrink-0 text-xl overflow-hidden"
                          style={{ background: `${ICON_COLORS[colorIdx]}15`, borderRadius: "14px" }}
                        >
                          {dose.medicine.photo_url ? (
                            <img src={dose.medicine.photo_url} alt={dose.medicine.name} className="w-full h-full object-cover" />
                          ) : (
                            MEDICINE_ICONS[iconIdx]
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading font-bold text-[15px] text-ink truncate">{dose.medicine.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-muted-foreground text-xs">{dose.medicine.dosage}</span>
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                background: dose.medicine.food_instruction === "before_food" ? "#ccfbf1" : dose.medicine.food_instruction === "after_food" ? "#fef3c7" : "#dbeafe",
                                color: dose.medicine.food_instruction === "before_food" ? "#0d9488" : dose.medicine.food_instruction === "after_food" ? "#b45309" : "#1e40af",
                              }}
                            >
                              {FOOD_LABELS[dose.medicine.food_instruction] || dose.medicine.food_instruction}
                            </span>
                          </div>
                        </div>

                        {/* Action */}
                        <div className="flex-shrink-0">
                          {dose.taken ? (
                            <div className="px-3 py-2 rounded-xl text-xs font-heading font-bold text-white bg-emerald glow-emerald flex items-center gap-1">
                              <Check size={14} /> Taken
                            </div>
                          ) : isAnimating ? (
                            <div className="px-3 py-2 rounded-xl text-xs font-heading font-bold text-white bg-emerald glow-emerald flex items-center gap-1 animate-scale-in">
                              <Check size={14} /> ✓
                            </div>
                          ) : dose.missed ? (
                            <button
                              onClick={() => markAsTaken(dose.id)}
                              className="px-3 py-2 rounded-xl text-xs font-heading font-bold text-white bg-coral"
                            >
                              Take Now
                            </button>
                          ) : (
                            <button
                              onClick={() => markAsTaken(dose.id)}
                              className="px-3 py-2 rounded-xl text-xs font-heading font-bold text-amber border-2 border-amber/30 bg-white hover:bg-amber/5"
                            >
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
              <div className="w-20 h-20 mx-auto bg-secondary rounded-full flex items-center justify-center mb-4">
                <Pill size={40} className="text-primary" />
              </div>
              <p className="text-lg font-heading font-bold text-foreground">No medicines scheduled</p>
              <p className="text-sm text-muted-foreground mt-1">Add medicines to see reminders here</p>
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Reminders;