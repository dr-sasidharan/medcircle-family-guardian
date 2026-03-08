import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Droplets, AlertTriangle, Pill, Phone } from "lucide-react";

interface EmergencyData {
  name: string;
  age: number;
  blood_group: string | null;
  allergies: string[] | null;
  emergency_contact: string | null;
  emergency_notes: string | null;
}

const EmergencyInfoButton = () => {
  const [show, setShow] = useState(false);
  const [data, setData] = useState<EmergencyData | null>(null);
  const [medicines, setMedicines] = useState<{ name: string; dosage: string }[]>([]);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profiles } = await supabase.from("patient_profiles").select("name, age, blood_group, allergies, emergency_contact, emergency_notes").eq("user_id", user.id).limit(1);
    if (profiles?.length) setData(profiles[0] as any);

    const { data: meds } = await supabase.from("medicines").select("name, dosage").eq("is_active", true);
    setMedicines((meds || []) as any);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!data) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setShow(true)}
        className="fixed bottom-24 left-5 w-14 h-14 bg-destructive text-destructive-foreground rounded-full shadow-xl flex items-center justify-center hover:opacity-90 transition-opacity z-40 text-xl font-extrabold"
        aria-label="Emergency Info"
      >
        🚨
      </button>

      {/* Fullscreen Emergency Card */}
      {show && (
        <div className="fixed inset-0 bg-background z-[100] overflow-y-auto animate-fade-in">
          <div className="min-h-screen p-6 flex flex-col">
            {/* Close */}
            <button onClick={() => setShow(false)} className="self-end p-2 text-muted-foreground">
              <X size={24} />
            </button>

            {/* Show to doctor instruction */}
            <div className="bg-destructive/10 border-2 border-destructive/40 rounded-2xl p-4 text-center mb-6">
              <p className="text-destructive font-bold text-base">Show this to the doctor in an emergency</p>
            </div>

            {/* Patient Name */}
            <h1 className="text-2xl font-extrabold text-foreground text-center mb-1">{data.name}</h1>
            <p className="text-muted-foreground text-center mb-6">Age {data.age}</p>

            {/* Blood Group - Very Large */}
            <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-8 text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Droplets size={24} className="text-destructive" />
                <span className="text-sm font-bold text-muted-foreground">Blood Group</span>
              </div>
              <p className="text-6xl font-extrabold text-destructive">{data.blood_group || "?"}</p>
            </div>

            {/* Allergies */}
            {data.allergies && data.allergies.length > 0 && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-5 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={20} className="text-destructive" />
                  <h2 className="text-lg font-bold text-destructive">Allergies</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.allergies.map((a, i) => (
                    <span key={i} className="bg-destructive text-destructive-foreground px-4 py-2 rounded-xl text-base font-bold">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Current Medicines */}
            <div className="bg-card border border-border rounded-2xl p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Pill size={20} className="text-primary" />
                <h2 className="text-lg font-bold text-foreground">Current Medicines</h2>
              </div>
              <div className="space-y-2">
                {medicines.map((m, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <span className="text-base font-semibold text-foreground">{m.name}</span>
                    <span className="text-sm text-muted-foreground">{m.dosage}</span>
                  </div>
                ))}
                {medicines.length === 0 && (
                  <p className="text-muted-foreground text-sm">No medicines recorded</p>
                )}
              </div>
            </div>

            {/* Emergency Contact */}
            {data.emergency_contact && (
              <div className="bg-primary/10 border border-primary/30 rounded-2xl p-5 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Phone size={20} className="text-primary" />
                  <h2 className="text-lg font-bold text-foreground">Emergency Contact</h2>
                </div>
                <a href={`tel:${data.emergency_contact}`} className="text-2xl font-extrabold text-primary underline">
                  {data.emergency_contact}
                </a>
              </div>
            )}

            {/* Emergency Notes */}
            {data.emergency_notes && (
              <div className="bg-warning/10 border border-warning/30 rounded-2xl p-5 mb-4">
                <p className="text-base text-foreground font-medium">{data.emergency_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default EmergencyInfoButton;