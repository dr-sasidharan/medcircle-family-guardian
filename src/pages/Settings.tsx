import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useElderlyMode } from "@/contexts/ElderlyModeContext";
import LanguageToggle from "@/components/LanguageToggle";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, Eye, Sun, Moon } from "lucide-react";

const Settings = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { elderlyMode, setElderlyMode } = useElderlyMode();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="text-foreground p-1">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-foreground">{t("settings")}</h1>
        <div className="ml-auto">
          <LanguageToggle />
        </div>
      </div>

      <div className="px-4 mt-6 space-y-4">
        {/* Elderly Mode Toggle */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Eye size={24} className="text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">{t("elderly_mode")}</h2>
                <p className="text-sm text-muted-foreground">{t("elderly_mode_desc")}</p>
              </div>
            </div>
            <button
              onClick={() => setElderlyMode(!elderlyMode)}
              className={`w-14 h-8 rounded-full transition-colors relative ${
                elderlyMode ? "bg-primary" : "bg-muted"
              }`}
            >
              <div
                className={`w-6 h-6 bg-primary-foreground rounded-full absolute top-1 transition-transform shadow-sm ${
                  elderlyMode ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          {elderlyMode && (
            <div className="mt-4 bg-success/10 border border-success/30 rounded-xl p-3 animate-fade-in">
              <p className="text-sm text-success font-semibold">
                ✅ {t("elderly_mode")} enabled — larger text, higher contrast, simplified layout
              </p>
            </div>
          )}
        </div>

        {/* Language Section */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-base font-bold text-foreground mb-3">Language / மொழி / भाषा</h2>
          <LanguageToggle />
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Settings;
