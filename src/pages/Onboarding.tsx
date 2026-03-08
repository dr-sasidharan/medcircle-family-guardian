import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const COMMON_ALLERGIES = ["Penicillin", "Sulfa drugs", "Aspirin", "Ibuprofen", "Latex", "None"];
const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ta", label: "தமிழ் (Tamil)" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState("");
  const [language, setLanguage] = useState("en");
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth", { replace: true });
        return;
      }
      setUserId(user.id);
      // Pre-fill name from auth metadata
      const metaName = user.user_metadata?.full_name;
      if (metaName) setName(metaName);
    });
  }, [navigate]);

  const toggleAllergy = (allergy: string) => {
    if (allergy === "None") {
      setAllergies(allergies.includes("None") ? [] : ["None"]);
      return;
    }
    setAllergies((prev) =>
      prev.filter((a) => a !== "None").includes(allergy)
        ? prev.filter((a) => a !== allergy)
        : [...prev.filter((a) => a !== "None"), allergy]
    );
  };

  const addCustomAllergy = () => {
    if (customAllergy.trim() && !allergies.includes(customAllergy.trim())) {
      setAllergies((prev) => [...prev.filter((a) => a !== "None"), customAllergy.trim()]);
      setCustomAllergy("");
    }
  };

  const handleComplete = async () => {
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!age || Number(age) < 1 || Number(age) > 120) {
      toast.error("Please enter a valid age");
      return;
    }
    setSaving(true);
    try {
      const finalAllergies = allergies.filter((a) => a !== "None");

      const { error } = await supabase
        .from("patient_profiles")
        .upsert({
          user_id: userId!,
          name: name.trim(),
          age: Number(age),
          blood_group: bloodGroup || null,
          allergies: finalAllergies.length > 0 ? finalAllergies : null,
          onboarding_complete: true,
        }, { onConflict: "user_id" });

      if (error) throw error;

      // Save language preference
      localStorage.setItem("medcircle-language", language);

      toast.success("Profile setup complete! 🎉");
      navigate("/patient", { replace: true });
    } catch (error: any) {
      toast.error(error.message || "Failed to save profile");
    }
    setSaving(false);
  };

  const totalSteps = 3;
  const progressPercent = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col page-transition">
      {/* Progress bar */}
      <div className="w-full h-1.5 bg-secondary">
        <div
          className="h-full rounded-r-full transition-all duration-500"
          style={{
            width: `${progressPercent}%`,
            background: "linear-gradient(90deg, #0d9488, #10b981)",
          }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
        {/* Step 1: Name & Age */}
        {step === 1 && (
          <div className="w-full space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">👋</div>
              <h2 className="text-2xl font-heading font-extrabold text-foreground">Let's set up your profile</h2>
              <p className="text-muted-foreground text-sm mt-1">This helps us personalize your experience</p>
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Your Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rajesh Kumar"
                className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Your Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 62"
                min={1}
                max={120}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Blood Group</label>
              <div className="grid grid-cols-4 gap-2">
                {BLOOD_GROUPS.map((bg) => (
                  <button
                    key={bg}
                    onClick={() => setBloodGroup(bg)}
                    className={`py-2.5 rounded-xl text-sm font-bold transition-colors ${
                      bloodGroup === bg
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-accent"
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                if (!name.trim() || !age) {
                  toast.error("Please enter name and age");
                  return;
                }
                setStep(2);
              }}
              className="w-full flex items-center justify-center gap-2 text-white rounded-2xl py-4 text-lg font-heading font-bold shadow-lg hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}
            >
              Next <ArrowRight size={20} />
            </button>
          </div>
        )}

        {/* Step 2: Allergies */}
        {step === 2 && (
          <div className="w-full space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">⚠️</div>
              <h2 className="text-2xl font-heading font-extrabold text-foreground">Any Allergies?</h2>
              <p className="text-muted-foreground text-sm mt-1">Select all that apply, or tap "None"</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {COMMON_ALLERGIES.map((allergy) => (
                <button
                  key={allergy}
                  onClick={() => toggleAllergy(allergy)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    allergies.includes(allergy)
                      ? allergy === "None"
                        ? "bg-emerald text-white"
                        : "bg-destructive text-white"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                  }`}
                >
                  {allergy}
                </button>
              ))}
            </div>

            {/* Custom allergy */}
            <div className="flex gap-2">
              <input
                value={customAllergy}
                onChange={(e) => setCustomAllergy(e.target.value)}
                placeholder="Add other allergy..."
                className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => e.key === "Enter" && addCustomAllergy()}
              />
              <button
                onClick={addCustomAllergy}
                className="px-4 rounded-xl bg-secondary text-secondary-foreground font-bold hover:bg-accent transition-colors"
              >
                Add
              </button>
            </div>

            {/* Selected allergies display */}
            {allergies.filter((a) => a !== "None" && !COMMON_ALLERGIES.includes(a)).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {allergies
                  .filter((a) => a !== "None" && !COMMON_ALLERGIES.includes(a))
                  .map((a) => (
                    <span
                      key={a}
                      className="bg-destructive/10 text-destructive px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1"
                    >
                      {a}
                      <button onClick={() => setAllergies((prev) => prev.filter((x) => x !== a))} className="ml-1 hover:opacity-70">
                        ✕
                      </button>
                    </span>
                  ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-secondary text-secondary-foreground rounded-2xl py-4 text-base font-heading font-bold hover:bg-accent transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 flex items-center justify-center gap-2 text-white rounded-2xl py-4 text-base font-heading font-bold shadow-lg hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}
              >
                Next <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Language */}
        {step === 3 && (
          <div className="w-full space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">🌐</div>
              <h2 className="text-2xl font-heading font-extrabold text-foreground">Choose Language</h2>
              <p className="text-muted-foreground text-sm mt-1">You can change this later in settings</p>
            </div>

            <div className="space-y-3">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`w-full py-4 rounded-2xl text-lg font-heading font-bold transition-all ${
                    language === lang.code
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "bg-card border-2 border-border text-foreground hover:bg-secondary"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-secondary text-secondary-foreground rounded-2xl py-4 text-base font-heading font-bold hover:bg-accent transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 text-white rounded-2xl py-4 text-base font-heading font-bold shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}
              >
                {saving && <Loader2 className="w-5 h-5 animate-spin" />}
                Complete Setup 🎉
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex justify-center gap-2 pb-8">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 rounded-full transition-all duration-300 ${
              s === step ? "w-8 bg-primary" : s < step ? "w-2 bg-primary/50" : "w-2 bg-secondary"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
