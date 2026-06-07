// Shared patient-context loader used by all AI edge functions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface PatientContextMedicine {
  name: string;
  dosage: string;
  timing: string;
  food_instruction: string;
  purpose?: string | null;
}

export interface PatientContextSymptom {
  symptom: string;
  urgency: string;
  created_at: string;
}

export interface PatientContext {
  name: string;
  age: number | null;
  conditions: string[];
  allergies: string[];
  medicines: PatientContextMedicine[];
  recent_missed_doses: number;
  recent_symptoms: PatientContextSymptom[];
}

export async function loadPatientContext(userId: string): Promise<PatientContext> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const [{ data: profileRows }, { data: meds }] = await Promise.all([
    supabase
      .from("patient_profiles")
      .select("id, name, age, allergies, chronic_conditions")
      .eq("user_id", userId)
      .limit(1),
    supabase
      .from("medicines")
      .select("name, dosage, timing, food_instruction, purpose")
      .eq("user_id", userId)
      .eq("is_active", true),
  ]);

  const profile: any = profileRows?.[0];
  const profileId: string | undefined = profile?.id;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [{ data: missed }, symptomsRes] = await Promise.all([
    supabase
      .from("doses")
      .select("id")
      .eq("user_id", userId)
      .eq("missed", true)
      .gte("scheduled_date", weekAgo),
    profileId
      ? supabase
          .from("symptom_checks")
          .select("symptom, urgency, created_at")
          .eq("patient_profile_id", profileId)
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] as PatientContextSymptom[] }),
  ]);

  return {
    name: profile?.name || "Patient",
    age: profile?.age ?? null,
    conditions: profile?.chronic_conditions || [],
    allergies: profile?.allergies || [],
    medicines: (meds || []) as PatientContextMedicine[],
    recent_missed_doses: (missed || []).length,
    recent_symptoms: ((symptomsRes as any).data || []) as PatientContextSymptom[],
  };
}

export function summarizeContext(ctx: PatientContext): string {
  const meds = ctx.medicines.length
    ? ctx.medicines
        .map(
          (m) =>
            `${m.name} ${m.dosage} (${m.timing}, ${m.food_instruction})`,
        )
        .join("; ")
    : "no active medicines";
  const conditions = ctx.conditions.length ? ctx.conditions.join(", ") : "none recorded";
  const allergies = ctx.allergies.length ? ctx.allergies.join(", ") : "none known";
  const recentSymp = ctx.recent_symptoms.length
    ? ctx.recent_symptoms.map((s) => `${s.symptom} (${s.urgency})`).join("; ")
    : "none";
  return `Patient: ${ctx.name}${ctx.age ? `, age ${ctx.age}` : ""}. Conditions: ${conditions}. Allergies: ${allergies}. Active medicines: ${meds}. Missed doses last 7 days: ${ctx.recent_missed_doses}. Recent symptom checks: ${recentSymp}.`;
}
