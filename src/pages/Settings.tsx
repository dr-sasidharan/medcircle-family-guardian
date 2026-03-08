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
    <div className="min-h-screen bg-background pb-24">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="text-foreground p-1">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Settings</h1>
        <div className="ml-auto">
          <LanguageToggle />
        </div>
      </div>

      <div className="px-4 mt-6 space-y-4">
        {/* Push Notifications Toggle */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <BellRing size={24} className="text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Push Notifications</h2>
                <p className="text-sm text-muted-foreground">
                  {permission === "granted"
                    ? "You'll receive medicine reminders"
                    : "Get notified when it's time for medicine"}
                </p>
              </div>
            </div>
            <button
              onClick={handleNotificationToggle}
              className={`w-14 h-8 rounded-full transition-colors relative ${
                permission === "granted" ? "bg-primary" : "bg-muted"
              }`}
            >
              <div
                className={`w-6 h-6 bg-primary-foreground rounded-full absolute top-1 transition-transform shadow-sm ${
                  permission === "granted" ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Elderly Mode Toggle */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Eye size={24} className="text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Elderly Mode</h2>
                <p className="text-sm text-muted-foreground">Larger text, simpler layout</p>
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
                ✅ Elderly Mode enabled — larger text, higher contrast, simplified layout
              </p>
            </div>
          )}
        </div>

        {/* Language Section */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-base font-bold text-foreground mb-3">Language / மொழி / भाषा / ഭാഷ</h2>
          <LanguageToggle />
        </div>

        {/* Logout */}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            toast.success("Logged out");
            navigate("/auth");
          }}
          className="w-full bg-destructive/10 border border-destructive/20 rounded-2xl p-5 flex items-center gap-3 hover:bg-destructive/20 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
            <LogOut size={24} className="text-destructive" />
          </div>
          <div className="text-left">
            <h2 className="text-base font-bold text-destructive">Logout</h2>
            <p className="text-sm text-muted-foreground">Sign out of your account</p>
          </div>
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Settings;
