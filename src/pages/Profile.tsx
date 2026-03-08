import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { User, Users, Plus, Phone, Mail, Heart, X, FileText, FlaskConical, Settings } from "lucide-react";
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
}

const Profile = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [caretakers, setCaretakers] = useState<Caretaker[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [patientPlan, setPatientPlan] = useState("free");
  const [newName, setNewName] = useState("");
  const [newRelation, setNewRelation] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const fetchData = useCallback(async () => {
    const { data: profiles } = await supabase.from("patient_profiles").select("*").limit(1);
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
    if (!newName.trim() || !newRelation.trim() || !newPhone.trim() || !profile) {
      toast.error("Please fill name, relationship, and phone");
      return;
    }
    const { error } = await supabase.from("caretakers").insert({
      patient_profile_id: profile.id,
      name: newName.trim(),
      relationship: newRelation.trim(),
      phone: newPhone.trim(),
      email: newEmail.trim() || null,
    });
    if (error) { toast.error("Failed to add caretaker"); return; }
    toast.success(`${newName} added as caretaker!`);
    setNewName(""); setNewRelation(""); setNewPhone(""); setNewEmail("");
    setShowAdd(false);
    fetchData();
  };

  const removeCaretaker = async (id: string) => {
    await supabase.from("caretakers").update({ is_active: false }).eq("id", id);
    toast.success("Caretaker removed");
    fetchData();
  };

  return (
    <div className="min-h-screen bg-background pb-24 page-transition">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h1 className="text-lg font-bold text-foreground">{t("profile")}</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/settings")} className="p-2 text-muted-foreground hover:text-foreground">
            <Settings size={20} />
          </button>
          <LanguageToggle />
        </div>
      </div>

      {/* Patient Info */}
      {profile && (
        <div className="px-4 mt-6">
          <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User size={32} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-foreground">{profile.name}</h2>
              <p className="text-sm text-muted-foreground">Age {profile.age} · {t("blood_group")} {profile.blood_group}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(profile.chronic_conditions || []).map((c, i) => (
                  <span key={i} className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md text-xs font-semibold">{c}</span>
                ))}
              </div>
            </div>
          </div>

          {profile.allergies && profile.allergies.length > 0 && (
            <div className="mt-4 bg-destructive/5 border border-destructive/20 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-destructive mb-2">⚠️ {t("allergies")}</h3>
              <div className="flex flex-wrap gap-2">
                {profile.allergies.map((a, i) => (
                  <span key={i} className="bg-destructive/10 text-destructive px-3 py-1 rounded-lg text-sm font-semibold">{a}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* My Care Circle */}
      <div className="px-4 mt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-foreground">{t("my_care_circle")}</h2>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
          >
            <Plus size={16} /> {t("add")}
          </button>
        </div>

        <div className="space-y-3">
          {caretakers.map((ct) => (
            <div key={ct.id} className="bg-card rounded-2xl border border-border p-4 animate-fade-in">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center">
                    <Heart size={18} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">{ct.name}</h3>
                    <p className="text-sm text-muted-foreground">{ct.relationship}</p>
                  </div>
                </div>
                <button onClick={() => removeCaretaker(ct.id)} className="text-muted-foreground hover:text-destructive p-1">
                  <X size={16} />
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone size={14} /> {ct.phone}
                </div>
                {ct.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail size={14} /> {ct.email}
                  </div>
                )}
              </div>
            </div>
          ))}
          {caretakers.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">{t("no_caretakers")}</p>
          )}
        </div>
      </div>

      {/* Add Caretaker Form */}
      {showAdd && (
        <div className="fixed inset-0 bg-foreground/50 z-50 flex items-end">
          <div className="bg-card w-full rounded-t-3xl p-6 space-y-4 animate-fade-in max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-foreground">{t("add_caretaker")}</h2>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground p-1"><X size={20} /></button>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1 block">{t("name")} *</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. Priya" />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1 block">{t("relationship")} *</label>
              <input value={newRelation} onChange={(e) => setNewRelation(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. Daughter" />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1 block">{t("phone")} *</label>
              <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} type="tel"
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1 block">{t("email")}</label>
              <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email"
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="priya@email.com" />
            </div>
            <button onClick={addCaretaker}
              className="w-full bg-primary text-primary-foreground rounded-2xl py-4 text-lg font-bold shadow-lg hover:opacity-90 transition-opacity">
              {t("add_caretaker")}
            </button>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="px-4 mt-8 space-y-3">
        <button onClick={() => navigate("/doctor-summary")}
          className="w-full bg-card border border-border rounded-2xl p-4 text-left hover:bg-secondary transition-colors flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">{t("doctor_visit_summary")}</h3>
            <p className="text-sm text-muted-foreground">{t("doctor_summary_desc")}</p>
          </div>
        </button>
        <button onClick={() => navigate("/drug-interaction")}
          className="w-full bg-card border border-border rounded-2xl p-4 text-left hover:bg-secondary transition-colors flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
            <FlaskConical size={20} className="text-warning" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">{t("drug_interaction_checker")}</h3>
            <p className="text-sm text-muted-foreground">{t("drug_checker_desc")}</p>
          </div>
        </button>
        <button onClick={() => navigate("/pricing")}
          className="w-full bg-card border border-border rounded-2xl p-4 text-left hover:bg-secondary transition-colors">
          <h3 className="text-base font-bold text-foreground">{t("upgrade_plan")}</h3>
          <p className="text-sm text-muted-foreground">{t("upgrade_desc")}</p>
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
