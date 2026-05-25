import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LanguageToggle from "@/components/LanguageToggle";
import { ArrowLeft, Upload, ScanLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

const TIMING_OPTIONS = [
  { value: "morning", label: "☀️ Morning", color: "hsl(var(--warning))" },
  { value: "afternoon", label: "🌤️ Afternoon", color: "hsl(217, 91%, 60%)" },
  { value: "night", label: "🌙 Night", color: "hsl(258, 90%, 66%)" },
];

const AddMedicine = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [selectedTimings, setSelectedTimings] = useState<string[]>(["morning"]);
  const [food, setFood] = useState("after_food");

  const toggleTiming = (value: string) => {
    setSelectedTimings((prev) => {
      if (prev.includes(value)) {
        if (prev.length === 1) return prev;
        return prev.filter((t) => t !== value);
      }
      return [...prev, value];
    });
  };

  // Plan limits removed — all features available to all users

  const handleSave = async () => {
    if (!name.trim() || !dosage.trim()) { toast.error("Please fill medicine name and dosage"); return; }
    if (selectedTimings.length === 0) { toast.error("Please select at least one timing"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Please sign in first"); return; }
    const timing = selectedTimings.sort((a, b) => {
      const order = ["morning", "afternoon", "night"];
      return order.indexOf(a) - order.indexOf(b);
    }).join(",");
    const { error } = await supabase.from("medicines").insert({ name: name.trim(), dosage: dosage.trim(), timing, food_instruction: food, user_id: user.id });
    if (error) { console.error("Medicine save error:", error); toast.error(`Failed to save medicine: ${error.message}`); return; }
    toast.success(`${name} added successfully!`);
    navigate("/patient");
  };

  return (
    <div className="min-h-screen bg-background page-transition">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="text-foreground p-1"><ArrowLeft size={24} /></button>
        <h1 className="text-lg font-bold text-foreground">Add Medicine</h1>
        <LanguageToggle />
      </div>

      <div className="p-5 space-y-5 max-w-lg mx-auto">
        <button onClick={() => navigate("/scan-tablet")}
          className="w-full flex items-center justify-center gap-3 bg-card border-2 border-primary/30 rounded-2xl py-4 text-base font-bold text-primary hover:bg-primary/5 shadow-sm">
          <ScanLine size={22} /> Scan Tablet Strip
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground font-medium">or enter manually</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Medicine Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g. Metformin" />
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Dosage</label>
          <input value={dosage} onChange={(e) => setDosage(e.target.value)}
            className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g. 500mg" />
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground mb-2 block">
            Frequency <span className="text-muted-foreground font-normal">(select all that apply)</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {TIMING_OPTIONS.map((opt) => {
              const isSelected = selectedTimings.includes(opt.value);
              return (
                <button key={opt.value} type="button" onClick={() => toggleTiming(opt.value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all border-2 ${
                    isSelected ? "bg-primary/5 border-primary shadow-sm" : "bg-card border-border hover:border-primary/30"
                  }`}>
                  <span className="text-2xl">{opt.label.split(" ")[0]}</span>
                  <span className={`text-xs font-bold ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                    {opt.label.split(" ")[1]}
                  </span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected ? "border-primary bg-primary" : "border-border"
                  }`}>
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {selectedTimings.length > 1 && (
            <p className="text-xs text-primary font-medium mt-2 text-center">
              💊 {selectedTimings.length}x daily — {selectedTimings.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(", ")}
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Food Instruction</label>
          <select value={food} onChange={(e) => setFood(e.target.value)}
            className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="before_food">Before Food</option>
            <option value="after_food">After Food</option>
            <option value="with_food">With Food</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Upload Photo</label>
          <div className="bg-card border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground cursor-pointer hover:bg-muted">
            <Upload size={32} />
            <p className="text-sm">Tap to upload</p>
          </div>
        </div>

        <button onClick={handleSave}
          className="w-full bg-primary text-primary-foreground rounded-2xl py-4 text-lg font-bold shadow-lg hover:opacity-90 transition-opacity mt-4">
          Save
        </button>
      </div>
    </div>
  );
};

export default AddMedicine;
