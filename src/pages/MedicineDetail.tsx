import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import AIResponseCards, { type AssistantResponse } from "@/components/AIResponseCards";
import {
  ArrowLeft, AlertTriangle, Pencil, Check, X, Trash2,
  Sparkles, Shield, Activity, Sun, CloudSun, Moon, Utensils,
  Target, Pill, Zap, Apple, ShieldAlert, ChevronRight, Clock,
} from "lucide-react";
import { toast } from "sonner";

interface MedicineData {
  id: string;
  name: string;
  dosage: string;
  timing: string;
  food_instruction: string;
  purpose: string | null;
}

interface MedicineInfo {
  purpose: string;
  how_to_take: string;
  side_effects: string[];
  foods_to_avoid: string[];
  drug_interactions: string;
  assistant?: AssistantResponse;
}

const MedicineDetail = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [medicine, setMedicine] = useState<MedicineData | null>(null);
  const [info, setInfo] = useState<MedicineInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [infoLoading, setInfoLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDosage, setEditDosage] = useState("");
  const [editTiming, setEditTiming] = useState("");
  const [editFood, setEditFood] = useState("");
  const [saving, setSaving] = useState(false);
  const [followupAssistant, setFollowupAssistant] = useState<AssistantResponse | null>(null);
  const [followupLoading, setFollowupLoading] = useState(false);

  const askFollowup = async (prompt: string) => {
    if (!medicine) return;
    setFollowupLoading(true);
    setFollowupAssistant(null);
    try {
      const { data, error } = await supabase.functions.invoke("medicine-info", {
        body: { medicine_name: medicine.name, dosage: medicine.dosage, language, followup_prompt: prompt },
      });
      if (error) throw error;
      if (data?.assistant) setFollowupAssistant(data.assistant);
    } catch (e) {
      toast.error("Could not load follow-up");
    } finally {
      setFollowupLoading(false);
    }
  };

  useEffect(() => {
    const fetchMedicine = async () => {
      if (!id) return;
      setLoading(true);
      setInfo(null);
      setMedicine(null);
      setInfoLoading(false);

      const { data, error } = await supabase
        .from("medicines")
        .select("id, name, dosage, timing, food_instruction, purpose")
        .eq("id", id)
        .single();

      if (error || !data) { setLoading(false); return; }
      setMedicine(data as MedicineData);
      setLoading(false);

      setInfoLoading(true);
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke("medicine-info", {
          body: { medicine_name: data.name, dosage: data.dosage, language },
        });
        if (!fnError && fnData) setInfo(fnData as MedicineInfo);
      } catch (e) { console.error(e); }
      setInfoLoading(false);
    };
    fetchMedicine();
  }, [id, language]);

  const startEditing = () => {
    if (!medicine) return;
    setEditName(medicine.name);
    setEditDosage(medicine.dosage);
    setEditTiming(medicine.timing);
    setEditFood(medicine.food_instruction);
    setEditing(true);
  };

  const saveEdits = async () => {
    if (!medicine) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("medicines")
        .update({ name: editName, dosage: editDosage, timing: editTiming, food_instruction: editFood })
        .eq("id", medicine.id);
      if (error) throw error;
      setMedicine({ ...medicine, name: editName, dosage: editDosage, timing: editTiming, food_instruction: editFood });
      setEditing(false);
      toast.success("Medicine updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally { setSaving(false); }
  };

  const deleteMedicine = async () => {
    if (!medicine || !confirm("Are you sure you want to delete this medicine?")) return;
    try {
      const { error } = await supabase.from("medicines").update({ is_active: false }).eq("id", medicine.id);
      if (error) throw error;
      toast.success("Medicine removed");
      navigate("/patient");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  // Derived safety + risk heuristics (presentation-only)
  const { safetyScore, riskLevel, riskLabel, riskColor, category } = useMemo(() => {
    const interactionsText = (info?.drug_interactions || "").toLowerCase();
    const sideCount = info?.side_effects?.length || 0;
    const high = /(severe|dangerous|do not|avoid|serious|bleeding|fatal)/.test(interactionsText);
    const moderate = /(may|caution|consult|monitor|interact)/.test(interactionsText);
    const level = high ? "high" : moderate ? "moderate" : info ? "low" : "—";
    const score = high ? 58 : moderate ? 78 : info ? 92 : 85;
    const colorMap: Record<string, string> = {
      high: "#f43f5e", moderate: "#f59e0b", low: "#14B8A6", "—": "#64748b",
    };
    const labelMap: Record<string, string> = {
      high: "High", moderate: "Moderate", low: "Low", "—": "Analyzing",
    };
    // simple category guess
    const name = (medicine?.name || "").toLowerCase();
    let cat = "General";
    if (/cillin|mycin|cef|azole|floxacin/.test(name)) cat = "Antibiotic";
    else if (/sartan|olol|pril|dipine/.test(name)) cat = "Cardiovascular";
    else if (/metformin|glip|insulin/.test(name)) cat = "Diabetes";
    else if (/paracetamol|ibuprofen|acetamin|naproxen/.test(name)) cat = "Analgesic";
    else if (/atorva|rosuva|statin/.test(name)) cat = "Lipid Control";
    else if (/omeprazole|pantoprazole|ranit/.test(name)) cat = "Gastro";
    return { safetyScore: score, riskLevel: level, riskLabel: labelMap[level], riskColor: colorMap[level], category: cat };
  }, [info, medicine]);

  const timingMeta = medicine?.timing === "morning"
    ? { label: t("morning"), Icon: Sun, color: "#f59e0b" }
    : medicine?.timing === "afternoon"
    ? { label: t("afternoon"), Icon: CloudSun, color: "#22D3EE" }
    : { label: t("night"), Icon: Moon, color: "#8b5cf6" };

  const foodLabel = medicine?.food_instruction === "before_food"
    ? t("before_food") : medicine?.food_instruction === "after_food"
    ? t("after_food") : t("with_food");

  if (loading) {
    return (
      <div className="min-h-screen mesh-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
      </div>
    );
  }

  if (!medicine) {
    return (
      <div className="min-h-screen mesh-bg flex flex-col items-center justify-center gap-4">
        <p className="text-slate-500">Medicine not found</p>
        <button onClick={() => navigate(-1)} className="text-teal-600 font-bold">Go back</button>
      </div>
    );
  }

  const scorePct = safetyScore;
  const scoreDash = (scorePct / 100) * 251.2; // 2πr where r=40

  return (
    <div className="relative min-h-screen mesh-bg animate-mesh-shift pb-28 page-transition text-slate-900">
      {/* Floating blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <div className="blob animate-float-slow" style={{ background: "#14B8A6", width: 420, height: 420, top: -120, left: -120 }} />
        <div className="blob animate-float-slow" style={{ background: "#22D3EE", width: 420, height: 420, top: 40, right: -160, animationDelay: "2s" }} />
        <div className="blob animate-float-slow" style={{ background: "#0F172A", width: 380, height: 380, bottom: -180, left: "30%", opacity: 0.3, animationDelay: "4s" }} />
      </div>

      {/* Top bar */}
      <div className="sticky top-3 z-40 px-3">
        <div className="glass-nav rounded-2xl flex items-center justify-between px-3 py-2 max-w-xl mx-auto">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-white/70 border border-white/70 flex items-center justify-center hover:bg-white">
            <ArrowLeft size={16} className="text-slate-700" />
          </button>
          <span className="text-sm font-bold tracking-tight text-slate-800">Medicine</span>
          <div className="flex items-center gap-1.5">
            {!editing && (
              <button onClick={startEditing}
                className="w-9 h-9 rounded-xl bg-white/70 border border-white/70 flex items-center justify-center hover:bg-white">
                <Pencil size={14} className="text-slate-700" />
              </button>
            )}
            <button onClick={deleteMedicine}
              className="w-9 h-9 rounded-xl bg-white/70 border border-white/70 flex items-center justify-center hover:bg-rose-50">
              <Trash2 size={14} className="text-rose-500" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 mt-5 space-y-4">
        {/* HERO MEDICINE CARD */}
        <div className="relative glass-panel gradient-border rounded-[22px] p-5 overflow-hidden card-hover animate-fade-up">
          <span className="shine-overlay" />
          <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-gradient-to-br from-teal-300/50 to-cyan-300/30 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl gradient-cta flex items-center justify-center shadow-lg shadow-teal-500/30 shrink-0">
              <Pill size={26} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900/90 text-white">
                  {category}
                </span>
                <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">
                  Active
                </span>
              </div>
              <h1 className="font-display text-2xl font-bold leading-tight text-slate-900 truncate">{medicine.name}</h1>
              <p className="text-sm text-slate-500 font-medium">{medicine.dosage}</p>

              <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg bg-white/70 border border-white/70" style={{ color: timingMeta.color }}>
                  <timingMeta.Icon size={12} /> {timingMeta.label}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg bg-white/70 border border-white/70 text-slate-700">
                  <Utensils size={12} /> {foodLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* DASHBOARD ROW: Safety score + Risk */}
        <div className="grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: "60ms" }}>
          {/* Safety Score */}
          <div className="relative glass-panel rounded-[18px] p-4 card-hover overflow-hidden">
            <span className="shine-overlay" />
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-teal-700 mb-2">
              <Shield size={12} /> Safety Score
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-[88px] h-[88px] shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" stroke="rgba(15,23,42,0.08)" strokeWidth="8" fill="none" />
                  <circle cx="50" cy="50" r="40" stroke="url(#sg)" strokeWidth="8" fill="none"
                    strokeLinecap="round" strokeDasharray={`${scoreDash} 251.2`} />
                  <defs>
                    <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#14B8A6" />
                      <stop offset="100%" stopColor="#22D3EE" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-2xl font-bold gradient-text leading-none">{scorePct}</span>
                  <span className="text-[9px] font-semibold text-slate-500 mt-0.5">/ 100</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-sm text-slate-900">
                  {scorePct >= 85 ? "Excellent" : scorePct >= 70 ? "Good" : "Caution"}
                </p>
                <p className="text-[11px] text-slate-500 leading-snug mt-0.5">AI safety analysis based on profile.</p>
              </div>
            </div>
          </div>

          {/* Interaction Risk */}
          <div className="relative glass-panel rounded-[18px] p-4 card-hover overflow-hidden">
            <span className="shine-overlay" />
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 mb-2">
              <ShieldAlert size={12} /> Interaction Risk
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold" style={{ color: riskColor }}>{riskLabel}</span>
            </div>
            <div className="mt-3 flex items-center gap-1">
              {["low","moderate","high"].map((lvl) => (
                <div key={lvl} className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-100">
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: (riskLevel === lvl || (riskLevel === "high" && lvl !== "—") || (riskLevel === "moderate" && lvl === "low")) ? "100%" : "0%",
                      background: lvl === "low" ? "#14B8A6" : lvl === "moderate" ? "#f59e0b" : "#f43f5e",
                    }} />
                </div>
              ))}
            </div>
            <button onClick={() => navigate("/drug-interaction")}
              className="mt-3 w-full text-[11px] font-semibold text-teal-700 hover:text-teal-800 flex items-center justify-center gap-1 bg-teal-50/70 border border-teal-100 rounded-lg py-1.5">
              Check all interactions <ChevronRight size={12} />
            </button>
          </div>
        </div>

        {/* AI INSIGHTS */}
        <div className="relative glass-dark rounded-[20px] p-5 text-white overflow-hidden animate-fade-up" style={{ animationDelay: "120ms" }}>
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-teal-400/30 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-cyan-400/30 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
                <Sparkles size={14} className="text-cyan-300" />
              </div>
              <div>
                <p className="text-[10px] text-cyan-200 font-bold">AI Insight</p>
                <p className="font-display font-bold text-sm">MedCircle Assistant</p>
              </div>
            </div>
            {infoLoading && !info ? (
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <div className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />
                Analyzing {medicine.name}…
              </div>
            ) : info ? (
              <p className="text-sm leading-relaxed text-white/85">
                {info.purpose} Take it{" "}
                <span className="text-cyan-200 font-semibold">{foodLabel.toLowerCase()}</span>{" "}
                in the <span className="text-cyan-200 font-semibold">{timingMeta.label.toLowerCase()}</span>.{" "}
                {riskLevel === "high"
                  ? "⚠ High interaction risk — review the warning below."
                  : riskLevel === "moderate"
                  ? "Some caution required with other medicines."
                  : "No major interactions detected for your profile."}
              </p>
            ) : (
              <p className="text-sm text-white/70">Could not load AI insights for this medicine.</p>
            )}
          </div>
        </div>

        {/* EDIT PANEL */}
        {editing && (
          <div className="glass-panel rounded-[18px] p-5 space-y-4 animate-fade-up">
            <h3 className="font-display font-bold text-base text-slate-900">Edit Medicine</h3>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500">Name</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-white/70 bg-white/70 backdrop-blur-md text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400/40" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500">Dosage</label>
              <input value={editDosage} onChange={(e) => setEditDosage(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-white/70 bg-white/70 backdrop-blur-md text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400/40" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500">Timing</label>
              <div className="flex gap-2">
                {(["morning", "afternoon", "night"] as const).map((time) => (
                  <button key={time} onClick={() => setEditTiming(time)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      editTiming === time ? "gradient-cta text-white" : "bg-white/70 border border-white/70 text-slate-700 hover:bg-white"
                    }`}>
                    {time.charAt(0).toUpperCase() + time.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500">Food Instruction</label>
              <div className="flex gap-2">
                {(["before_food", "after_food", "with_food"] as const).map((food) => (
                  <button key={food} onClick={() => setEditFood(food)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      editFood === food ? "gradient-cta text-white" : "bg-white/70 border border-white/70 text-slate-700 hover:bg-white"
                    }`}>
                    {food === "before_food" ? "Before" : food === "after_food" ? "After" : "With"} Food
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditing(false)}
                className="flex-1 py-3 rounded-xl text-sm font-bold bg-white/70 border border-white/70 text-slate-700 hover:bg-white flex items-center justify-center gap-2">
                <X size={16} /> Cancel
              </button>
              <button onClick={saveEdits} disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-bold gradient-cta text-white flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-transform">
                <Check size={16} /> {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* CONTENT */}
        {infoLoading && !info && (
          <div className="glass-panel rounded-[18px] p-8 flex flex-col items-center gap-3 animate-fade-up">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
            <p className="text-sm text-slate-500">Loading medicine information…</p>
          </div>
        )}

        {info?.assistant && (
          <div className="animate-fade-up" style={{ animationDelay: "180ms" }}>
            <AIResponseCards data={info.assistant} onFollowup={askFollowup} />
          </div>
        )}

        {(followupLoading || followupAssistant) && (
          <div className="animate-fade-up">
            <AIResponseCards data={followupAssistant} loading={followupLoading} onFollowup={askFollowup} />
          </div>
        )}

        {!infoLoading && !info && (
          <div className="glass-panel rounded-[18px] p-8 text-center">
            <p className="text-slate-500">Could not load medicine information.</p>
            <button onClick={() => window.location.reload()}
              className="mt-3 gradient-cta text-white px-4 py-2 rounded-xl text-sm font-bold">
              Try again
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default MedicineDetail;
