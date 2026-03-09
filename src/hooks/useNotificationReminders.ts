import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const TIMING_HOURS: Record<string, number> = {
  morning: 8,
  afternoon: 14,
  night: 21,
};

// Offset in minutes before scheduled time to fire notification
const REMINDER_OFFSET_MINUTES = 5;
const CHECK_INTERVAL_MS = 60_000; // every minute

export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "denied";
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  return { permission, requestPermission };
}

export function useNotificationReminders() {
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const checkAndNotify = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      const { data: medicines } = await supabase
        .from("medicines")
        .select("id, name, dosage, timing, food_instruction")
        .eq("is_active", true);

      if (!medicines?.length) return;

      const today = now.toISOString().split("T")[0];

      for (const med of medicines) {
        // Support comma-separated timings
        const timings = med.timing.split(",");
        for (const timingSlot of timings) {
          const targetHour = TIMING_HOURS[timingSlot];
          if (targetHour === undefined) continue;

          // Fire notification within the REMINDER_OFFSET window
          const diffMinutes = (targetHour * 60) - (currentHour * 60 + currentMinute);
          if (diffMinutes < -15 || diffMinutes > REMINDER_OFFSET_MINUTES) continue;

          const notifKey = `${med.id}-${today}-${timingSlot}`;
          if (notifiedRef.current.has(notifKey)) continue;

          // Check if already taken for this specific timing
          const { data: dose } = await supabase
            .from("doses")
            .select("taken")
            .eq("medicine_id", med.id)
            .eq("scheduled_date", today)
            .eq("scheduled_time", timingSlot)
            .maybeSingle();

          if (dose?.taken) continue;

          // Show notification
          notifiedRef.current.add(notifKey);
          const foodText = med.food_instruction === "before_food" ? "before food" : "after food";
          
          new Notification(`💊 Time for ${med.name}`, {
            body: `${med.dosage} — take ${foodText}`,
            icon: "/favicon.ico",
            tag: notifKey,
            requireInteraction: true,
          });
        }
      }
    };

    checkAndNotify();
    const interval = setInterval(checkAndNotify, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}
