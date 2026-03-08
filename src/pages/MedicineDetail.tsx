import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, AlertTriangle } from "lucide-react";

interface MedicineData {
  id: string;
  name: string;
  dosage: string;
  timing: string;
  food_instruction: string;
  purpose: string | null;
}

interface MedicineInfo {
  purpose: string;
  how_to_take: string;
  side_effects: string[];
  foods_to_avoid: string[];
  drug_interactions: string;
}

const SECTION_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  purpose: { icon: "🎯", color: "#0d9488", bg: "#ccfbf1" },
  how_to_take: { icon: "💊", color: "#3b82f6", bg: "#dbeafe" },
  side_effects: { icon: "⚡", color: "#f59e0b", bg: "#fef3c7" },
  foods_to_avoid: { icon: "🍎", color: "#f43f5e", bg: "#fff1f2" },
};

const MedicineDetail = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [medicine, setMedicine] = useState<MedicineData | null>(null);
  const [info, setInfo] = useState<MedicineInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [infoLoading, setInfoLoading] = useState(false);

  useEffect(() => {
    const fetchMedicine = async () => {
      if (!id) return;

      // Reset state so previous medicine data never flashes on route switch
      setLoading(true);
      setInfo(null);
      setMedicine(null);
      setInfoLoading(false);

      const { data, error } = await supabase
        .from("medicines")
        .select("id, name, dosage, timing, food_instruction, purpose")
        .eq("id", id)
        .single();

      if (error || !data) {
        console.error("Error fetching medicine:", error);
        setLoading(false);
        return;
      }

      setMedicine(data as MedicineData);
      setLoading(false);

      setInfoLoading(true);
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke("medicine-info", {
          body: { medicine_name: data.name, dosage: data.dosage, language },
        });
        if (!fnError && fnData) {
          setInfo(fnData as MedicineInfo);
        }
      } catch (e) {
        console.error("Failed to fetch medicine info:", e);
      }
      setInfoLoading(false);
    };

    fetchMedicine();
  }, [id]);

  const timingLabel = medicine?.timing === "morning" ? "Morning" : medicine?.timing === "afternoon" ? "Afternoon" : "Night";
  const timingColor = medicine?.timing === "morning" ? "#f59e0b" : medicine?.timing === "afternoon" ? "#3b82f6" : "#8b5cf6";

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!medicine) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Medicine not found</p>
        <button onClick={() => navigate(-1)} className="text-primary font-heading font-bold">Go back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-24 page-transition">
      {/* Header */}
      <div
        className="text-white p-5 rounded-b-[28px] relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f766e 0%, #134e4a 60%, #0c3532 100%)" }}
      >
        <div className="absolute top-[-40px] right-[-40px] w-[140px] h-[140px] rounded-full bg-white/5 animate-float" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-lg font-heading font-bold">{t("medicines")}</h1>
          </div>

          {/* Medicine name card */}
          <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
            <div
              className="w-14 h-14 flex items-center justify-center flex-shrink-0 text-2xl"
              style={{ background: "rgba(255,255,255,0.15)", borderRadius: "14px" }}
            >
              💊
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-2xl">{medicine.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-white/70 text-sm">{medicine.dosage}</span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${timingColor}30`, color: "white" }}
                >
                  {timingLabel}
                </span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: medicine.food_instruction === "before_food" ? "#ccfbf130" : "#fef3c730",
                    color: "white",
                  }}
                >
                  {t(medicine.food_instruction) || medicine.food_instruction}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 mt-5 space-y-4 max-w-lg mx-auto">
        {infoLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">Loading medicine information...</p>
          </div>
        )}

        {info && (
          <>
            {/* Purpose */}
            <section
              className="bg-card rounded-[18px] p-5 animate-slide-up"
              style={{ borderLeft: `4px solid ${SECTION_ICONS.purpose.color}`, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{ background: SECTION_ICONS.purpose.bg }}
                >
                  {SECTION_ICONS.purpose.icon}
                </div>
                <h3 className="font-heading font-bold text-sm uppercase tracking-wide" style={{ color: SECTION_ICONS.purpose.color }}>
                  Purpose
                </h3>
              </div>
              <p className="text-foreground leading-relaxed text-[15px]">{info.purpose}</p>
            </section>

            {/* How to Take */}
            <section
              className="bg-card rounded-[18px] p-5 animate-slide-up"
              style={{ borderLeft: `4px solid ${SECTION_ICONS.how_to_take.color}`, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", animationDelay: "80ms" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{ background: SECTION_ICONS.how_to_take.bg }}
                >
                  {SECTION_ICONS.how_to_take.icon}
                </div>
                <h3 className="font-heading font-bold text-sm uppercase tracking-wide" style={{ color: SECTION_ICONS.how_to_take.color }}>
                  How to Take
                </h3>
              </div>
              <p className="text-foreground leading-relaxed text-[15px]">{info.how_to_take}</p>
            </section>

            {/* Side Effects */}
            <section
              className="bg-card rounded-[18px] p-5 animate-slide-up"
              style={{ borderLeft: `4px solid ${SECTION_ICONS.side_effects.color}`, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", animationDelay: "160ms" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{ background: SECTION_ICONS.side_effects.bg }}
                >
                  {SECTION_ICONS.side_effects.icon}
                </div>
                <h3 className="font-heading font-bold text-sm uppercase tracking-wide" style={{ color: SECTION_ICONS.side_effects.color }}>
                  Side Effects
                </h3>
              </div>
              <ul className="space-y-2">
                {info.side_effects.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[15px]">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: SECTION_ICONS.side_effects.color }} />
                    <span className="text-foreground">{s}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Foods to Avoid */}
            <section
              className="bg-card rounded-[18px] p-5 animate-slide-up"
              style={{ borderLeft: `4px solid ${SECTION_ICONS.foods_to_avoid.color}`, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", animationDelay: "240ms" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{ background: SECTION_ICONS.foods_to_avoid.bg }}
                >
                  {SECTION_ICONS.foods_to_avoid.icon}
                </div>
                <h3 className="font-heading font-bold text-sm uppercase tracking-wide" style={{ color: SECTION_ICONS.foods_to_avoid.color }}>
                  Foods to Avoid
                </h3>
              </div>
              <ul className="space-y-2">
                {info.foods_to_avoid.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-[15px]">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: SECTION_ICONS.foods_to_avoid.color }} />
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Drug Interactions Warning */}
            <section
              className="rounded-[18px] p-5 border-2 animate-slide-up"
              style={{
                background: "linear-gradient(135deg, #fff1f2, #ffe4e6)",
                borderColor: "#fda4af",
                animationDelay: "320ms",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#fda4af]/30 flex items-center justify-center">
                  <AlertTriangle size={16} className="text-[#e11d48]" />
                </div>
                <h3 className="font-heading font-bold text-sm uppercase tracking-wide text-[#9f1239]">
                  {t("drug_interaction")}
                </h3>
              </div>
              <p className="text-[#9f1239] leading-relaxed text-[15px]">{info.drug_interactions}</p>
            </section>
          </>
        )}

        {!infoLoading && !info && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Could not load medicine information.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-primary font-heading font-bold text-sm"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default MedicineDetail;
