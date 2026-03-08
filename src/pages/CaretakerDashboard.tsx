import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";
import { ArrowLeft, Check, X, AlertTriangle, Pill, Phone, ShieldAlert, Calendar, Clock, FileText, ChevronRight, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface DoseWithMedicine {
  id: string;
  taken: boolean;
  missed: boolean;
  scheduled_time: string;
  medicine: { id: string; name: string; dosage: string };
}

interface RefillInfo {
  medicine_name: string;
  tablets_remaining: number;
  total_tablets: number;
}

interface PatientProfile {
  id: string;
  name: string;
  age: number;
  blood_group: string | null;
  allergies: string[] | null;
  emergency_contact: string | null;
  emergency_notes: string | null;
  chronic_conditions: string[] | null;
  last_active_at: string | null;
}

interface HospitalVisit {
  id: string;
  hospital_name: string;
  visit_date: string;
  doctor_name: string;
  diagnosis: string;
  notes: string | null;
  report_url: string | null;
}

const CaretakerDashboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [doses, setDoses] = useState<DoseWithMedicine[]>([]);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [refills, setRefills] = useState<RefillInfo[]>([]);
  const [visits, setVisits] = useState<HospitalVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEmergency, setShowEmergency] = useState(false);
  const [activeTab, setActiveTab] = useState<"today" | "history" | "visits">("today");

  const fetchAll = useCallback(async () => {
    // Profile
    const { data: profiles } = await supabase.from("patient_profiles").select("*").limit(1);
    if (profiles && profiles.length > 0) setProfile(profiles[0] as any);
    const profileId = profiles?.[0]?.id;

    // Today's doses
    const today = new Date().toISOString().split("T")[0];
    const { data: dosesData } = await supabase
      .from("doses")
      .select("id, taken, missed, scheduled_time, medicines(id, name, dosage)")
      .eq("scheduled_date", today)
      .order("scheduled_time");
    setDoses((dosesData || []).map((d: any) => ({
      id: d.id, taken: d.taken, missed: d.missed, scheduled_time: d.scheduled_time, medicine: d.medicines,
    })));

    // Refills
    const { data: refillData } = await supabase
      .from("medicine_refills")
      .select("tablets_remaining, total_tablets, medicines(name)");
    setRefills((refillData || []).map((r: any) => ({
      medicine_name: r.medicines?.name || "Unknown",
      tablets_remaining: r.tablets_remaining,
      total_tablets: r.total_tablets,
    })));

    // Hospital visits
    if (profileId) {
      const { data: visitData } = await supabase
        .from("hospital_visits")
        .select("*")
        .eq("patient_profile_id", profileId)
        .order("visit_date", { ascending: false });
      setVisits((visitData || []) as any);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const ch1 = supabase.channel("ct-doses").on("postgres_changes", { event: "*", schema: "public", table: "doses" }, () => fetchAll()).subscribe();
    const ch2 = supabase.channel("ct-refills").on("postgres_changes", { event: "*", schema: "public", table: "medicine_refills" }, () => fetchAll()).subscribe();
    const ch3 = supabase.channel("ct-visits").on("postgres_changes", { event: "*", schema: "public", table: "hospital_visits" }, () => fetchAll()).subscribe();
    const ch4 = supabase.channel("ct-profile").on("postgres_changes", { event: "*", schema: "public", table: "patient_profiles" }, () => fetchAll()).subscribe();
    return () => { [ch1, ch2, ch3, ch4].forEach(c => supabase.removeChannel(c)); };
  }, [fetchAll]);

  const takenCount = doses.filter((d) => d.taken).length;
  const adherence = doses.length > 0 ? Math.round((takenCount / doses.length) * 100) : 0;
  const missedDoses = doses.filter((d) => d.missed && !d.taken);

  const getColor = (pct: number) => pct >= 80 ? "hsl(var(--success))" : pct >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
  const ringColor = adherence >= 80 ? "text-success" : adherence >= 50 ? "text-warning" : "text-destructive";
  const ringStroke = adherence >= 80 ? "stroke-success" : adherence >= 50 ? "stroke-warning" : "stroke-destructive";

  const weeklyData = [
    { day: "Mon", pct: 100 }, { day: "Tue", pct: 83 }, { day: "Wed", pct: 67 },
    { day: "Thu", pct: 100 }, { day: "Fri", pct: 50 }, { day: "Sat", pct: 83 },
    { day: "Sun", pct: adherence },
  ];

  // Monthly calendar dots (mock)
  const daysInMonth = 31;
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const pct = day <= 7 ? [100, 83, 67, 100, 50, 83, adherence][i] : Math.floor(Math.random() * 60) + 40;
    return { day, pct };
  });

  const getRefillColor = (remaining: number) =>
    remaining > 10 ? "bg-success" : remaining > 5 ? "bg-warning" : "bg-destructive";

  const getRefillTextColor = (remaining: number) =>
    remaining > 10 ? "text-success" : remaining > 5 ? "text-warning" : "text-destructive";

  const lastActive = profile?.last_active_at
    ? new Date(profile.last_active_at).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })
    : "Unknown";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={() => navigate("/")} className="text-foreground p-1"><ArrowLeft size={24} /></button>
        <h1 className="text-lg font-bold text-foreground">Caretaker Dashboard</h1>
        <LanguageToggle />
      </div>

      {/* Missed Alert */}
      {missedDoses.length > 0 && (
        <div className="mx-4 mt-4 bg-destructive/10 border border-destructive/30 rounded-2xl p-4 flex items-start gap-3 pulse-alert">
          <AlertTriangle className="text-destructive flex-shrink-0 mt-0.5" size={22} />
          <div>
            <h3 className="text-destructive font-bold text-sm">{t("missed_alert")}</h3>
            {missedDoses.map((d) => (
              <p key={d.id} className="text-destructive text-sm mt-0.5">{d.medicine.name} {d.medicine.dosage} — {d.scheduled_time}</p>
            ))}
          </div>
        </div>
      )}

      {/* Patient Summary Card */}
      {profile && (
        <div className="mx-4 mt-4 bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {profile.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-foreground">{profile.name}</h2>
                <p className="text-sm text-muted-foreground">Age {profile.age} · {profile.blood_group}</p>
              </div>
            </div>
            <button
              onClick={() => setShowEmergency(true)}
              className="bg-destructive/10 text-destructive px-3 py-2 rounded-xl text-xs font-bold hover:bg-destructive/20 transition-colors"
            >
              <ShieldAlert size={14} className="inline mr-1" />
              Emergency
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(profile.chronic_conditions || []).map((c, i) => (
              <span key={i} className="bg-secondary text-secondary-foreground px-2.5 py-1 rounded-lg text-xs font-semibold">{c}</span>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <Clock size={12} /> Last active: {lastActive}
          </div>
          {/* Allergies inline */}
          {profile.allergies && profile.allergies.length > 0 && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs font-bold text-destructive">Allergies:</span>
              {profile.allergies.map((a, i) => (
                <span key={i} className="bg-destructive/10 text-destructive px-2 py-0.5 rounded-md text-xs font-semibold">{a}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Selector */}
      <div className="flex mx-4 mt-5 bg-muted rounded-xl p-1 gap-1">
        {(["today", "history", "visits"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {tab === "today" ? "Today" : tab === "history" ? "History" : "Visits"}
          </button>
        ))}
      </div>

      {/* TODAY TAB */}
      {activeTab === "today" && (
        <div className="px-4 mt-5 space-y-5">
          {/* Adherence Circle */}
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
                <circle cx="60" cy="60" r="50" fill="none" className={ringStroke} strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${adherence * 3.14} ${314 - adherence * 3.14}`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-extrabold ${ringColor}`}>{adherence}%</span>
                <span className="text-xs text-muted-foreground">{t("adherence")}</span>
              </div>
            </div>
          </div>

          {/* Medicine Status */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Medicine Status</h3>
            {doses.map((d) => (
              <div key={d.id} className={`flex items-center justify-between bg-card rounded-xl p-3.5 border ${d.missed && !d.taken ? "border-destructive/30" : "border-border"}`}>
                <div>
                  <span className="text-sm font-semibold text-foreground">{d.medicine.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{d.medicine.dosage} · {d.scheduled_time}</span>
                </div>
                {d.taken ? (
                  <span className="w-8 h-8 rounded-full bg-success/15 flex items-center justify-center"><Check size={18} className="text-success" /></span>
                ) : (
                  <span className="w-8 h-8 rounded-full bg-destructive/15 flex items-center justify-center"><X size={18} className="text-destructive" /></span>
                )}
              </div>
            ))}
          </div>

          {/* Refill Tracker */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Refill Tracker</h3>
            {refills.map((r, i) => {
              const daysLeft = r.tablets_remaining;
              const pct = (r.tablets_remaining / r.total_tablets) * 100;
              return (
                <div key={i} className="bg-card rounded-xl border border-border p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-foreground">{r.medicine_name}</span>
                    <span className={`text-xs font-bold ${getRefillTextColor(daysLeft)}`}>{daysLeft} days left</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${getRefillColor(daysLeft)}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === "history" && (
        <div className="px-4 mt-5 space-y-5">
          {/* Weekly Chart */}
          <div>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">{t("weekly_adherence")}</h3>
            <div className="bg-card rounded-2xl border border-border p-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, 100]} />
                  <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
                    {weeklyData.map((entry, index) => (
                      <Cell key={index} fill={getColor(entry.pct)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Calendar */}
          <div>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">Monthly View — March 2026</h3>
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={i} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {/* offset for March 2026 starting Sunday */}
                {monthDays.map(({ day, pct }) => {
                  const dotColor = pct >= 80 ? "bg-success" : pct >= 50 ? "bg-warning" : "bg-destructive";
                  const today = new Date().getDate();
                  const isFuture = day > today;
                  return (
                    <div key={day} className={`flex flex-col items-center py-1.5 rounded-lg ${day === today ? "bg-primary/10" : ""}`}>
                      <span className={`text-xs font-medium ${isFuture ? "text-muted-foreground/40" : "text-foreground"}`}>{day}</span>
                      {!isFuture && <div className={`w-2 h-2 rounded-full mt-0.5 ${dotColor}`} />}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-success" /> ≥80%</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-warning" /> 50-80%</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-destructive" /> &lt;50%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISITS TAB */}
      {activeTab === "visits" && (
        <div className="px-4 mt-5 space-y-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Hospital Visits</h3>
          {visits.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No hospital visits recorded</p>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-4">
                {visits.map((v, i) => (
                  <div key={v.id} className="relative pl-12">
                    {/* Timeline dot */}
                    <div className="absolute left-3 top-4 w-4 h-4 rounded-full bg-primary border-2 border-card" />
                    <div className="bg-card rounded-2xl border border-border p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-base font-bold text-foreground">{v.hospital_name}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(v.visit_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <Activity size={18} className="text-primary" />
                      </div>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-foreground"><span className="font-semibold">Doctor:</span> {v.doctor_name}</p>
                        <p className="text-sm text-foreground"><span className="font-semibold">Diagnosis:</span> {v.diagnosis}</p>
                        {v.notes && <p className="text-sm text-muted-foreground mt-1">{v.notes}</p>}
                      </div>
                      {v.report_url && (
                        <button className="mt-3 flex items-center gap-2 text-sm text-primary font-semibold hover:underline">
                          <FileText size={14} /> View Report <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Realtime indicator */}
      <div className="flex items-center justify-center gap-2 mt-6 text-xs text-muted-foreground">
        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
        Live — updates in real-time
      </div>

      {/* Emergency Info Fullscreen */}
      {showEmergency && profile && (
        <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
          <div className="p-5 max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-extrabold text-destructive flex items-center gap-2">
                <ShieldAlert size={24} /> Emergency Info
              </h2>
              <button onClick={() => setShowEmergency(false)} className="text-foreground p-1"><X size={24} /></button>
            </div>

            <div className="space-y-4">
              <div className="bg-destructive/5 border-2 border-destructive/30 rounded-2xl p-5">
                <h3 className="text-lg font-extrabold text-foreground">{profile.name}</h3>
                <p className="text-muted-foreground">Age {profile.age} · Blood Group {profile.blood_group}</p>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-bold text-primary uppercase tracking-wide mb-2">Emergency Contact</h3>
                <a href={`tel:${profile.emergency_contact}`} className="flex items-center gap-3 text-lg font-bold text-foreground">
                  <Phone size={20} className="text-primary" /> {profile.emergency_contact}
                </a>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-bold text-primary uppercase tracking-wide mb-2">Allergies</h3>
                <div className="flex flex-wrap gap-2">
                  {(profile.allergies || []).map((a, i) => (
                    <span key={i} className="bg-destructive/10 text-destructive px-3 py-1.5 rounded-lg text-sm font-bold">{a}</span>
                  ))}
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-bold text-primary uppercase tracking-wide mb-2">Chronic Conditions</h3>
                <div className="flex flex-wrap gap-2">
                  {(profile.chronic_conditions || []).map((c, i) => (
                    <span key={i} className="bg-warning/10 text-warning px-3 py-1.5 rounded-lg text-sm font-bold">{c}</span>
                  ))}
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-bold text-primary uppercase tracking-wide mb-2">Critical Notes</h3>
                <p className="text-foreground leading-relaxed">{profile.emergency_notes}</p>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-bold text-primary uppercase tracking-wide mb-2">Current Medicines</h3>
                <div className="space-y-2">
                  {doses.map((d) => (
                    <div key={d.id} className="flex items-center gap-2">
                      <Pill size={14} className="text-primary" />
                      <span className="text-sm text-foreground">{d.medicine.name} {d.medicine.dosage} — {d.scheduled_time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaretakerDashboard;
