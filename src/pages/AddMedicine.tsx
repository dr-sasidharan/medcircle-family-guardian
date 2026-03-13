import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import LanguageToggle from "@/components/LanguageToggle";
import { ArrowLeft, Upload, ScanLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

const TIMING_OPTIONS = [
  { value: "morning", label: "☀️ Morning", color: "#f59e0b" },
  { value: "afternoon", label: "🌤️ Afternoon", color: "#3b82f6" },
  { value: "night", label: "🌙 Night", color: "#8b5cf6" },
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
        if (prev.length === 1) return prev; // Must have at least one
        return prev.filter((t) => t !== value);
      }
      return [...prev, value];
    });
  };

  const checkPlanLimit = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: meds } = await supabase.from("medicines").select("id").eq("is_active", true).eq("user_id", user.id);
    const { data: profiles } = await supabase.from("patient_profiles").select("id, plan").eq("user_id", user.id).limit(1);
    const profile = profiles?.[0];
    const plan = (profile as any)?.plan || "free";

    if (plan === "free" && (meds?.length || 0) >= 2) {
      navigate("/paywall", {
        state: { reason: "medicine_limit", patientProfileId: profile?.id },
        replace: true,
      });
    }
  }, [navigate]);

  useEffect(() => {
    checkPlanLimit();
  }, [checkPlanLimit]);

  const handleSave = async () => {
    if (!name.trim() || !dosage.trim()) {
      toast.error("Please fill medicine name and dosage");
      return;
    }

    if (selectedTimings.length === 0) {
      toast.error("Please select at least one timing");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Please sign in first"); return; }

    // Store timings as comma-separated string
    const timing = selectedTimings.sort((a, b) => {
      const order = ["morning", "afternoon", "night"];
      return order.indexOf(a) - order.indexOf(b);
    }).join(",");

    const { error } = await supabase.from("medicines").insert({
      name: name.trim(),
      dosage: dosage.trim(),
      timing,
      food_instruction: food,
      user_id: user.id,
    });

    if (error) {
      console.error("Medicine save error:", error);
      toast.error(`Failed to save medicine: ${error.message}`);
      return;
    }

    toast.success(`${name} added successfully!`);
    navigate("/patient");
  };

  return (
    <div className="min-h-screen bg-background page-transition">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="text-foreground p-1">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Add Medicine</h1>
        <LanguageToggle />
      </div>

      <div className="p-5 space-y-5 max-w-lg mx-auto">
        {/* Scan Tablet Strip Button */}
        <button
          onClick={() => navigate("/scan-tablet")}
          className="w-full flex items-center justify-center gap-3 bg-secondary border-2 border-primary/30 rounded-2xl py-4 text-base font-bold text-primary hover:bg-accent transition-colors"
        >
          <ScanLine size={22} />
          Scan Tablet Strip
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground font-medium">or enter manually</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Name */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Medicine Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g. Metformin" />
        </div>

        {/* Dosage */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Dosage</label>
          <input value={dosage} onChange={(e) => setDosage(e.target.value)}
            className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g. 500mg" />
        </div>

        {/* Frequency / Timing Multi-select */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-2 block">
            Frequency <span className="text-muted-foreground font-normal">(select all that apply)</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {TIMING_OPTIONS.map((opt) => {
              const isSelected = selectedTimings.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleTiming(opt.value)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all"
                  style={{
                    borderColor: isSelected ? opt.color : "var(--border)",
                    background: isSelected ? `${opt.color}10` : "transparent",
                    boxShadow: isSelected ? `0 0 12px ${opt.color}20` : "none",
                  }}
                >
                  <span className="text-2xl">{opt.label.split(" ")[0]}</span>
                  <span
                    className="text-xs font-bold"
                    style={{ color: isSelected ? opt.color : "var(--muted-foreground)" }}
                  >
                    {opt.label.split(" ")[1]}
                  </span>
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                    style={{
                      borderColor: isSelected ? opt.color : "var(--border)",
                      background: isSelected ? opt.color : "transparent",
                    }}
                  >
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

        {/* Food */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Food Instruction</label>
          <select value={food} onChange={(e) => setFood(e.target.value)}
            className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="before_food">Before Food</option>
            <option value="after_food">After Food</option>
            <option value="with_food">With Food</option>
          </select>
        </div>

        {/* Upload */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Upload Photo</label>
          <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 transition-colors cursor-pointer">
            <Upload size={32} />
            <p className="text-sm">Tap to upload</p>
          </div>
        </div>

        {/* Save */}
        <button onClick={handleSave}
          className="w-full bg-primary text-primary-foreground rounded-2xl py-4 text-lg font-bold shadow-lg hover:opacity-90 transition-opacity mt-4">
          Save
        </button>
      </div>
    </div>
  );
};

export default AddMedicine;
