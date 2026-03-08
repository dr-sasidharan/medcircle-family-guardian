import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { UtensilsCrossed, Clock, Heart, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Tip {
  type: "food" | "timing" | "lifestyle";
  title: string;
  content: string;
  tamil_content: string;
}

const iconMap = {
  food: UtensilsCrossed,
  timing: Clock,
  lifestyle: Heart,
};

const colorMap = {
  food: { bg: "bg-warning/10", border: "border-warning/30", icon: "text-warning" },
  timing: { bg: "bg-primary/10", border: "border-primary/30", icon: "text-primary" },
  lifestyle: { bg: "bg-success/10", border: "border-success/30", icon: "text-success" },
};

const DailyInsights = () => {
  const { t, language } = useLanguage();
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const { data: profiles } = await supabase.from("patient_profiles").select("name, age").limit(1);
        const { data: medicines } = await supabase.from("medicines").select("name, dosage, timing, food_instruction").eq("is_active", true);

        if (!profiles?.length || !medicines?.length) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke("health-insights", {
          body: { medicines, age: profiles[0].age, name: profiles[0].name, language },
        });

        if (error) throw error;
        if (data?.tips) setTips(data.tips);
      } catch (e: any) {
        console.error("Insights error:", e);
        toast.error("Could not load health insights");
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [language]);

  if (loading) {
    return (
      <div className="px-4 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={20} className="text-primary" />
          <h2 className="text-lg font-bold text-foreground">{t("todays_insights")}</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">{t("generating_insights")}</span>
        </div>
      </div>
    );
  }

  if (tips.length === 0) return null;

  return (
    <div className="px-4 mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={20} className="text-primary" />
        <h2 className="text-lg font-bold text-foreground">{t("todays_insights")}</h2>
      </div>
      <div className="space-y-3">
        {tips.map((tip, i) => {
          const Icon = iconMap[tip.type] || Heart;
          const colors = colorMap[tip.type] || colorMap.lifestyle;
          return (
            <div key={i} className={`${colors.bg} ${colors.border} border rounded-2xl p-4 animate-fade-in`}
              style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.bg} ${colors.icon}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-foreground">{tip.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {language === "ta" ? tip.tamil_content : tip.content}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground text-center mt-3 italic">{t("ai_disclaimer")}</p>
    </div>
  );
};

export default DailyInsights;
