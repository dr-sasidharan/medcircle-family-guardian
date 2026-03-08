import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Pill, Bell, ScanLine, User } from "lucide-react";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [missedCount, setMissedCount] = useState(0);

  useEffect(() => {
    const fetchMissed = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase
        .from("doses")
        .select("*", { count: "exact", head: true })
        .eq("scheduled_date", today)
        .eq("taken", false)
        .eq("missed", true);
      setMissedCount(count || 0);
    };

    fetchMissed();

    const channel = supabase
      .channel("nav-doses")
      .on("postgres_changes", { event: "*", schema: "public", table: "doses" }, () => {
        fetchMissed();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const items = [
    { path: "/patient", icon: LayoutDashboard, label: t("dashboard"), badge: 0 },
    { path: "/add-medicine", icon: Pill, label: t("medicines"), badge: 0 },
    { path: "/reminders", icon: Bell, label: "Reminders", badge: missedCount },
    { path: "/scan", icon: ScanLine, label: t("scan"), badge: 0 },
    { path: "/profile", icon: User, label: t("profile"), badge: 0 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex justify-around items-center py-2 px-2 max-w-lg mx-auto">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                isActive
                  ? "text-primary bg-secondary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="relative">
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 w-4.5 h-4.5 min-w-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
