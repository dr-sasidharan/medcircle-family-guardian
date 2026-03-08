import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const DEMO_EMAIL = "demo@medcircle.app";
    const DEMO_PASSWORD = "medcircle2026";

    // Check if demo account already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingDemo = existingUsers?.users?.find((u) => u.email === DEMO_EMAIL);

    let userId: string;

    if (existingDemo) {
      userId = existingDemo.id;
      // Update password in case it changed
      await supabase.auth.admin.updateUserById(userId, { password: DEMO_PASSWORD });
    } else {
      // Create demo user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: "Rajesh Kumar" },
      });
      if (createError) throw createError;
      userId = newUser.user.id;
    }

    // Wait for trigger to create profile
    await new Promise((r) => setTimeout(r, 1000));

    // Update demo profile with rich data
    await supabase
      .from("patient_profiles")
      .update({
        name: "Rajesh Kumar",
        age: 62,
        blood_group: "B+",
        allergies: ["Penicillin", "Sulfa drugs"],
        chronic_conditions: ["Type 2 Diabetes", "Hypertension", "High Cholesterol"],
        emergency_contact: "+91 98765 43210",
        emergency_notes: "Has Type 2 Diabetes and Hypertension. On blood thinners. Avoid NSAIDs.",
        onboarding_complete: true,
        plan: "pro",
      })
      .eq("user_id", userId);

    // Check if demo medicines exist
    const { data: existingMeds } = await supabase
      .from("medicines")
      .select("id")
      .eq("user_id", userId);

    if (!existingMeds?.length) {
      // Add demo medicines
      const medicines = [
        { name: "Metformin", dosage: "500mg", timing: "morning", food_instruction: "after_food", purpose: "Blood sugar control", user_id: userId },
        { name: "Amlodipine", dosage: "5mg", timing: "morning", food_instruction: "before_food", purpose: "Blood pressure", user_id: userId },
        { name: "Atorvastatin", dosage: "10mg", timing: "night", food_instruction: "after_food", purpose: "Cholesterol", user_id: userId },
        { name: "Aspirin", dosage: "75mg", timing: "afternoon", food_instruction: "after_food", purpose: "Blood thinner", user_id: userId },
        { name: "Pantoprazole", dosage: "40mg", timing: "morning", food_instruction: "before_food", purpose: "Stomach protection", user_id: userId },
      ];

      const { data: insertedMeds } = await supabase.from("medicines").insert(medicines).select("id, timing");

      if (insertedMeds?.length) {
        // Create today's doses
        const today = new Date().toISOString().split("T")[0];
        const doses = insertedMeds.map((med) => ({
          medicine_id: med.id,
          scheduled_time: med.timing,
          scheduled_date: today,
          taken: med.timing === "morning",
          taken_at: med.timing === "morning" ? new Date().toISOString() : null,
          missed: false,
          user_id: userId,
        }));

        await supabase.from("doses").insert(doses);

        // Add refill data
        const refills = insertedMeds.map((med) => ({
          medicine_id: med.id,
          total_tablets: 30,
          tablets_remaining: Math.floor(Math.random() * 15) + 3,
        }));

        await supabase.from("medicine_refills").insert(refills);
      }
    }

    // Add demo caretaker if none exists
    const { data: profile } = await supabase
      .from("patient_profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (profile) {
      const { data: existingCaretakers } = await supabase
        .from("caretakers")
        .select("id")
        .eq("patient_profile_id", profile.id);

      if (!existingCaretakers?.length) {
        await supabase.from("caretakers").insert([
          {
            patient_profile_id: profile.id,
            name: "Priya Kumar",
            relationship: "Daughter",
            phone: "+91 87654 32109",
            email: "priya@example.com",
          },
          {
            patient_profile_id: profile.id,
            name: "Arun Kumar",
            relationship: "Son",
            phone: "+91 76543 21098",
          },
        ]);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Demo account ready",
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("setup-demo error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to setup demo" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
