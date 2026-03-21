import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { AlertTriangle, Package } from "lucide-react";

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
    <div className="px-4 mt-4 space-y-3">
      {lowRefills.map((r, i) => {
        const isUrgent = r.tablets_remaining <= 2;
        const accentColor = isUrgent ? "#f43f5e" : "#f59e0b";
        return (
          <div
            key={i}
            className="glass-card p-4 flex items-center gap-3 animate-slide-in-left"
            style={{
              boxShadow: `inset 3px 0 0 ${accentColor}, 0 8px 32px rgba(0,0,0,0.3)`,
              animationDelay: `${i * 100}ms`,
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${accentColor}20` }}
            >
              {isUrgent ? (
                <AlertTriangle size={20} className="text-[#f43f5e]" />
              ) : (
                <Package size={20} className="text-[#f59e0b]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading font-bold text-sm text-white">
                {r.medicine_name}
              </p>
              <p className="text-xs text-glass-muted">
                {r.tablets_remaining} {t("days_remaining")} · {t("time_to_refill")}
              </p>
            </div>
            <button
              className="px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0 text-white"
              style={{ background: accentColor }}
            >
              Refill
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default RefillBanner;
