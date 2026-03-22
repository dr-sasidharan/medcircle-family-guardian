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

const FOOD_LABELS: Record<string, string> = { before_food: "Before Food", after_food: "After Food", with_food: "With Food" };

interface DoseWithMedicine {
  id: string; medicine_id: string; scheduled_time: string; taken: boolean; taken_at: string | null; missed: boolean;
  medicine: { id: string; name: string; dosage: string; food_instruction: string; purpose: string | null; photo_url: string | null; };
}

const MEDICINE_ICONS = ["💊", "🩹", "💉", "🧬", "🫀", "🧪"];

const sectionConfig = {
  morning: { emoji: "☀️", label: "Morning" },
  afternoon: { emoji: "🌤️", label: "Afternoon" },
  night: { emoji: "🌙", label: "Night" },
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
    const { data, error } = await supabase.from("doses")
      .select("id, medicine_id, scheduled_time, taken, taken_at, missed, medicines(id, name, dosage, food_instruction, purpose, photo_url)")
      .eq("scheduled_date", today).order("scheduled_time");
    if (error) { console.error("Error fetching doses:", error); return; }
    const mapped = (data || []).map((d: any) => ({ id: d.id, medicine_id: d.medicine_id, scheduled_time: d.scheduled_time, taken: d.taken, taken_at: d.taken_at, missed: d.missed, medicine: d.medicines }));
    setDoses(mapped); setLoading(false);
  }, []);

  useEffect(() => {
    fetchDoses();
    const channel = supabase.channel("doses-realtime").on("postgres_changes", { event: "*", schema: "public", table: "doses" }, () => fetchDoses()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchDoses]);

  useEffect(() => {
    const fetchMedicines = async () => { const { data } = await supabase.from("medicines").select("id, name, dosage").eq("is_active", true); setAllMedicines(data || []); };
    fetchMedicines();
  }, []);

  const handleAddReminder = async () => {
    if (!selectedMedicineId || !selectedTiming) { toast.error("Please select a medicine and timing"); return; }
    setAddingReminder(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");
      const today = new Date().toISOString().split("T")[0];
      const { data: existing } = await supabase.from("doses").select("id").eq("medicine_id", selectedMedicineId).eq("scheduled_date", today).eq("scheduled_time", selectedTiming).maybeSingle();
      if (existing) { toast.error("Reminder already exists for this medicine and timing today"); setAddingReminder(false); return; }
      await supabase.from("doses").insert({ medicine_id: selectedMedicineId, user_id: user.id, scheduled_date: today, scheduled_time: selectedTiming, taken: false, missed: false });
      toast.success("Reminder added! ⏰");
      setDialogOpen(false); setSelectedMedicineId(""); setSelectedTiming(""); fetchDoses();
    } catch { toast.error("Failed to add reminder"); } finally { setAddingReminder(false); }
  };

  const markAsTaken = async (doseId: string) => {
    setAnimatingId(doseId);
    const { error } = await supabase.from("doses").update({ taken: true, taken_at: new Date().toISOString(), missed: false }).eq("id", doseId);
    if (error) { toast.error("Failed to update."); setAnimatingId(null); return; }
    setTimeout(() => { setAnimatingId(null); toast.success("Well done! Medicine taken. 💊"); fetchDoses(); }, 600);
  };

  const takenCount = doses.filter((d) => d.taken).length;
  const totalCount = doses.length;
  const progressPercent = totalCount > 0 ? (takenCount / totalCount) * 100 : 0;
  const missedDoses = doses.filter((d) => d.missed && !d.taken);
  const sections = [{ key: "morning" }, { key: "afternoon" }, { key: "night" }];

  return (
    <div className="min-h-screen bg-background pb-24 page-transition">
      <div className="bg-primary text-primary-foreground p-5 relative overflow-hidden">
        <div className="absolute top-[-40px] right-[-40px] w-[140px] h-[140px] rounded-full bg-white/5" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20"><ArrowLeft size={18} /></button>
              <h1 className="text-xl font-bold text-white">Reminders</h1>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <button className="p-2 rounded-xl bg-white/10 hover:bg-white/20 flex items-center gap-1 text-sm font-medium text-white"><Plus size={16} /> Add</button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader><DialogTitle className="flex items-center gap-2"><Clock size={18} className="text-primary" /> Add Reminder</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">Medicine</label>
                      <Select value={selectedMedicineId} onValueChange={setSelectedMedicineId}>
                        <SelectTrigger><SelectValue placeholder="Select medicine" /></SelectTrigger>
                        <SelectContent>{allMedicines.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name} ({m.dosage})</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">Timing</label>
                      <Select value={selectedTiming} onValueChange={setSelectedTiming}>
                        <SelectTrigger><SelectValue placeholder="Select timing" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="morning">☀️ Morning</SelectItem>
                          <SelectItem value="afternoon">🌤️ Afternoon</SelectItem>
                          <SelectItem value="night">🌙 Night</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddReminder} disabled={addingReminder || !selectedMedicineId || !selectedTiming} className="w-full">
                      {addingReminder ? "Adding..." : "Add Reminder"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <LanguageToggle />
            </div>
          </div>

          <div className="bg-white/10 rounded-2xl p-4 mt-2">
            <div className="flex justify-between items-baseline mb-2">
              <span className="font-bold text-2xl text-white">{takenCount}<span className="text-white/50 text-base font-normal">/{totalCount}</span></span>
              <span className="font-bold text-emerald-300">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-emerald-400 animate-progress-fill"
                style={{ "--progress-width": `${progressPercent}%`, width: `${progressPercent}%` } as React.CSSProperties} />
            </div>
            <p className="text-white/50 text-xs mt-2">Medicines Taken today</p>
          </div>
        </div>
      </div>

      {missedDoses.length > 0 && (
        <div className="px-4 mt-4 space-y-2">
          {missedDoses.map((dose) => (
            <div key={dose.id} className="bg-destructive/10 border border-destructive/30 rounded-2xl p-3.5 flex items-center gap-3 pulse-alert">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-destructive/20 flex-shrink-0"><AlertTriangle size={18} className="text-destructive" /></div>
              <span className="text-foreground font-bold text-sm">Missed: {dose.medicine.name} ({dose.scheduled_time})</span>
            </div>
          ))}
        </div>
      )}

      {loading && <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}

      {!loading && (
        <div className="px-4 mt-6 space-y-6">
          {sections.map((section) => {
            const config = sectionConfig[section.key as keyof typeof sectionConfig];
            const sectionDoses = doses.filter((d) => d.scheduled_time === section.key);
            if (sectionDoses.length === 0) return null;
            return (
              <div key={section.key}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1.5 shadow-sm flex-shrink-0">
                    <span className="text-sm">{config.emoji}</span>
                    <span className="font-bold text-sm text-foreground">{config.label}</span>
                  </div>
                  <div className="flex-1 h-[1px] bg-border rounded-full" />
                  <span className="text-xs text-muted-foreground font-semibold">{sectionDoses.filter((d) => d.taken).length}/{sectionDoses.length}</span>
                </div>
                <div className="space-y-3">
                  {sectionDoses.map((dose, idx) => {
                    const isAnimating = animatingId === dose.id;
                    const iconIdx = idx % MEDICINE_ICONS.length;
                    return (
                      <div key={dose.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-sm animate-slide-up hover:shadow-md transition-shadow"
                        style={{
                          borderLeftWidth: "4px",
                          borderLeftColor: dose.taken ? "hsl(var(--success))" : dose.missed ? "hsl(var(--destructive))" : "hsl(var(--warning))",
                          animationDelay: `${idx * 80}ms`,
                        }}>
                        <div className="w-[46px] h-[46px] flex items-center justify-center flex-shrink-0 text-xl overflow-hidden rounded-[14px] bg-muted">
                          {dose.medicine.photo_url ? <img src={dose.medicine.photo_url} alt={dose.medicine.name} className="w-full h-full object-cover" /> : MEDICINE_ICONS[iconIdx]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[15px] text-foreground truncate">{dose.medicine.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-muted-foreground text-xs">{dose.medicine.dosage}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              dose.medicine.food_instruction === "before_food" ? "bg-primary/10 text-primary" : dose.medicine.food_instruction === "after_food" ? "bg-warning/10 text-warning" : "bg-blue-100 text-blue-600"
                            }`}>{FOOD_LABELS[dose.medicine.food_instruction] || dose.medicine.food_instruction}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {dose.taken ? (
                            <div className="px-3 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1 bg-success pulse-green"><Check size={14} /> Taken</div>
                          ) : isAnimating ? (
                            <div className="px-3 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1 bg-success animate-scale-in"><Check size={14} /> ✓</div>
                          ) : dose.missed ? (
                            <button onClick={() => markAsTaken(dose.id)} className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-destructive">Take Now</button>
                          ) : (
                            <button onClick={() => markAsTaken(dose.id)} className="px-3 py-2 rounded-xl text-xs font-bold text-foreground border border-warning/40 bg-card hover:bg-muted">Mark Taken</button>
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
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4"><Pill size={40} className="text-primary" /></div>
              <p className="text-lg font-bold text-foreground">No medicines scheduled</p>
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
