import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";
import { ArrowLeft, Upload, ScanLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AddMedicine = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [timing, setTiming] = useState("morning");
  const [food, setFood] = useState("after_food");

  const checkPlanLimit = useCallback(async () => {
    const { data: meds } = await supabase.from("medicines").select("id").eq("is_active", true);
    const { data: profiles } = await supabase.from("patient_profiles").select("id, plan").limit(1);
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

    const { error } = await supabase.from("medicines").insert({
      name: name.trim(),
      dosage: dosage.trim(),
      timing,
      food_instruction: food,
    });

    if (error) {
      toast.error("Failed to save medicine");
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
        <h1 className="text-lg font-bold text-foreground">{t("add_medicine")}</h1>
        <LanguageToggle />
      </div>

      <div className="p-5 space-y-5 max-w-lg mx-auto">
        {/* Scan Tablet Strip Button */}
        <button
          onClick={() => navigate("/scan-tablet")}
          className="w-full flex items-center justify-center gap-3 bg-secondary border-2 border-primary/30 rounded-2xl py-4 text-base font-bold text-primary hover:bg-accent transition-colors"
        >
          <ScanLine size={22} />
          {t("scan_tablet_strip")}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground font-medium">{t("or_enter_manually")}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Name */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("medicine_name")}</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g. Metformin" />
        </div>

        {/* Dosage */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("dosage")}</label>
          <input value={dosage} onChange={(e) => setDosage(e.target.value)}
            className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g. 500mg" />
        </div>

        {/* Timing */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("timing")}</label>
          <select value={timing} onChange={(e) => setTiming(e.target.value)}
            className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="morning">{t("morning")}</option>
            <option value="afternoon">{t("afternoon")}</option>
            <option value="night">{t("night")}</option>
          </select>
        </div>

        {/* Food */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("food_instruction")}</label>
          <select value={food} onChange={(e) => setFood(e.target.value)}
            className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="before_food">{t("before_food")}</option>
            <option value="after_food">{t("after_food")}</option>
            <option value="with_food">{t("with_food")}</option>
          </select>
        </div>

        {/* Upload */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("upload_photo")}</label>
          <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 transition-colors cursor-pointer">
            <Upload size={32} />
            <p className="text-sm">{t("tap_to_upload")}</p>
          </div>
        </div>

        {/* Save */}
        <button onClick={handleSave}
          className="w-full bg-primary text-primary-foreground rounded-2xl py-4 text-lg font-bold shadow-lg hover:opacity-90 transition-opacity mt-4">
          {t("save")}
        </button>
      </div>
    </div>
  );
};

export default AddMedicine;
