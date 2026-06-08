import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

const RELATIONSHIPS = ["Self", "Spouse", "Father", "Mother", "Son", "Daughter", "Sibling", "Grandparent", "Other"];
const GENDERS = ["Male", "Female", "Other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

type FormState = {
  relationship: string; name: string; age: string; gender: string; blood_group: string;
  height: string; weight: string; conditions: string; allergies: string;
  emergency_contact_name: string; emergency_contact_phone: string;
  doctor_name: string; doctor_phone: string; allow_emergency_access: boolean;
};

const empty: FormState = {
  relationship: "", name: "", age: "", gender: "", blood_group: "",
  height: "", weight: "", conditions: "", allergies: "",
  emergency_contact_name: "", emergency_contact_phone: "",
  doctor_name: "", doctor_phone: "", allow_emergency_access: false,
};

export default function FamilyEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = !!id;
  const [form, setForm] = useState<FormState>(empty);
  const [isSelf, setIsSelf] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    (async () => {
      const { data, error } = await supabase.from("family_profiles").select("*").eq("id", id).maybeSingle();
      if (error || !data) { toast.error("Profile not found"); navigate("/family"); return; }
      setIsSelf(data.is_self);
      setForm({
        relationship: data.relationship || "",
        name: data.name || "",
        age: data.age != null ? String(data.age) : "",
        gender: data.gender || "",
        blood_group: data.blood_group || "",
        height: data.height != null ? String(data.height) : "",
        weight: data.weight != null ? String(data.weight) : "",
        conditions: (data.conditions || []).join(", "),
        allergies: (data.allergies || []).join(", "),
        emergency_contact_name: data.emergency_contact_name || "",
        emergency_contact_phone: data.emergency_contact_phone || "",
        doctor_name: data.doctor_name || "",
        doctor_phone: data.doctor_phone || "",
        allow_emergency_access: !!data.allow_emergency_access,
      });
    })();
  }, [id]);

  const save = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const payload: any = {
        relationship: form.relationship || null,
        name: form.name.trim(),
        age: form.age ? parseInt(form.age, 10) : null,
        gender: form.gender || null,
        blood_group: form.blood_group || null,
        height: form.height ? parseFloat(form.height) : null,
        weight: form.weight ? parseFloat(form.weight) : null,
        conditions: form.conditions ? form.conditions.split(",").map((s) => s.trim()).filter(Boolean) : null,
        allergies: form.allergies ? form.allergies.split(",").map((s) => s.trim()).filter(Boolean) : null,
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact_phone: form.emergency_contact_phone.trim() || null,
        doctor_name: form.doctor_name.trim() || null,
        doctor_phone: form.doctor_phone.trim() || null,
        allow_emergency_access: form.allow_emergency_access,
      };

      if (editing) {
        const { error } = await supabase.from("family_profiles").update(payload).eq("id", id!);
        if (error) throw error;
        await supabase.from("caregiver_audit_logs").insert({
          actor_user_id: user.id, profile_id: id!, action: "Profile Updated", metadata: { fields: Object.keys(payload) },
        });
        // notify caregivers
        const { data: perms } = await supabase.from("caregiver_permissions").select("caregiver_id").eq("profile_id", id!);
        if (perms && perms.length) {
          await supabase.from("caregiver_notifications").insert(
            perms.map((p: any) => ({ caregiver_id: p.caregiver_id, profile_id: id!, type: "profile_updated", message: `${payload.name}'s profile was updated.` }))
          );
        }
        toast.success("Profile updated");
      } else {
        payload.owner_id = user.id;
        const { error } = await supabase.from("family_profiles").insert(payload);
        if (error) throw error;
        toast.success("Profile added");
      }
      navigate("/family");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally { setSaving(false); }
  };

  const F = ({ label, children }: any) => (
    <div>
      <label className="text-sm font-semibold text-foreground mb-1 block">{label}</label>
      {children}
    </div>
  );

  const ip = "w-full bg-muted border border-border rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="bg-primary text-primary-foreground p-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20"><ArrowLeft size={18} /></button>
          <h1 className="text-xl font-bold text-white">{editing ? "Edit Profile" : "Add Family Member"}</h1>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        <F label="Relationship">
          <select className={ip} value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} disabled={isSelf}>
            <option value="">Select…</option>
            {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </F>
        <F label="Name *"><input className={ip} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" /></F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Age"><input className={ip} type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="0" /></F>
          <F label="Gender">
            <select className={ip} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="">Select…</option>
              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </F>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <F label="Blood">
            <select className={ip} value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })}>
              <option value="">—</option>
              {BLOOD_GROUPS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </F>
          <F label="Height (cm)"><input className={ip} type="number" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} /></F>
          <F label="Weight (kg)"><input className={ip} type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} /></F>
        </div>
        <F label="Conditions (comma separated)"><input className={ip} value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} placeholder="Diabetes, Hypertension" /></F>
        <F label="Allergies (comma separated)"><input className={ip} value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="Penicillin, Peanuts" /></F>

        <div className="pt-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Emergency Contact</div>
        <F label="Name"><input className={ip} value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} /></F>
        <F label="Phone"><input className={ip} type="tel" value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} /></F>

        <div className="pt-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Doctor</div>
        <F label="Doctor name"><input className={ip} value={form.doctor_name} onChange={(e) => setForm({ ...form, doctor_name: e.target.value })} /></F>
        <F label="Doctor phone"><input className={ip} type="tel" value={form.doctor_phone} onChange={(e) => setForm({ ...form, doctor_phone: e.target.value })} /></F>

        <label className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 cursor-pointer">
          <input type="checkbox" checked={form.allow_emergency_access} onChange={(e) => setForm({ ...form, allow_emergency_access: e.target.checked })} className="h-4 w-4" />
          <span className="text-sm text-foreground">Allow emergency access to this profile</span>
        </label>

        <button onClick={save} disabled={saving} className="w-full mt-4 bg-primary text-primary-foreground rounded-2xl py-4 text-base font-bold flex items-center justify-center gap-2 disabled:opacity-60">
          <Save size={16} /> {saving ? "Saving…" : editing ? "Save Changes" : "Add Member"}
        </button>
      </div>
    </div>
  );
}
