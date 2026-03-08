import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, Search, ShieldCheck, ShieldAlert, AlertTriangle, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";

interface InteractionResult {
  verdict: "SAFE" | "CAUTION" | "DANGER";
  explanation: string;
  symptoms_to_watch: string[];
  tamil_explanation: string;
}

const verdictConfig = {
  SAFE: { bg: "bg-success/10", border: "border-success/40", icon: ShieldCheck, iconColor: "text-success", label: "SAFE", labelBg: "bg-success" },
  CAUTION: { bg: "bg-warning/10", border: "border-warning/40", icon: AlertTriangle, iconColor: "text-warning", label: "CAUTION", labelBg: "bg-warning" },
  DANGER: { bg: "bg-destructive/10", border: "border-destructive/40", icon: ShieldAlert, iconColor: "text-destructive", label: "DANGER", labelBg: "bg-destructive" },
};

const DrugInteraction = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [med1, setMed1] = useState("");
  const [med2, setMed2] = useState("");
  const [result, setResult] = useState<InteractionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const checkInteraction = async () => {
    if (!med1.trim() || !med2.trim()) {
      toast.error("Please enter both medicine names");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("drug-interaction", {
        body: { medicine1: med1.trim(), medicine2: med2.trim() },
      });
      if (error) throw error;
      setResult(data);
    } catch (e: any) {
      console.error("Interaction check error:", e);
      toast.error("Could not check interaction. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const config = result ? verdictConfig[result.verdict] : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="text-foreground p-1">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Drug Interaction Checker</h1>
      </div>

      <div className="px-4 mt-6 space-y-4">
        {/* Medicine 1 */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Medicine 1</label>
          <input
            value={med1}
            onChange={(e) => setMed1(e.target.value)}
            placeholder="e.g. Metformin"
            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Medicine 2 */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Medicine 2</label>
          <input
            value={med2}
            onChange={(e) => setMed2(e.target.value)}
            placeholder="e.g. Aspirin"
            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Check Button */}
        <button
          onClick={checkInteraction}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-2xl py-4 text-base font-bold shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Search size={20} />
              Check Interaction
            </>
          )}
        </button>

        {/* Result */}
        {result && config && (
          <div className={`${config.bg} ${config.border} border-2 rounded-2xl p-6 animate-fade-in`}>
            <div className="flex items-center justify-center gap-3 mb-4">
              <config.icon size={36} className={config.iconColor} />
              <span className={`${config.labelBg} text-primary-foreground px-4 py-1.5 rounded-full text-lg font-extrabold tracking-wide`}>
                {config.label}
              </span>
            </div>

            <p className="text-base text-foreground text-center font-medium mb-4">
              {language === "ta" ? result.tamil_explanation : result.explanation}
            </p>

            {result.symptoms_to_watch.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Eye size={16} className="text-muted-foreground" />
                  <h3 className="text-sm font-bold text-foreground">Symptoms to Watch</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.symptoms_to_watch.map((s, i) => (
                    <span key={i} className="bg-card border border-border px-3 py-1 rounded-lg text-sm text-foreground">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center italic">
          ⚕️ AI information is for awareness only. Always consult your doctor.
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default DrugInteraction;
