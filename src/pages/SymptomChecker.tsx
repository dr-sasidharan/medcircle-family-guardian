import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import LanguageToggle from "@/components/LanguageToggle";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Stethoscope, AlertTriangle, Loader2, Languages, History, Clock } from "lucide-react";
import { toast } from "sonner";

const QUICK_SYMPTOMS = [
  "Dizziness", "Nausea", "Headache", "Stomach Pain", "Fatigue",
  "Rash", "Chest Pain", "Swelling", "Blurred Vision", "Dry Mouth",
];

interface SymptomResult {
  is_side_effect: boolean;
  likely_medicine: string;
  urgency: "EMERGENCY" | "URGENT" | "MONITOR" | "NORMAL";
  urgency_color: "red" | "orange" | "yellow" | "green";
  what_to_do: string[];
  tamil_explanation: string;
  summary: string;
  patient_name?: string;
}

interface HistoryItem {
  id: string;
  symptom: string;
  urgency: string;
  urgency_color: string;
  likely_medicine: string | null;
  is_side_effect: boolean;
  summary: string | null;
  what_to_do: string[];
  tamil_explanation: string | null;
  created_at: string;
}

const urgencyConfig: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  EMERGENCY: { bg: "bg-red-600", text: "text-white", label: "EMERGENCY — Call 108 Now", icon: "🚨" },
  URGENT: { bg: "bg-orange-500", text: "text-white", label: "URGENT — Call Doctor Today", icon: "⚠️" },
  MONITOR: { bg: "bg-yellow-400", text: "text-yellow-900", label: "MONITOR — Watch for 24 hours", icon: "👀" },
  NORMAL: { bg: "bg-green-500", text: "text-white", label: "NORMAL — Likely side effect", icon: "✅" },
};

const urgencyDot: Record<string, string> = {
  red: "bg-red-500", orange: "bg-orange-500", yellow: "bg-yellow-400", green: "bg-green-500",
};

const SymptomChecker = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"check" | "history">("check");
  const [symptom, setSymptom] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SymptomResult | null>(null);
  const [showTamil, setShowTamil] = useState(false);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profiles } = await supabase.from("patient_profiles").select("id, name, age, emergency_contact").eq("user_id", user.id).limit(1);
    if (profiles?.length) setProfile(profiles[0]);

    const { data: meds } = await supabase.from("medicines").select("name, dosage, timing, food_instruction").eq("is_active", true);
    setMedicines(meds || []);
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!profile?.id) return;
    setHistoryLoading(true);
    const { data } = await supabase
      .from("symptom_checks")
      .select("*")
      .eq("patient_profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setHistory((data || []) as any);
    setHistoryLoading(false);
  }, [profile?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (tab === "history") fetchHistory(); }, [tab, fetchHistory]);

  const saveToHistory = async (symptomText: string, data: SymptomResult) => {
    if (!profile?.id) return;
    await supabase.from("symptom_checks").insert({
      patient_profile_id: profile.id,
      symptom: symptomText,
      urgency: data.urgency,
      urgency_color: data.urgency_color,
      likely_medicine: data.likely_medicine,
      is_side_effect: data.is_side_effect,
      summary: data.summary,
      what_to_do: data.what_to_do,
      tamil_explanation: data.tamil_explanation,
    } as any);
  };

  const checkSymptom = async (symptomText: string) => {
    if (!symptomText.trim()) {
      toast.error("Please describe your symptom");
      return;
    }
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("symptom-checker", {
        body: {
          symptom: symptomText.trim(),
          medicines,
          age: profile?.age || 62,
          patientName: profile?.name || "Patient",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data as SymptomResult);
      await saveToHistory(symptomText.trim(), data as SymptomResult);

      if (data.urgency === "EMERGENCY" || data.urgency === "URGENT") {
        notifyCaretakers(symptomText, data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to check symptom");
    } finally {
      setLoading(false);
    }
  };

  const notifyCaretakers = async (symptomText: string, data: SymptomResult) => {
    try {
      if (!profile?.id) return;
      const { data: caretakers } = await supabase
        .from("caretakers")
        .select("name, phone")
        .eq("patient_profile_id", profile.id)
        .eq("is_active", true);

      if (caretakers && caretakers.length > 0) {
        const message = encodeURIComponent(
          `🚨 MedCircle Health Alert\n\n${profile?.name || "Patient"} reported: ${symptomText}\nUrgency level: ${data.urgency}\nPossible cause: ${data.likely_medicine}\n\nPlease check on them immediately.\nPatient phone: ${profile?.emergency_contact || "N/A"}\n\n— MedCircle Family Guardian`
        );
        const firstPhone = caretakers[0].phone.replace(/\s+/g, "").replace("+", "");
        window.open(`https://wa.me/${firstPhone}?text=${message}`, "_blank");
        toast.info(`Alert sent to ${caretakers[0].name} via WhatsApp`);
      }
    } catch { /* silent */ }
  };

  const cfg = result ? urgencyConfig[result.urgency] : null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  // Count symptoms for pattern detection
  const symptomCounts: Record<string, number> = {};
  history.forEach((h) => {
    const key = h.symptom.toLowerCase();
    symptomCounts[key] = (symptomCounts[key] || 0) + 1;
  });
  const repeatedSymptoms = Object.entries(symptomCounts)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="min-h-screen bg-surface pb-24 page-transition">
      {/* Header */}
      <div
        className="text-white p-5 rounded-b-[28px] relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f766e 0%, #134e4a 60%, #0c3532 100%)" }}
      >
        <div className="absolute top-[-40px] right-[-40px] w-[140px] h-[140px] rounded-full bg-white/5 animate-float" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20">
                <ArrowLeft size={18} />
              </button>
              <h1 className="text-xl font-heading font-bold">Check My Symptoms</h1>
            </div>
            <LanguageToggle />
          </div>
          <p className="text-white/60 text-sm mt-1">AI-powered symptom analysis based on your medicines</p>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setTab("check")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-heading font-bold transition-colors ${
                tab === "check" ? "bg-white text-primary" : "bg-white/10 text-white/70"
              }`}
            >
              <Stethoscope size={14} className="inline mr-1.5 -mt-0.5" />
              Check
            </button>
            <button
              onClick={() => setTab("history")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-heading font-bold transition-colors ${
                tab === "history" ? "bg-white text-primary" : "bg-white/10 text-white/70"
              }`}
            >
              <History size={14} className="inline mr-1.5 -mt-0.5" />
              History
            </button>
          </div>
        </div>
      </div>

      {/* CHECK TAB */}
      {tab === "check" && (
        <div className="px-4 mt-5 space-y-5">
          <div>
            <label className="text-base font-heading font-bold text-foreground mb-2 block">
              What symptom are you experiencing right now?
            </label>
            <textarea
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
              placeholder="e.g. dizziness, stomach pain, headache, rash..."
              className="w-full bg-card border border-border rounded-2xl px-4 py-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px] resize-none"
              maxLength={500}
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-2">Quick select:</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_SYMPTOMS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setSymptom(s); checkSymptom(s); }}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                    symptom === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => checkSymptom(symptom)}
            disabled={loading || !symptom.trim()}
            className="w-full text-white rounded-2xl py-4 text-lg font-heading font-bold shadow-lg hover:opacity-90 transition-opacity glow-teal disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}
          >
            {loading ? (
              <><Loader2 size={20} className="animate-spin" /> Analyzing...</>
            ) : (
              <><Stethoscope size={20} /> Check Now</>
            )}
          </button>

          {result && cfg && (
            <div className="space-y-4 animate-slide-up">
              <div className={`${cfg.bg} rounded-2xl p-5 text-center shadow-lg`}>
                <span className="text-3xl">{cfg.icon}</span>
                <h2 className={`text-xl font-heading font-extrabold ${cfg.text} mt-2`}>{cfg.label}</h2>
                <p className={`${cfg.text} opacity-80 text-sm mt-1`}>{result.summary}</p>
              </div>

              {result.urgency === "EMERGENCY" && (
                <a href="tel:108" className="block w-full bg-red-600 text-white rounded-2xl py-4 text-center text-xl font-heading font-extrabold shadow-xl animate-pulse">
                  🚨 Call 108 — Emergency
                </a>
              )}

              {result.is_side_effect && (
                <div className="bg-card rounded-2xl p-4 border border-border shadow-sm" style={{ borderLeft: "4px solid #f59e0b" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={18} className="text-[#f59e0b]" />
                    <h3 className="font-heading font-bold text-foreground">Likely Cause</h3>
                  </div>
                  <p className="text-base font-semibold text-foreground">{result.likely_medicine}</p>
                  <p className="text-xs text-muted-foreground mt-1">This medicine may be causing your symptom</p>
                </div>
              )}

              <div className="bg-card rounded-2xl p-4 border border-border shadow-sm" style={{ borderLeft: "4px solid #0d9488" }}>
                <h3 className="font-heading font-bold text-foreground mb-3">What to do right now</h3>
                <div className="space-y-2">
                  {result.what_to_do.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-sm text-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={() => setShowTamil(!showTamil)} className="w-full bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Languages size={18} className="text-primary" />
                  <span className="font-heading font-bold text-foreground text-sm">Tamil Explanation</span>
                </div>
                <span className="text-muted-foreground text-sm">{showTamil ? "Hide" : "Show"}</span>
              </button>
              {showTamil && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 animate-slide-up">
                  <p className="text-base text-foreground leading-relaxed">{result.tamil_explanation}</p>
                </div>
              )}

              <div className="bg-muted/50 rounded-2xl p-4 text-center">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  ⚕️ This is not a medical diagnosis. Always consult your doctor.
                  <br />In emergency call <a href="tel:108" className="text-destructive font-bold underline">108</a> immediately.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === "history" && (
        <div className="px-4 mt-5 space-y-5">
          {/* Pattern Detection */}
          {repeatedSymptoms.length > 0 && (
            <div className="bg-card rounded-2xl p-4 border border-border shadow-sm" style={{ borderLeft: "4px solid #8b5cf6" }}>
              <h3 className="font-heading font-bold text-foreground mb-2 flex items-center gap-2">
                <span className="text-lg">📊</span> Recurring Patterns
              </h3>
              <div className="space-y-1.5">
                {repeatedSymptoms.slice(0, 5).map(([sym, count]) => (
                  <div key={sym} className="flex items-center justify-between">
                    <span className="text-sm text-foreground capitalize">{sym}</span>
                    <span className="text-xs font-bold bg-[#8b5cf6]/10 text-[#8b5cf6] px-2 py-0.5 rounded-full">
                      {count} times
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">💡 Mention these patterns to your doctor</p>
            </div>
          )}

          {historyLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <Stethoscope size={40} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">No symptom checks yet</p>
              <button onClick={() => setTab("check")} className="mt-3 text-primary font-heading font-bold text-sm">
                Check your first symptom →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((h, idx) => {
                const isExpanded = expandedHistoryId === h.id;
                const hCfg = urgencyConfig[h.urgency] || urgencyConfig.NORMAL;
                return (
                  <div
                    key={h.id}
                    className="bg-card rounded-[18px] overflow-hidden animate-slide-up"
                    style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)", animationDelay: `${idx * 50}ms` }}
                  >
                    <button
                      onClick={() => setExpandedHistoryId(isExpanded ? null : h.id)}
                      className="w-full p-4 text-left flex items-center gap-3"
                    >
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${urgencyDot[h.urgency_color] || "bg-muted"}`} />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading font-bold text-sm text-foreground truncate">{h.symptom}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Clock size={12} className="text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{formatDate(h.created_at)}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${hCfg.bg} ${hCfg.text}`}>
                        {h.urgency}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-border pt-3 animate-slide-up">
                        {h.summary && (
                          <p className="text-sm text-foreground">{h.summary}</p>
                        )}
                        {h.is_side_effect && h.likely_medicine && (
                          <div className="flex items-center gap-2 text-sm">
                            <AlertTriangle size={14} className="text-[#f59e0b]" />
                            <span className="text-foreground">Likely caused by <strong>{h.likely_medicine}</strong></span>
                          </div>
                        )}
                        {h.what_to_do && h.what_to_do.length > 0 && (
                          <div className="space-y-1.5">
                            {h.what_to_do.map((item, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                                <p className="text-xs text-foreground">{item}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {h.tamil_explanation && (
                          <div className="bg-primary/5 rounded-xl p-3">
                            <p className="text-xs text-foreground">{h.tamil_explanation}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default SymptomChecker;
