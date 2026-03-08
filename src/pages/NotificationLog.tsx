import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Bell, MessageCircle, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface WhatsAppReminder {
  id: string;
  medicine_name: string;
  dosage: string;
  timing: string;
  phone: string;
  scheduled_date: string;
  sent_at: string | null;
  response: string | null;
  response_at: string | null;
  followup_sent_at: string | null;
  caretaker_notified: boolean | null;
}

interface SymptomAlert {
  id: string;
  symptom: string;
  urgency: string;
  urgency_color: string;
  created_at: string;
  likely_medicine: string | null;
}

const NotificationLog = () => {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<WhatsAppReminder[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [remindersRes, symptomsRes] = await Promise.all([
        supabase
          .from("whatsapp_reminders")
          .select("*")
          .order("scheduled_date", { ascending: false })
          .limit(50),
        supabase
          .from("symptom_checks")
          .select("id, symptom, urgency, urgency_color, created_at, likely_medicine")
          .order("created_at", { ascending: false })
          .limit(30),
      ]);

      setReminders(remindersRes.data || []);
      setSymptoms(symptomsRes.data || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  const getResponseIcon = (response: string | null, sentAt: string | null) => {
    if (!sentAt) return <Clock size={16} className="text-muted-foreground" />;
    if (!response) return <Clock size={16} className="text-warning" />;
    if (response === "taken") return <CheckCircle2 size={16} className="text-primary" />;
    return <XCircle size={16} className="text-destructive" />;
  };

  const getResponseLabel = (response: string | null, sentAt: string | null) => {
    if (!sentAt) return "Pending";
    if (!response) return "Awaiting reply";
    if (response === "taken") return "ஆம் (Taken)";
    return "இல்லை (Missed)";
  };

  const getUrgencyBadge = (urgency: string, color: string) => {
    const variant = color === "red" ? "destructive" : color === "yellow" ? "secondary" : "default";
    return <Badge variant={variant}>{urgency}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b border-primary/10 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <Bell size={20} className="text-primary" />
          <h1 className="text-lg font-bold text-foreground">Notification Log</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        <Tabs defaultValue="reminders">
          <TabsList className="w-full">
            <TabsTrigger value="reminders" className="flex-1 gap-1">
              <MessageCircle size={14} /> Reminders
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex-1 gap-1">
              <AlertTriangle size={14} /> Symptom Alerts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reminders">
            <ScrollArea className="h-[calc(100vh-220px)]">
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">Loading...</div>
              ) : reminders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageCircle size={40} className="mx-auto mb-3 opacity-30" />
                  <p>No reminders sent yet</p>
                </div>
              ) : (
                <div className="space-y-3 pb-4">
                  {reminders.map((r) => (
                    <Card key={r.id} className="border-primary/10">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-foreground">{r.medicine_name}</p>
                            <p className="text-xs text-muted-foreground">{r.dosage} · {r.timing}</p>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            {getResponseIcon(r.response, r.sent_at)}
                            <span className={
                              r.response === "taken" ? "text-primary font-medium" :
                              r.response === "missed" ? "text-destructive font-medium" :
                              "text-muted-foreground"
                            }>
                              {getResponseLabel(r.response, r.sent_at)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                          <span>📅 {r.scheduled_date}</span>
                          {r.sent_at && <span>📤 Sent {format(new Date(r.sent_at), "h:mm a")}</span>}
                          {r.response_at && <span>💬 Replied {format(new Date(r.response_at), "h:mm a")}</span>}
                          {r.followup_sent_at && <span>🔁 Follow-up sent</span>}
                          {r.caretaker_notified && (
                            <span className="text-destructive font-medium">🚨 Caretaker notified</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="alerts">
            <ScrollArea className="h-[calc(100vh-220px)]">
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">Loading...</div>
              ) : symptoms.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertTriangle size={40} className="mx-auto mb-3 opacity-30" />
                  <p>No symptom alerts yet</p>
                </div>
              ) : (
                <div className="space-y-3 pb-4">
                  {symptoms.map((s) => (
                    <Card key={s.id} className="border-primary/10">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-1">
                          <p className="font-semibold text-foreground">{s.symptom}</p>
                          {getUrgencyBadge(s.urgency, s.urgency_color)}
                        </div>
                        {s.likely_medicine && (
                          <p className="text-xs text-muted-foreground mb-1">
                            Likely from: <span className="font-medium text-foreground">{s.likely_medicine}</span>
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(s.created_at), "MMM d, yyyy · h:mm a")}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default NotificationLog;
