import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { AlertTriangle } from "lucide-react";

interface RefillData {
  medicine_name: string;
  tablets_remaining: number;
  total_tablets: number;
}

const RefillBanner = () => {
  const { t } = useLanguage();
  const [lowRefills, setLowRefills] = useState<RefillData[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("medicine_refills")
        .select("tablets_remaining, total_tablets, medicines(name)")
        .lt("tablets_remaining", 5);

      if (data) {
        setLowRefills(
          data.map((r: any) => ({
            medicine_name: r.medicines?.name || "Unknown",
            tablets_remaining: r.tablets_remaining,
            total_tablets: r.total_tablets,
          }))
        );
      }
    };

    fetch();

    const channel = supabase
      .channel("refill-banner")
      .on("postgres_changes", { event: "*", schema: "public", table: "medicine_refills" }, () => fetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (lowRefills.length === 0) return null;

  return (
    <div className="px-4 mt-4 space-y-2">
      {lowRefills.map((r, i) => (
        <div key={i} className="bg-warning/10 border border-warning/30 rounded-2xl p-3.5 flex items-center gap-3 animate-fade-in">
          <AlertTriangle className="text-warning flex-shrink-0" size={20} />
          <span className="text-warning font-bold text-sm">
            {r.medicine_name} {t("refill_alert")} {r.tablets_remaining} {t("days")}. {t("time_to_refill")}
          </span>
        </div>
      ))}
    </div>
  );
};

export default RefillBanner;
