import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";
import logo from "@/assets/medcircle-logo.png";
import { Heart, UserRound } from "lucide-react";

const Welcome = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4">
        <div />
        <LanguageToggle />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        <img src={logo} alt="MedCircle Logo" className="w-28 h-28 mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2 text-center">MedCircle</h1>
        <p className="text-muted-foreground text-sm mb-8">India's Family Medicine Guardian</p>

        <h2 className="text-xl md:text-2xl font-bold text-foreground text-center leading-snug mb-10 max-w-md">
          {t("welcome_headline")}
        </h2>

        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={() => navigate("/patient")}
            className="w-full flex items-center justify-center gap-3 bg-primary text-primary-foreground rounded-2xl py-5 text-lg font-bold shadow-lg hover:opacity-90 transition-opacity"
          >
            <Heart size={24} />
            {t("i_am_patient")}
          </button>
          <button
            onClick={() => navigate("/caretaker")}
            className="w-full flex items-center justify-center gap-3 bg-card text-primary border-2 border-primary rounded-2xl py-5 text-lg font-bold hover:bg-secondary transition-colors"
          >
            <UserRound size={24} />
            {t("i_am_caretaker")}
          </button>
        </div>

        <p className="text-muted-foreground text-sm mt-8 text-center">
          {t("welcome_subtext")}
        </p>
      </div>
    </div>
  );
};

export default Welcome;
