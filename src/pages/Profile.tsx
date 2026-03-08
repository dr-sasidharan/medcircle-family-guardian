import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import LanguageToggle from "@/components/LanguageToggle";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { User, Users, Plus, Phone, Mail, Heart, X, FileText, FlaskConical, Settings, ArrowLeft, Crown, Pencil } from "lucide-react";
import EmergencyQRSection from "@/components/EmergencyQRSection";
import EditProfileSheet from "@/components/EditProfileSheet";
import { toast } from "sonner";

interface Caretaker {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string | null;
}

interface PatientProfile {
  id: string;
  name: string;
  age: number;
  blood_group: string | null;
  allergies: string[] | null;
  chronic_conditions: string[] | null;
  emergency_contact: string | null;
  emergency_token: string;
  photo_url: string | null;
  medcircle_code: string | null;
}

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
      const { data: ct } = await supabase
        .from("caretakers")
        .select("*")
        .eq("patient_profile_id", profiles[0].id)
        .eq("is_active", true)
        .order("created_at");
      setCaretakers((ct || []) as any);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel("profile-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "caretakers" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const addCaretaker = async () => {
    if (isAddingCaretaker) return;

    if (!newName.trim() || !newRelation.trim() || !newPhone.trim() || !profile) {
      toast.error("Please fill name, relationship, and phone");
      return;
    }

    const digitsOnlyPhone = newPhone.replace(/\D/g, "");
    if (digitsOnlyPhone.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }

    const trimmedEmail = newEmail.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsAddingCaretaker(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        toast.error("Please sign in again");
        return;
      }

      const { error } = await supabase.from("caretakers").insert({
        patient_profile_id: profile.id,
        name: newName.trim(),
        relationship: newRelation.trim(),
        phone: newPhone.trim(),
        email: trimmedEmail || null,
      });

      if (error) throw error;

      toast.success(`${newName.trim()} added as caretaker!`);
      setNewName("");
      setNewRelation("");
      setNewPhone("");
      setNewEmail("");
      setShowAdd(false);
      await fetchData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to add caretaker");
    } finally {
      setIsAddingCaretaker(false);
    }
  };

  const removeCaretaker = async (id: string) => {
    await supabase.from("caretakers").update({ is_active: false }).eq("id", id);
    toast.success("Caretaker removed");
    fetchData();
  };

  return (
    <div className="min-h-screen bg-surface pb-24 page-transition">
      {/* Header */}
      <div
        className="text-white p-5 rounded-b-[28px] relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f766e 0%, #134e4a 60%, #0c3532 100%)" }}
      >
        <div className="absolute top-[-40px] right-[-40px] w-[140px] h-[140px] rounded-full bg-white/5 animate-float" />
        <div className="absolute bottom-[-20px] left-[-20px] w-[100px] h-[100px] rounded-full bg-white/5 animate-float" style={{ animationDelay: "3s" }} />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20">
                <ArrowLeft size={18} />
              </button>
              <h1 className="text-xl font-heading font-bold">Profile</h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate("/settings")} className="p-2 rounded-xl bg-white/10 hover:bg-white/20">
                <Settings size={18} />
              </button>
              <LanguageToggle />
            </div>
          </div>

          {/* Patient card inside header */}
          {profile && (
            <div className="glass-card rounded-2xl p-4 mt-2 flex items-center gap-4">
              {profile.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt={profile.name}
                  className="w-14 h-14 object-cover flex-shrink-0"
                  style={{ borderRadius: "14px" }}
                />
              ) : (
                <div
                  className="w-14 h-14 flex items-center justify-center text-xl font-heading font-bold text-white flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b, #f97316)",
                    borderRadius: "14px",
                    boxShadow: "0 0 16px rgba(245, 158, 11, 0.4)",
                  }}
                >
                  {profile.name.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <h2 className="font-heading font-extrabold text-xl">{profile.name}</h2>
                <p className="text-white/60 text-sm">
                  Age {profile.age} · Blood Group {profile.blood_group}
                </p>
                {profile.medcircle_code && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="bg-white/20 text-white/90 px-2.5 py-1 rounded-lg text-xs font-mono font-bold tracking-widest">
                      🆔 {profile.medcircle_code}
                    </span>
                    <span className="text-white/40 text-[10px]">Share with caretaker</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(profile.chronic_conditions || []).map((c, i) => (
                    <span key={i} className="bg-white/15 text-white/90 px-2 py-0.5 rounded-md text-[10px] font-semibold">{c}</span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowEdit(true)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 flex-shrink-0"
              >
                <Pencil size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Allergies */}
      {profile?.allergies && profile.allergies.length > 0 && (
        <div className="px-4 mt-4">
          <div
            className="rounded-2xl p-4 border animate-slide-in-left"
            style={{ background: "linear-gradient(135deg, #fff1f2, #ffe4e6)", borderColor: "#fda4af" }}
          >
            <h3 className="text-sm font-heading font-bold text-[#9f1239] mb-2">⚠️ Allergies</h3>
            <div className="flex flex-wrap gap-2">
              {profile.allergies.map((a, i) => (
                <span key={i} className="bg-[#fda4af]/20 text-[#e11d48] px-3 py-1 rounded-lg text-sm font-semibold">{a}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* My Care Circle */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#ede9fe] rounded-full px-3 py-1.5">
              <div className="w-7 h-7 bg-[#8b5cf6] rounded-full flex items-center justify-center">
                <Users size={14} className="text-white" />
              </div>
              <span className="font-heading font-bold text-sm text-[#4c1d95]">My Care Circle</span>
            </div>
            <div className="flex-1 h-[2px] bg-[#c4b5fd] rounded-full" />
          </div>
          <button
            onClick={() => {
              if (patientPlan === "free") {
                setShowUpgradePrompt(true);
              } else {
                setShowAdd(true);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-heading font-bold text-white glow-teal"
            style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}
          >
            <Plus size={14} /> Add
          </button>
        </div>

        <div className="space-y-3">
          {caretakers.map((ct, idx) => (
            <div
              key={ct.id}
              className="bg-card rounded-[18px] p-4 animate-slide-up"
              style={{
                borderLeft: "4px solid #8b5cf6",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                animationDelay: `${idx * 80}ms`,
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-[14px] flex items-center justify-center text-lg"
                    style={{ background: "#ede9fe" }}
                  >
                    <Heart size={18} className="text-[#8b5cf6]" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-base text-ink">{ct.name}</h3>
                    <p className="text-xs text-muted-foreground">{ct.relationship}</p>
                  </div>
                </div>
                <button onClick={() => removeCaretaker(ct.id)} className="text-muted-foreground hover:text-coral p-1">
                  <X size={16} />
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone size={14} className="text-primary" /> {ct.phone}
                </div>
                {ct.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail size={14} className="text-primary" /> {ct.email}
                  </div>
                )}
              </div>
            </div>
          ))}
          {caretakers.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">No caretakers added yet</p>
          )}
        </div>
      </div>

      {/* Inline Upgrade Prompt */}
      {showUpgradePrompt && (
        <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-3xl p-6 space-y-4 animate-fade-in shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-heading font-bold text-foreground">Upgrade Required</h2>
              <button onClick={() => setShowUpgradePrompt(false)} className="text-muted-foreground p-1"><X size={20} /></button>
            </div>
            <div className="flex items-center gap-3 bg-[#ede9fe] rounded-2xl p-4">
              <div className="w-12 h-12 bg-[#8b5cf6] rounded-xl flex items-center justify-center flex-shrink-0">
                <Crown size={24} className="text-white" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-foreground">Care Circle is a Premium Feature</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Add caretakers who can monitor your medicines and health remotely.</p>
              </div>
            </div>
            <ul className="space-y-2 px-2">
              <li className="flex items-center gap-2 text-sm text-foreground">
                <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs">✓</span>
                Caretakers get real-time missed dose alerts
              </li>
              <li className="flex items-center gap-2 text-sm text-foreground">
                <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs">✓</span>
                Share medicine list & health profile
              </li>
              <li className="flex items-center gap-2 text-sm text-foreground">
                <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs">✓</span>
                Emergency QR code for instant access
              </li>
            </ul>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowUpgradePrompt(false)}
                className="flex-1 py-3 rounded-xl text-sm font-bold bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
              >
                Maybe Later
              </button>
              <button
                onClick={() => {
                  setShowUpgradePrompt(false);
                  navigate("/pricing");
                }}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}
              >
                View Plans
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Caretaker Form */}
      {showAdd && (
        <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-3xl p-6 space-y-4 animate-fade-in shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-heading font-bold text-foreground">Add Caretaker</h2>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground p-1"><X size={20} /></button>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1 block">Name *</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. Priya" />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1 block">Relationship *</label>
              <input value={newRelation} onChange={(e) => setNewRelation(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. Daughter" />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1 block">Phone *</label>
              <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} type="tel"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1 block">Email</label>
              <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="priya@email.com" />
            </div>
            <button onClick={addCaretaker}
              className="w-full text-white rounded-2xl py-4 text-lg font-heading font-bold shadow-lg hover:opacity-90 transition-opacity glow-teal"
              style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}
            >
              Add Caretaker
            </button>
          </div>
        </div>
      )}

      {/* Emergency QR Code */}
      {profile && (
        <EmergencyQRSection
          emergencyToken={profile.emergency_token}
          patientName={profile.name}
          bloodGroup={profile.blood_group}
          allergies={profile.allergies}
          emergencyContact={profile.emergency_contact}
        />
      )}

      {/* Quick Links */}
      <div className="px-4 mt-6 space-y-3">
        <button onClick={() => navigate("/doctor-summary")}
          className="w-full bg-card rounded-[18px] p-4 text-left flex items-center gap-3 animate-slide-up"
          style={{ borderLeft: "4px solid #0d9488", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", animationDelay: "0ms" }}
        >
          <div className="w-[46px] h-[46px] rounded-[14px] flex items-center justify-center" style={{ background: "#ccfbf1" }}>
            <FileText size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-[15px] text-ink">Doctor Visit Summary</h3>
            <p className="text-xs text-muted-foreground">AI-generated summary for your doctor</p>
          </div>
        </button>
        <button onClick={() => navigate("/drug-interaction")}
          className="w-full bg-card rounded-[18px] p-4 text-left flex items-center gap-3 animate-slide-up"
          style={{ borderLeft: "4px solid #f59e0b", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", animationDelay: "80ms" }}
        >
          <div className="w-[46px] h-[46px] rounded-[14px] flex items-center justify-center" style={{ background: "#fef3c7" }}>
            <FlaskConical size={20} className="text-[#f59e0b]" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-[15px] text-ink">Drug Interaction Checker</h3>
            <p className="text-xs text-muted-foreground">Check if your medicines interact</p>
          </div>
        </button>
        <button onClick={() => navigate("/pricing")}
          className="w-full bg-card rounded-[18px] p-4 text-left flex items-center gap-3 animate-slide-up"
          style={{ borderLeft: "4px solid #8b5cf6", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", animationDelay: "160ms" }}
        >
          <div className="w-[46px] h-[46px] rounded-[14px] flex items-center justify-center" style={{ background: "#ede9fe" }}>
            <Crown size={20} className="text-[#8b5cf6]" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-[15px] text-ink">Upgrade Plan</h3>
            <p className="text-xs text-muted-foreground">Unlock all features</p>
          </div>
        </button>
      </div>

      {/* Edit Profile Sheet */}
      {profile && (
        <EditProfileSheet
          open={showEdit}
          onClose={() => setShowEdit(false)}
          profile={profile}
          onSaved={fetchData}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default Profile;