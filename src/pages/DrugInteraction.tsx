import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, Search, ShieldCheck, ShieldAlert, AlertTriangle, Loader2, Eye, BadgeCheck, AlertCircle, X, Share2 } from "lucide-react";
import { toast } from "sonner";

interface RxNormInteraction {
  severity: string;
  description: string;
  source: string;
}

interface InteractionResult {
  verdict: "SAFE" | "CAUTION" | "DANGER";
  explanation: string;
  localized_explanation: string;
  clinical_tip: string;
  symptoms_to_watch: string[];
  source: "rxnorm" | "ai";
  rxcui1: string | null;
  rxcui2: string | null;
  rxnorm_interactions: RxNormInteraction[];
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
  const [showDangerModal, setShowDangerModal] = useState(false);
  const [dangerAcknowledged, setDangerAcknowledged] = useState(false);

  const checkInteraction = async () => {
    if (!med1.trim() || !med2.trim()) {
      toast.error("Please enter both medicine names");
      return;
    }
    setLoading(true);
    setResult(null);
    setDangerAcknowledged(false);
    try {
      const { data, error } = await supabase.functions.invoke("drug-interaction", {
        body: { medicine1: med1.trim(), medicine2: med2.trim(), language },
      });
      if (error) throw error;
      setResult(data);

      // Show danger modal for high severity RxNorm interactions
      if (data.verdict === "DANGER" && data.source === "rxnorm") {
        setShowDangerModal(true);
      }
    } catch (e: any) {
      console.error("Interaction check error:", e);
      toast.error("Could not check interaction. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const config = result ? verdictConfig[result.verdict] : null;
  const isRxNormVerified = result?.source === "rxnorm";

  return (
    <div className="min-h-screen bg-background pb-24 page-transition">
      {/* Danger Modal */}
      {showDangerModal && !dangerAcknowledged && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border-4 border-destructive max-w-sm w-full p-8 text-center animate-fade-in shadow-2xl">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5">
              <ShieldAlert size={44} className="text-destructive" />
            </div>
            <h2 className="text-2xl font-heading font-extrabold text-destructive mb-3">
              ⚠️ HIGH SEVERITY INTERACTION
            </h2>
            <p className="text-base text-foreground font-medium mb-2">
              {result?.explanation}
            </p>
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 mb-6 mt-4">
              <p className="text-sm text-destructive font-bold">
                FDA-verified data indicates these drugs have a HIGH severity interaction.
                Consult your doctor immediately before taking them together.
              </p>
            </div>
            <button
              onClick={() => {
                setDangerAcknowledged(true);
                setShowDangerModal(false);
              }}
              className="w-full bg-destructive text-primary-foreground rounded-2xl py-4 text-base font-bold"
            >
              I will speak to the doctor
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="text-foreground p-1">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Drug Interaction Checker</h1>
      </div>

      <div className="px-4 mt-6 space-y-4">
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Medicine 1</label>
          <input value={med1} onChange={(e) => setMed1(e.target.value)} placeholder="e.g. Metformin"
            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">Medicine 2</label>
          <input value={med2} onChange={(e) => setMed2(e.target.value)} placeholder="e.g. Aspirin"
            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        <button onClick={checkInteraction} disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-2xl py-4 text-base font-bold shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50">
          {loading ? (<><Loader2 size={20} className="animate-spin" />Checking 3 layers...</>) : (<><Search size={20} />Check Interaction</>)}
        </button>

        {/* Verification pipeline indicator */}
        {loading && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-2 animate-fade-in">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Verification Pipeline</p>
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-primary" />
              <span className="text-sm text-foreground">Layer 1: Looking up RxNorm identifiers...</span>
            </div>
            <div className="flex items-center gap-2 opacity-50">
              <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground" />
              <span className="text-sm text-muted-foreground">Layer 2: Checking FDA interaction database</span>
            </div>
            <div className="flex items-center gap-2 opacity-50">
              <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground" />
              <span className="text-sm text-muted-foreground">Layer 3: AI explanation in your language</span>
            </div>
          </div>
        )}

        {result && config && (
          <div className="space-y-4 animate-fade-in">
            {/* Source Badge */}
            <div className="flex justify-center">
              {isRxNormVerified ? (
                <div className="inline-flex items-center gap-2 bg-success/10 border border-success/30 text-success px-4 py-2 rounded-full text-sm font-bold">
                  <BadgeCheck size={18} />
                  FDA Verified — RxNorm Database
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 bg-warning/10 border border-warning/30 text-warning px-4 py-2 rounded-full text-sm font-bold">
                  <AlertCircle size={18} />
                  AI Generated — Confirm with your doctor
                </div>
              )}
            </div>

            {/* Result Card */}
            <div className={`${config.bg} ${config.border} border-2 rounded-2xl p-6`}>
              <div className="flex items-center justify-center gap-3 mb-4">
                <config.icon size={36} className={config.iconColor} />
                <span className={`${config.labelBg} text-primary-foreground px-4 py-1.5 rounded-full text-lg font-extrabold tracking-wide`}>
                  {config.label}
                </span>
              </div>

              {/* Explanation */}
              <p className="text-base text-foreground text-center font-medium mb-3">
                {(language !== "en" && result.localized_explanation) ? result.localized_explanation : result.explanation}
              </p>

              {/* Clinical Tip */}
              {result.clinical_tip && (
                <div className="bg-card/50 border border-border rounded-xl p-3 mb-4">
                  <p className="text-sm text-foreground">
                    <span className="font-bold">💡 Tip: </span>{result.clinical_tip}
                  </p>
                </div>
              )}

              {/* RxNorm Source Details */}
              {isRxNormVerified && result.rxnorm_interactions.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Source Data</p>
                  {result.rxnorm_interactions.map((interaction, i) => (
                    <div key={i} className="bg-card/50 border border-border rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-muted-foreground">{interaction.source}</span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                          Severity: {interaction.severity}
                        </span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{interaction.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Symptoms */}
              {result.symptoms_to_watch.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye size={16} className="text-muted-foreground" />
                    <h3 className="text-sm font-bold text-foreground">Symptoms to Watch</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.symptoms_to_watch.map((s, i) => (
                      <span key={i} className="bg-card border border-border px-3 py-1 rounded-lg text-sm text-foreground">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Share via WhatsApp */}
            <button
              onClick={() => {
                const verdictEmoji = result.verdict === "SAFE" ? "✅" : result.verdict === "CAUTION" ? "⚠️" : "🚨";
                const sourceLabel = isRxNormVerified ? "FDA Verified (RxNorm)" : "AI Generated";
                const text = [
                  `${verdictEmoji} *MedCircle Drug Interaction Report*`,
                  ``,
                  `*${med1}* + *${med2}*`,
                  `Verdict: *${result.verdict}* (${sourceLabel})`,
                  ``,
                  (language !== "en" && result.localized_explanation) ? result.localized_explanation : result.explanation,
                  result.clinical_tip ? `\n💡 Tip: ${result.clinical_tip}` : "",
                  result.symptoms_to_watch.length > 0 ? `\n👁 Watch for: ${result.symptoms_to_watch.join(", ")}` : "",
                  ``,
                  `— Sent from MedCircle`,
                ].filter(Boolean).join("\n");
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
              }}
              className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white rounded-2xl py-3 text-sm font-bold hover:opacity-90 transition-opacity"
            >
              <Share2 size={18} />
              Share with Caretaker via WhatsApp
            </button>

            {/* RxCUI info */}
            <div className="flex justify-center gap-4 text-xs text-muted-foreground">
              {result.rxcui1 && <span>RxCUI: {med1} → {result.rxcui1}</span>}
              {result.rxcui2 && <span>RxCUI: {med2} → {result.rxcui2}</span>}
              {!result.rxcui1 && <span className="text-warning">⚠ {med1}: not found in RxNorm</span>}
              {!result.rxcui2 && <span className="text-warning">⚠ {med2}: not found in RxNorm</span>}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center italic">
          {result?.source === "rxnorm"
            ? "Interaction data sourced from FDA/RxNorm peer-reviewed database. AI used only for explanation."
            : "AI-generated content is for awareness only. Always consult your doctor."}
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default DrugInteraction;
