import { useNavigate } from "react-router-dom";
import { useElderlyMode } from "@/contexts/ElderlyModeContext";
import { useNotificationPermission } from "@/hooks/useNotificationReminders";
import LanguageToggle from "@/components/LanguageToggle";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, Eye, LogOut, BellRing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { elderlyMode, setElderlyMode } = useElderlyMode();
  const { permission, requestPermission } = useNotificationPermission();

  const handleNotificationToggle = async () => {
    if (permission === "granted") {
      toast.info("To disable notifications, use your browser settings.");
      return;
    }
    const result = await requestPermission();
    if (result === "granted") {
      toast.success("Notifications enabled! You'll get medicine reminders.");
    } else if (result === "denied") {
      toast.error("Notifications blocked. Please enable them in browser settings.");
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="glass-header flex items-center gap-3 p-4">
        <button onClick={() => navigate(-1)} className="text-white p-1">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-heading font-bold text-white">Settings</h1>
        <div className="ml-auto">
          <LanguageToggle />
        </div>
      </div>

      <div className="px-4 mt-6 space-y-4">
        {/* Push Notifications Toggle */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(13,148,136,0.2)" }}>
                <BellRing size={24} className="text-[#34d399]" />
              </div>
              <div>
                <h2 className="text-base font-heading font-bold text-white">Push Notifications</h2>
                <p className="text-sm text-glass-secondary">
                  {permission === "granted"
                    ? "You'll receive medicine reminders"
                    : "Get notified when it's time for medicine"}
                </p>
              </div>
            </div>
            <button
              onClick={handleNotificationToggle}
              className="w-14 h-8 rounded-full transition-colors relative"
              style={{ background: permission === "granted" ? "#0d9488" : "rgba(255,255,255,0.1)" }}
            >
              <div
                className="w-6 h-6 bg-white rounded-full absolute top-1 transition-transform shadow-sm"
                style={{ transform: permission === "granted" ? "translateX(28px)" : "translateX(4px)" }}
              />
            </button>
          </div>
        </div>

        {/* Elderly Mode Toggle */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(13,148,136,0.2)" }}>
                <Eye size={24} className="text-[#34d399]" />
              </div>
              <div>
                <h2 className="text-base font-heading font-bold text-white">Elderly Mode</h2>
                <p className="text-sm text-glass-secondary">Larger text, simpler layout</p>
              </div>
            </div>
            <button
              onClick={() => setElderlyMode(!elderlyMode)}
              className="w-14 h-8 rounded-full transition-colors relative"
              style={{ background: elderlyMode ? "#0d9488" : "rgba(255,255,255,0.1)" }}
            >
              <div
                className="w-6 h-6 bg-white rounded-full absolute top-1 transition-transform shadow-sm"
                style={{ transform: elderlyMode ? "translateX(28px)" : "translateX(4px)" }}
              />
            </button>
          </div>
          {elderlyMode && (
            <div className="mt-4 rounded-xl p-3 animate-fade-in" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
              <p className="text-sm text-[#34d399] font-semibold">
                ✅ Elderly Mode enabled — larger text, higher contrast, simplified layout
              </p>
            </div>
          )}
        </div>

        {/* Language Section */}
        <div className="glass-card p-5">
          <h2 className="text-base font-heading font-bold text-white mb-3">Language / மொழி / भाषा / ഭാഷ</h2>
          <LanguageToggle />
        </div>

        {/* Logout */}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            toast.success("Logged out");
            navigate("/auth");
          }}
          className="w-full glass-card p-5 flex items-center gap-3 hover:bg-white/12 transition-colors"
          style={{ boxShadow: "inset 3px 0 0 #f43f5e, 0 8px 32px rgba(0,0,0,0.3)" }}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(244,63,94,0.2)" }}>
            <LogOut size={24} className="text-[#f43f5e]" />
          </div>
          <div className="text-left">
            <h2 className="text-base font-heading font-bold text-[#f43f5e]">Logout</h2>
            <p className="text-sm text-glass-secondary">Sign out of your account</p>
          </div>
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Settings;
