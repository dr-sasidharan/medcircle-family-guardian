import { useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Camera, Loader2, Pill, Package, ShieldCheck, ShieldX, Thermometer, Check } from "lucide-react";
import { toast } from "sonner";

interface TabletResult {
  name: string;
  dosage: string;
  manufacturer: string;
  expiryDate: string;
  isExpired: boolean;
  purpose_en: string;
  purpose_ta: string;
  expiry_explanation_en: string;
  expiry_explanation_ta: string;
  storage: string;
  category: string;
}

const ScanTablet = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isIdentifyMode = searchParams.get("mode") === "identify";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TabletResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [selectedTiming, setSelectedTiming] = useState("morning");
  const [selectedFood, setSelectedFood] = useState("after_food");

  const handleUpload = async (file: File) => {
    setLoading(true);
    setResult(null);
    setSaved(false);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const r = reader.result as string;
          resolve(r.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("scan-tablet", {
        body: { imageBase64: base64 },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setResult(data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to identify tablet");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in first");
        return;
      }

      const { error } = await supabase.from("medicines").insert({
        name: result.name,
        dosage: result.dosage,
        timing: selectedTiming,
        food_instruction: selectedFood,
        purpose: result.purpose_en,
        user_id: user.id,
        is_active: true,
      });

      if (error) throw error;

      setSaved(true);
      toast.success(`${result.name} added to your medicine list!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save medicine");
    }
  };

  const pageTitle = isIdentifyMode ? "What Is This Tablet?" : "Scan Tablet Strip";

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="text-foreground p-1">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-foreground">{pageTitle}</h1>
        <LanguageToggle />
      </div>

      <div className="px-4 mt-6 max-w-lg mx-auto">
        {/* Upload Area */}
        {!loading && !result && (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-primary/40 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary hover:bg-secondary/50 transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                {isIdentifyMode ? <Pill size={32} className="text-primary" /> : <Camera size={32} className="text-primary" />}
              </div>
              <p className="text-lg font-bold text-foreground">{pageTitle}</p>
              <p className="text-sm text-muted-foreground text-center">
                {isIdentifyMode
                  ? "Photograph any tablet to identify it before taking"
                  : "Photograph or upload a tablet strip image"}
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
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
              <img src={previewUrl} alt="Tablet" className="w-40 h-40 object-cover rounded-2xl border border-border mb-4" />
            )}
            <Loader2 size={48} className="text-primary animate-spin" />
            <p className="text-lg font-bold text-foreground">Identifying your medicine...</p>
            <p className="text-sm text-muted-foreground">AI is reading the tablet strip</p>
          </div>
        )}

        {/* Result Card */}
        {result && (
          <div className="space-y-4">
            {/* Preview image */}
            {previewUrl && (
              <img src={previewUrl} alt="Scanned tablet" className="w-full h-48 object-cover rounded-2xl border border-border" />
            )}

            {/* Main Info Card */}
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-foreground">{result.name}</h2>
                  <p className="text-muted-foreground text-sm mt-0.5">{result.dosage} · {result.category}</p>
                </div>
                {/* Expiry Badge */}
                {result.isExpired ? (
                  <span className="flex items-center gap-1.5 bg-destructive/15 text-destructive px-3 py-1.5 rounded-xl text-sm font-bold">
                    <ShieldX size={16} /> EXPIRED
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 bg-success/15 text-success px-3 py-1.5 rounded-xl text-sm font-bold">
                    <ShieldCheck size={16} /> Valid
                  </span>
                )}
              </div>

              {/* Manufacturer */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package size={16} />
                <span>{result.manufacturer}</span>
              </div>

              {/* Expiry Date */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Expiry:</span>
                <span>{result.expiryDate}</span>
              </div>
            </div>

            {/* Purpose Card - English */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wide mb-2">What does it do?</h3>
              <p className="text-foreground leading-relaxed">{result.purpose_en}</p>
            </div>

            {/* Purpose Card - Tamil */}
            <div className="bg-secondary rounded-2xl border border-border p-5">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wide mb-2">தமிழில்</h3>
              <p className="text-foreground leading-relaxed">{result.purpose_ta}</p>
            </div>

            {/* Expiry Explanation */}
            <div className={`rounded-2xl border-2 p-5 ${result.isExpired ? "bg-destructive/5 border-destructive/30" : "bg-success/5 border-success/30"}`}>
              <h3 className={`text-sm font-bold uppercase tracking-wide mb-2 ${result.isExpired ? "text-destructive" : "text-success"}`}>
                Expiry Status
              </h3>
              <p className="text-foreground text-sm leading-relaxed mb-2">{result.expiry_explanation_en}</p>
              <p className="text-foreground text-sm leading-relaxed italic">{result.expiry_explanation_ta}</p>
            </div>

            {/* Storage Instructions */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center gap-2 mb-2">
                <Thermometer size={18} className="text-primary" />
                <h3 className="text-sm font-bold text-primary uppercase tracking-wide">Storage</h3>
              </div>
              <p className="text-foreground text-sm leading-relaxed">{result.storage}</p>
            </div>

            {/* Timing & Food Selectors + Save */}
            {!isIdentifyMode && (
              <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                {/* Timing */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">When to take</label>
                  <div className="flex gap-2">
                    {(["morning", "afternoon", "night"] as const).map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTiming(time)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                          selectedTiming === time
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-accent"
                        }`}
                      >
                        {time === "morning" ? "☀️" : time === "afternoon" ? "🌤️" : "🌙"} {time.charAt(0).toUpperCase() + time.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Food Instruction */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Food instruction</label>
                  <div className="flex gap-2">
                    {(["before_food", "after_food", "with_food"] as const).map((food) => (
                      <button
                        key={food}
                        onClick={() => setSelectedFood(food)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                          selectedFood === food
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-accent"
                        }`}
                      >
                        {food === "before_food" ? "Before" : food === "after_food" ? "After" : "With"} Food
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={saved}
                  className={`w-full py-4 rounded-2xl text-lg font-bold transition-all ${
                    saved
                      ? "bg-success/15 text-success"
                      : "bg-primary text-primary-foreground shadow-lg hover:opacity-90"
                  }`}
                >
                  {saved ? (
                    <span className="flex items-center justify-center gap-2"><Check size={20} /> Saved to Medicine List</span>
                  ) : (
                    "Confirm & Add to Medicines"
                  )}
                </button>
              </div>
            )}

            {/* Scan Again */}
            <button
              onClick={() => {
                setResult(null);
                setPreviewUrl(null);
                setSaved(false);
              }}
              className="w-full py-3 rounded-xl text-base font-semibold bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
            >
              Scan Another Tablet
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

export default ScanTablet;
