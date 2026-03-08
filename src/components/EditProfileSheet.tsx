import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface EditProfileSheetProps {
  open: boolean;
  onClose: () => void;
  profile: {
    id: string;
    name: string;
    age: number;
    blood_group: string | null;
    allergies: string[] | null;
    chronic_conditions: string[] | null;
    emergency_contact: string | null;
  };
  onSaved: () => void;
}

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const EditProfileSheet = ({ open, onClose, profile, onSaved }: EditProfileSheetProps) => {
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(String(profile.age));
  const [bloodGroup, setBloodGroup] = useState(profile.blood_group || "");
  const [allergies, setAllergies] = useState<string[]>(profile.allergies || []);
  const [newAllergy, setNewAllergy] = useState("");
  const [conditions, setConditions] = useState<string[]>(profile.chronic_conditions || []);
  const [newCondition, setNewCondition] = useState("");
  const [emergencyContact, setEmergencyContact] = useState(profile.emergency_contact || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(profile.name);
      setAge(String(profile.age));
      setBloodGroup(profile.blood_group || "");
      setAllergies(profile.allergies || []);
      setConditions(profile.chronic_conditions || []);
      setEmergencyContact(profile.emergency_contact || "");
      setNewAllergy("");
      setNewCondition("");
    }
  }, [open, profile]);

  const addAllergy = () => {
    const val = newAllergy.trim();
    if (val && !allergies.includes(val)) {
      setAllergies([...allergies, val]);
      setNewAllergy("");
    }
  };

  const addCondition = () => {
    const val = newCondition.trim();
    if (val && !conditions.includes(val)) {
      setConditions([...conditions, val]);
      setNewCondition("");
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 150) {
      toast.error("Please enter a valid age");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("patient_profiles")
      .update({
        name: name.trim(),
        age: ageNum,
        blood_group: bloodGroup || null,
        allergies: allergies.length > 0 ? allergies : null,
        chronic_conditions: conditions.length > 0 ? conditions : null,
        emergency_contact: emergencyContact.trim() || null,
      })
      .eq("id", profile.id);

    setSaving(false);
    if (error) {
      toast.error("Failed to update profile");
      return;
    }
    toast.success("Profile updated!");
    onSaved();
    onClose();
  };

  if (!open) return null;

  const inputClass = "w-full bg-surface border border-border rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="fixed inset-0 bg-ink/50 z-50 flex items-end">
      <div className="bg-card w-full rounded-t-3xl p-6 space-y-4 animate-slide-up max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-heading font-bold text-foreground">Edit Profile</h2>
          <button onClick={onClose} className="text-muted-foreground p-1"><X size={20} /></button>
        </div>

        {/* Name */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-1 block">Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Your name" maxLength={100} />
        </div>

        {/* Age */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-1 block">Age *</label>
          <input value={age} onChange={(e) => setAge(e.target.value)} type="number" min={1} max={150} className={inputClass} placeholder="e.g. 62" />
        </div>

        {/* Blood Group */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-1 block">Blood Group</label>
          <div className="flex flex-wrap gap-2">
            {BLOOD_GROUPS.map((bg) => (
              <button
                key={bg}
                onClick={() => setBloodGroup(bg === bloodGroup ? "" : bg)}
                className={`px-3 py-2 rounded-xl text-sm font-bold border transition-colors ${
                  bg === bloodGroup
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-surface text-foreground border-border hover:border-primary/50"
                }`}
              >
                {bg}
              </button>
            ))}
          </div>
        </div>

        {/* Emergency Contact */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-1 block">Emergency Contact</label>
          <input value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} type="tel" className={inputClass} placeholder="+91 98765 43210" maxLength={20} />
        </div>

        {/* Allergies */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-1 block">Allergies</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {allergies.map((a, i) => (
              <span key={i} className="bg-destructive/10 text-destructive px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5">
                {a}
                <button onClick={() => setAllergies(allergies.filter((_, j) => j !== i))}><Trash2 size={12} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAllergy())}
              className={inputClass}
              placeholder="e.g. Penicillin"
              maxLength={50}
            />
            <button onClick={addAllergy} className="px-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Chronic Conditions */}
        <div>
          <label className="text-sm font-semibold text-foreground mb-1 block">Chronic Conditions</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {conditions.map((c, i) => (
              <span key={i} className="bg-accent text-accent-foreground px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5">
                {c}
                <button onClick={() => setConditions(conditions.filter((_, j) => j !== i))}><Trash2 size={12} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newCondition}
              onChange={(e) => setNewCondition(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCondition())}
              className={inputClass}
              placeholder="e.g. Type 2 Diabetes"
              maxLength={50}
            />
            <button onClick={addCondition} className="px-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full text-white rounded-2xl py-4 text-lg font-heading font-bold shadow-lg hover:opacity-90 transition-opacity glow-teal disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
};

export default EditProfileSheet;
