import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Pill, Clock, Users, User, Plus, Stethoscope } from "lucide-react";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
    { path: "/patient", icon: Pill, label: "Medicines" },
    { path: "/reminders", icon: Clock, label: "History" },
    { path: "__add__", icon: Plus, label: "" },
    { path: "/symptoms", icon: Stethoscope, label: "Symptoms" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50">
      <div className="flex justify-around items-end py-2 px-2 max-w-lg mx-auto">
        {items.map((item) => {
          if (item.path === "__add__") {
            return (
              <button
                key="add"
                onClick={() => navigate("/add-medicine")}
                className="relative -mt-6 flex flex-col items-center"
              >
                <div className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center bg-primary shadow-lg">
                  <Plus size={26} className="text-primary-foreground" strokeWidth={2.5} />
                </div>
              </button>
            );
          }

          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center gap-0.5 px-3 py-1.5"
            >
              <div className={`relative p-2 rounded-xl transition-all ${isActive ? "bg-primary/10" : ""}`}>
                <item.icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={isActive ? "text-primary" : "text-muted-foreground"}
                />
                {item.path === "/reminders" && missedCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {missedCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-bold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
