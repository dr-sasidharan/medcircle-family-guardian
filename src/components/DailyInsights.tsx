import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import AIResponseCards, { type AssistantResponse } from "@/components/AIResponseCards";

const DailyInsights = () => {
  const { language, t } = useLanguage();
  const [assistant, setAssistant] = useState<AssistantResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [followupLoading, setFollowupLoading] = useState(false);
  const [followupAssistant, setFollowupAssistant] = useState<AssistantResponse | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("health-insights", {
          body: { language },
        });
        if (error) throw error;
        if (data?.assistant) setAssistant(data.assistant);
      } catch (e) {
        console.error("Insights error:", e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [language]);

  const askFollowup = async (prompt: string) => {
    setFollowupLoading(true);
    setFollowupAssistant(null);
    try {
      const { data, error } = await supabase.functions.invoke("health-insights", {
        body: { language, followup_prompt: prompt },
      });
      if (error) throw error;
      if (data?.assistant) setFollowupAssistant(data.assistant);
    } catch {
      toast.error("Could not load follow-up");
    } finally {
      setFollowupLoading(false);
    }
  };

  if (!loading && !assistant) return null;

  return (
    <div className="px-4 mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={18} className="text-primary" />
        <h2 className="text-base font-bold text-foreground">{t("todays_insights")}</h2>
      </div>
      <AIResponseCards data={assistant} loading={loading} onFollowup={askFollowup} />
      {(followupLoading || followupAssistant) && (
        <div className="mt-3">
          <AIResponseCards data={followupAssistant} loading={followupLoading} onFollowup={askFollowup} />
        </div>
      )}
    </div>
  );
};

export default DailyInsights;
