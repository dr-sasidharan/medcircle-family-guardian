import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Camera, AlertTriangle, Check, Loader2, ShieldAlert, Upload } from "lucide-react";
import { toast } from "sonner";

interface ScannedMedicine {
  name: string;
  dosage: string;
  timing: string;
  purpose: string;
  foodInstruction: string;
  saved?: boolean;
}

interface Interaction {
  medicine1: string;
  medicine2: string;
  severity: "mild" | "dangerous";
  description: string;
}

const ScanPrescription = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [medicines, setMedicines] = useState<ScannedMedicine[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [hasResults, setHasResults] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setLoading(true);
    setHasResults(false);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("scan-prescription", {
        body: { imageBase64: base64 },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setMedicines((data.medicines || []).map((m: ScannedMedicine) => ({
        ...m,
        timing: (m.timing || "morning").toLowerCase().replace(/\s/g, ""),
        foodInstruction: (m.foodInstruction || "after_food").toLowerCase().replace(/\s/g, ""),
        saved: false,
      })));
      setInteractions(data.interactions || []);
      setHasResults(true);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to scan prescription");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (index: number) => {
    const med = medicines[index];
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in first");
        return;
      }

      const validTimings = ["morning", "afternoon", "night"];
      const validFood = ["before_food", "after_food", "with_food"];
      const timing = validTimings.includes(med.timing) ? med.timing : "morning";
      const foodInstruction = validFood.includes(med.foodInstruction) ? med.foodInstruction : "after_food";

      const { error } = await supabase.from("medicines").insert({
        name: med.name,
        dosage: med.dosage,
        timing,
        food_instruction: foodInstruction,
        purpose: med.purpose,
        user_id: user.id,
        is_active: true,
      });

      if (error) throw error;

      setMedicines((prev) =>
        prev.map((m, i) => (i === index ? { ...m, saved: true } : m))
      );
      toast.success(`${med.name} added to your medicine list!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save medicine");
    }
  };

  const dangerousInteractions = interactions.filter((i) => i.severity === "dangerous");
  const mildInteractions = interactions.filter((i) => i.severity === "mild");

  const foodLabels: Record<string, string> = {
    before_food: t("before_food"),
    after_food: t("after_food"),
    with_food: t("with_food"),
  };

  const timingLabels: Record<string, string> = {
    morning: t("morning"),
    afternoon: t("afternoon"),
    night: t("night"),
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={() => navigate("/patient")} className="text-foreground p-1">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-foreground">{t("scan")}</h1>
        <LanguageToggle />
      </div>

      <div className="px-4 mt-6 max-w-lg mx-auto">
        {/* Upload Area */}
        {!loading && !hasResults && (
          <div className="space-y-4">
            <p className="text-center text-lg font-bold text-foreground">Scan Prescription</p>
            <p className="text-sm text-muted-foreground text-center">
              Take a photo or upload an image of your prescription
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="border-2 border-dashed border-primary/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary hover:bg-secondary/50 transition-all"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera size={28} className="text-primary" />
                </div>
                <span className="text-sm font-bold text-foreground">Take Photo</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-primary/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary hover:bg-secondary/50 transition-all"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload size={28} className="text-primary" />
                </div>
                <span className="text-sm font-bold text-foreground">Upload Image</span>
              </button>
            </div>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            {previewUrl && (
              <img src={previewUrl} alt="Prescription" className="w-40 h-40 object-cover rounded-2xl border border-border mb-4" />
            )}
            <div className="relative">
              <Loader2 size={48} className="text-primary animate-spin" />
            </div>
            <p className="text-lg font-bold text-foreground">Reading your prescription...</p>
            <p className="text-sm text-muted-foreground">AI is analyzing the medicines</p>
          </div>
        )}

        {/* Results */}
        {hasResults && (
          <div className="space-y-4">
            {/* Dangerous Interaction Alert */}
            {dangerousInteractions.length > 0 && (
              <div className="bg-destructive/10 border-2 border-destructive/50 rounded-2xl p-4 pulse-alert">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="text-destructive" size={24} />
                  <h3 className="text-base font-extrabold text-destructive uppercase tracking-wide">
                    DRUG INTERACTION ALERT
                  </h3>
                </div>
                {dangerousInteractions.map((inter, i) => (
                  <p key={i} className="text-sm text-foreground mt-1">
                    <strong>{inter.medicine1}</strong> + <strong>{inter.medicine2}</strong>: {inter.description}
                  </p>
                ))}
              </div>
            )}

            {/* Mild Interaction Warnings */}
            {mildInteractions.map((inter, i) => (
              <div key={i} className="bg-warning/10 border border-warning/40 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="text-warning" size={18} />
                  <span className="text-sm font-bold text-foreground">Mild Interaction</span>
                </div>
                <p className="text-sm text-foreground">
                  <strong>{inter.medicine1}</strong> + <strong>{inter.medicine2}</strong>: {inter.description}
                </p>
              </div>
            ))}

            {/* Medicine Cards */}
            {medicines.map((med, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border p-5 space-y-3">
                <h3 className="text-xl font-extrabold text-foreground">{med.name}</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-secondary text-secondary-foreground px-3 py-1 rounded-lg text-sm font-semibold">
                    {med.dosage}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{med.purpose}</p>

                {/* Editable Timing */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Timing</label>
                  <div className="flex gap-2">
                    {(["morning", "afternoon", "night"] as const).map((time) => (
                      <button
                        key={time}
                        onClick={() => {
                          setMedicines((prev) =>
                            prev.map((m, idx) => (idx === i ? { ...m, timing: time } : m))
                          );
                        }}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                          med.timing === time
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-accent"
                        }`}
                      >
                        {time === "morning" ? "☀️" : time === "afternoon" ? "🌤️" : "🌙"} {timingLabels[time] || time}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Editable Food Instruction */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Food Instruction</label>
                  <div className="flex gap-2">
                    {(["before_food", "after_food", "with_food"] as const).map((food) => (
                      <button
                        key={food}
                        onClick={() => {
                          setMedicines((prev) =>
                            prev.map((m, idx) => (idx === i ? { ...m, foodInstruction: food } : m))
                          );
                        }}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                          med.foodInstruction === food
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-accent"
                        }`}
                      >
                        {foodLabels[food] || food}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleSave(i)}
                  disabled={med.saved}
                  className={`w-full py-3 rounded-xl text-base font-bold transition-all ${
                    med.saved
                      ? "bg-success/15 text-success"
                      : "bg-primary text-primary-foreground shadow-md hover:opacity-90"
                  }`}
                >
                  {med.saved ? (
                    <span className="flex items-center justify-center gap-2"><Check size={18} /> Saved</span>
                  ) : (
                    "Confirm & Save"
                  )}
                </button>
              </div>
            ))}

            {/* Scan Again */}
            <button
              onClick={() => {
                setHasResults(false);
                setMedicines([]);
                setInteractions([]);
                setPreviewUrl(null);
              }}
              className="w-full py-3 rounded-xl text-base font-semibold bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
            >
              Scan Another Prescription
            </button>

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground text-center px-4 py-3 bg-muted rounded-xl">
              ⚕️ For awareness only. Always consult your doctor before changing any medication.
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default ScanPrescription;
