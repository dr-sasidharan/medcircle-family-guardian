import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import LanguageToggle from "@/components/LanguageToggle";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { User, Users, Plus, Phone, Mail, Heart, X, FileText, FlaskConical, Settings, ArrowLeft, Crown, Pencil } from "lucide-react";
import EmergencyQRSection from "@/components/EmergencyQRSection";
import EditProfileSheet from "@/components/EditProfileSheet";
import { toast } from "sonner";

interface Caretaker { id: string; name: string; relationship: string; phone: string; email: string | null; }
interface PatientProfile { id: string; name: string; age: number; blood_group: string | null; allergies: string[] | null; chronic_conditions: string[] | null; emergency_contact: string | null; emergency_token: string; photo_url: string | null; medcircle_code: string | null; }

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [caretakers, setCaretakers] = useState<Caretaker[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [patientPlan, setPatientPlan] = useState("free");
  const [newName, setNewName] = useState("");
  const [newRelation, setNewRelation] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isAddingCaretaker, setIsAddingCaretaker] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profiles } = await supabase.from("patient_profiles").select("*").eq("user_id", user.id).limit(1);
    if (profiles && profiles.length > 0) {
      setProfile(profiles[0] as any);
      setPatientPlan((profiles[0] as any).plan || "free");
      const { data: ct } = await supabase.from("caretakers").select("*").eq("patient_profile_id", profiles[0].id).eq("is_active", true).order("created_at");
      setCaretakers((ct || []) as any);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel("profile-rt").on("postgres_changes", { event: "*", schema: "public", table: "caretakers" }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const addCaretaker = async () => {
    if (isAddingCaretaker) return;
    if (!newName.trim() || !newRelation.trim() || !newPhone.trim() || !profile) { toast.error("Please fill name, relationship, and phone"); return; }
    const digitsOnlyPhone = newPhone.replace(/\D/g, "");
    if (digitsOnlyPhone.length < 10) { toast.error("Please enter a valid phone number"); return; }
    const trimmedEmail = newEmail.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { toast.error("Please enter a valid email address"); return; }
    setIsAddingCaretaker(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) { toast.error("Please sign in again"); return; }
      const { error } = await supabase.from("caretakers").insert({ patient_profile_id: profile.id, name: newName.trim(), relationship: newRelation.trim(), phone: newPhone.trim(), email: trimmedEmail || null });
      if (error) throw error;
      toast.success(`${newName.trim()} added as caretaker!`);
      setNewName(""); setNewRelation(""); setNewPhone(""); setNewEmail(""); setShowAdd(false);
      await fetchData();
    } catch (error: any) { toast.error(error?.message || "Failed to add caretaker"); } finally { setIsAddingCaretaker(false); }
  };

  const removeCaretaker = async (id: string) => {
    await supabase.from("caretakers").update({ is_active: false }).eq("id", id);
    toast.success("Caretaker removed"); fetchData();
  };

  return (
    <div className="min-h-screen bg-background pb-24 page-transition">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-5 relative overflow-hidden">
        <div className="absolute top-[-40px] right-[-40px] w-[140px] h-[140px] rounded-full bg-white/5" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20"><ArrowLeft size={18} /></button>
              <h1 className="text-xl font-bold text-white">Profile</h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate("/settings")} className="p-2 rounded-xl bg-white/10 hover:bg-white/20"><Settings size={18} /></button>
              <LanguageToggle />
            </div>
          </div>
          {profile && (
            <div className="bg-white/10 rounded-2xl p-4 mt-2 flex items-center gap-4">
              {profile.photo_url ? (
                <img src={profile.photo_url} alt={profile.name} className="w-14 h-14 object-cover rounded-[14px] flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 flex items-center justify-center text-xl font-bold bg-white/20 rounded-[14px] text-white flex-shrink-0">{profile.name.charAt(0)}</div>
              )}
              <div className="flex-1">
                <h2 className="font-bold text-xl text-white">{profile.name}</h2>
                <p className="text-white/60 text-sm">Age {profile.age} · Blood Group {profile.blood_group}</p>
                {profile.medcircle_code && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="bg-white/20 text-white/90 px-2.5 py-1 rounded-full text-xs font-mono font-bold tracking-widest">🆔 {profile.medcircle_code}</span>
                    <span className="text-white/40 text-[10px]">Share with caretaker</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(profile.chronic_conditions || []).map((c, i) => (
                    <span key={i} className="bg-white/20 text-white/90 px-2 py-0.5 rounded-full text-[10px] font-semibold">{c}</span>
                  ))}
                </div>
              </div>
              <button onClick={() => setShowEdit(true)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 flex-shrink-0"><Pencil size={16} /></button>
            </div>
          )}
        </div>
      </div>

      {/* Allergies */}
      {profile?.allergies && profile.allergies.length > 0 && (
        <div className="px-4 mt-4">
          <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 animate-slide-in-left" style={{ borderLeftWidth: "4px", borderLeftColor: "hsl(var(--destructive))" }}>
            <h3 className="text-sm font-bold text-destructive mb-2">⚠️ Allergies</h3>
            <div className="flex flex-wrap gap-2">
              {profile.allergies.map((a, i) => (
                <span key={i} className="bg-destructive/10 text-destructive px-3 py-1 rounded-lg text-sm font-semibold">{a}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* My Care Circle */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-full px-3 py-1.5">
              <Users size={14} className="text-violet-500" />
              <span className="font-bold text-sm text-foreground">My Care Circle</span>
            </div>
            <div className="flex-1 h-[1px] bg-border rounded-full" />
          </div>
          <button onClick={() => patientPlan === "free" ? setShowUpgradePrompt(true) : setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-sm">
            <Plus size={14} /> Add
          </button>
        </div>

        <div className="space-y-3">
          {caretakers.map((ct, idx) => (
            <div key={ct.id} className="bg-card border border-border rounded-2xl p-4 animate-slide-up shadow-sm"
              style={{ borderLeftWidth: "4px", borderLeftColor: "hsl(258, 90%, 66%)", animationDelay: `${idx * 80}ms` }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-[14px] flex items-center justify-center bg-violet-100"><Heart size={18} className="text-violet-500" /></div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">{ct.name}</h3>
                    <p className="text-xs text-muted-foreground">{ct.relationship}</p>
                  </div>
                </div>
                <button onClick={() => removeCaretaker(ct.id)} className="text-muted-foreground hover:text-destructive p-1"><X size={16} /></button>
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone size={14} className="text-primary" /> {ct.phone}</div>
                {ct.email && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail size={14} className="text-primary" /> {ct.email}</div>}
              </div>
            </div>
          ))}
          {caretakers.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No caretakers added yet</p>}
        </div>
      </div>

      {/* Upgrade Prompt */}
      {showUpgradePrompt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-md p-6 space-y-4 animate-fade-in shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-foreground">Upgrade Required</h2>
              <button onClick={() => setShowUpgradePrompt(false)} className="text-muted-foreground p-1"><X size={20} /></button>
            </div>
            <div className="flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-2xl p-4">
              <Crown size={24} className="text-violet-500 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-base text-foreground">Care Circle is a Premium Feature</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Add caretakers who can monitor your medicines and health remotely.</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowUpgradePrompt(false)} className="flex-1 py-3 rounded-xl text-sm font-bold bg-muted text-muted-foreground hover:bg-accent">Maybe Later</button>
              <button onClick={() => { setShowUpgradePrompt(false); navigate("/pricing"); }}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}>View Plans</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Caretaker Form */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4">
          <form onSubmit={(e) => { e.preventDefault(); addCaretaker(); }}
            className="bg-card rounded-2xl border border-border p-6 space-y-4 animate-fade-in max-h-[90vh] overflow-y-auto w-full shadow-xl" style={{ maxWidth: "520px" }}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-foreground">Add Caretaker</h2>
              <button type="button" onClick={() => setShowAdd(false)} className="text-muted-foreground p-1"><X size={20} /></button>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1 block">Name *</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. Priya" />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1 block">Relationship *</label>
              <input value={newRelation} onChange={(e) => setNewRelation(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. Daughter" />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1 block">Phone *</label>
              <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} type="tel" className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1 block">Email</label>
              <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="priya@email.com" />
            </div>
            <button type="submit" disabled={isAddingCaretaker} className="w-full bg-primary text-primary-foreground rounded-2xl py-4 text-lg font-bold disabled:opacity-60 shadow-lg">
              {isAddingCaretaker ? "Adding..." : "Add Caretaker"}
            </button>
          </form>
        </div>
      )}

      {profile && <EmergencyQRSection emergencyToken={profile.emergency_token} patientName={profile.name} bloodGroup={profile.blood_group} allergies={profile.allergies} emergencyContact={profile.emergency_contact} />}

      {/* Quick Links */}
      <div className="px-4 mt-6 space-y-3">
        <button onClick={() => navigate("/doctor-summary")}
          className="w-full bg-card border border-border rounded-2xl p-4 text-left flex items-center gap-3 animate-slide-up shadow-sm hover:shadow-md transition-shadow"
          style={{ borderLeftWidth: "4px", borderLeftColor: "hsl(var(--primary))" }}>
          <div className="w-[46px] h-[46px] rounded-[14px] flex items-center justify-center bg-primary/10"><FileText size={20} className="text-primary" /></div>
          <div>
            <h3 className="font-bold text-[15px] text-foreground">Doctor Visit Summary</h3>
            <p className="text-xs text-muted-foreground">AI-generated summary for your doctor</p>
          </div>
        </button>
        <button onClick={() => navigate("/drug-interaction")}
          className="w-full bg-card border border-border rounded-2xl p-4 text-left flex items-center gap-3 animate-slide-up shadow-sm hover:shadow-md transition-shadow"
          style={{ borderLeftWidth: "4px", borderLeftColor: "hsl(var(--warning))", animationDelay: "80ms" }}>
          <div className="w-[46px] h-[46px] rounded-[14px] flex items-center justify-center bg-warning/10"><FlaskConical size={20} className="text-warning" /></div>
          <div>
            <h3 className="font-bold text-[15px] text-foreground">Drug Interaction Checker</h3>
            <p className="text-xs text-muted-foreground">Check if your medicines interact</p>
          </div>
        </button>
        <button onClick={() => navigate("/pricing")}
          className="w-full bg-card border border-border rounded-2xl p-4 text-left flex items-center gap-3 animate-slide-up shadow-sm hover:shadow-md transition-shadow"
          style={{ borderLeftWidth: "4px", borderLeftColor: "hsl(258, 90%, 66%)", animationDelay: "160ms" }}>
          <div className="w-[46px] h-[46px] rounded-[14px] flex items-center justify-center bg-violet-100"><Crown size={20} className="text-violet-500" /></div>
          <div>
            <h3 className="font-bold text-[15px] text-foreground">Upgrade Plan</h3>
            <p className="text-xs text-muted-foreground">Unlock all features</p>
          </div>
        </button>
      </div>

      {profile && <EditProfileSheet open={showEdit} onClose={() => setShowEdit(false)} profile={profile} onSaved={fetchData} />}
      <BottomNav />
    </div>
  );
};

export default Profile;
