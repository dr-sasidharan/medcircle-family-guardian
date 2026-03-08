import { useLanguage } from "@/contexts/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";
import { ArrowLeft, AlertTriangle, Pill } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MedicineDetail = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="text-foreground p-1">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-foreground">{t("medicines")}</h1>
        <LanguageToggle />
      </div>

      <div className="px-5 mt-6 max-w-lg mx-auto space-y-6">
        {/* Name */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
            <Pill size={28} className="text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-foreground">Metformin</h2>
            <p className="text-muted-foreground">500mg · Twice daily</p>
          </div>
        </div>

        {/* Purpose */}
        <section className="bg-card rounded-2xl border border-border p-5">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wide mb-2">{t("purpose")}</h3>
          <p className="text-foreground leading-relaxed">
            Metformin helps control blood sugar levels in Type 2 Diabetes. It makes your body respond better to insulin and reduces sugar production in the liver.
          </p>
        </section>

        {/* How to take */}
        <section className="bg-card rounded-2xl border border-border p-5">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wide mb-2">{t("how_to_take")}</h3>
          <p className="text-foreground leading-relaxed">
            Take with or after food. Swallow the tablet whole with a glass of water. Do not crush or chew. Take at the same time every day.
          </p>
        </section>

        {/* Side Effects */}
        <section className="bg-card rounded-2xl border border-border p-5">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wide mb-2">{t("side_effects")}</h3>
          <ul className="space-y-2 text-foreground">
            {["Nausea or upset stomach", "Diarrhea (usually goes away)", "Metallic taste in mouth", "Loss of appetite"].map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-muted-foreground mt-1">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Foods to Avoid */}
        <section className="bg-card rounded-2xl border border-border p-5">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wide mb-2">{t("foods_to_avoid")}</h3>
          <ul className="space-y-2 text-foreground">
            {["Excessive alcohol", "Sugary beverages and sweets", "White rice in large quantities"].map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-muted-foreground mt-1">•</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Drug Interaction */}
        <section className="bg-destructive/10 border-2 border-destructive/40 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="text-destructive" size={20} />
            <h3 className="text-sm font-bold text-destructive uppercase tracking-wide">{t("drug_interaction")}</h3>
          </div>
          <p className="text-foreground leading-relaxed">
            <strong>Do not take with alcohol or contrast dye for CT scans.</strong> Inform your doctor before any imaging procedure. Combining with certain heart or kidney medicines may require dose adjustment.
          </p>
        </section>
      </div>
    </div>
  );
};

export default MedicineDetail;
