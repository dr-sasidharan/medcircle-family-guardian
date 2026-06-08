import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Users, Pencil, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface FamilyProfile {
  id: string;
  name: string;
  age: number | null;
  relationship: string | null;
  is_self: boolean;
  conditions: string[] | null;
}

export default function Family() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<FamilyProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("family_profiles")
      .select("id, name, age, relationship, is_self, conditions")
      .order("is_self", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setProfiles((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string, isSelf: boolean) => {
    if (isSelf) { toast.error("You can't delete your own profile."); return; }
    if (!confirm("Delete this family profile?")) return;
    const { error } = await supabase.from("family_profiles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Profile removed");
    load();
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-primary text-primary-foreground p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20"><ArrowLeft size={18} /></button>
            <div>
              <h1 className="text-xl font-bold text-white">Family Members</h1>
              <p className="text-white/70 text-xs">Manage profiles and caregivers</p>
            </div>
          </div>
          <button onClick={() => navigate("/family/new")} className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-2 rounded-xl text-sm font-semibold">
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {loading && <p className="text-center text-muted-foreground py-8 text-sm">Loading…</p>}
        {!loading && profiles.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto text-muted-foreground mb-3" size={36} />
            <p className="text-sm text-muted-foreground mb-4">No family profiles yet</p>
            <button onClick={() => navigate("/family/new")} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold">Add first member</button>
          </div>
        )}
        {profiles.map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-foreground truncate">{p.name}</h3>
                  {p.is_self && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">SELF</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {p.relationship || "—"}{p.age ? ` · Age ${p.age}` : ""}
                </p>
                {p.conditions && p.conditions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {p.conditions.slice(0, 3).map((c, i) => (
                      <span key={i} className="bg-muted text-foreground/80 px-2 py-0.5 rounded-full text-[10px]">{c}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
              <button onClick={() => navigate(`/family/${p.id}/edit`)} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg bg-muted hover:bg-muted/80">
                <Pencil size={13} /> Edit
              </button>
              <button onClick={() => navigate(`/family/${p.id}/caregivers`)} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20">
                <Shield size={13} /> Caregivers
              </button>
              {!p.is_self && (
                <button onClick={() => remove(p.id, p.is_self)} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"><Trash2 size={14} /></button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
