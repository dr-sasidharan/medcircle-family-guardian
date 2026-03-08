import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Shield, Lock, CreditCard, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const plans = [
  {
    key: "one_time",
    price: 49,
    label: "One-Time Setup",
    period: "once",
    plan_value: "family",
    features: [
      "Full setup for one parent",
      "No monthly fee",
      "First month Family Plan included",
    ],
    highlighted: false,
    buttonStyle: "outline" as const,
    buttonText: "Try It Once",
  },
  {
    key: "family",
    price: 29,
    label: "Family Plan",
    period: "/month",
    plan_value: "family",
    features: [
      "Unlimited medicines",
      "Caretaker dashboard",
      "Missed dose alerts",
      "1 caretaker",
    ],
    highlighted: false,
    buttonStyle: "primary" as const,
    buttonText: "Get Started",
  },
  {
    key: "pro",
    price: 49,
    label: "Family Pro",
    period: "/month",
    plan_value: "pro",
    badge: "Best Value",
    features: [
      "Everything in Family Plan",
      "AI health insights",
      "Drug interaction checker",
      "Hospital visits timeline",
      "3 caretakers",
    ],
    highlighted: true,
    buttonStyle: "premium" as const,
    buttonText: "Get Started",
  },
];

const trustBadges = [
  { icon: Shield, label: "Secure Payment" },
  { icon: Lock, label: "256-bit Encrypted" },
  { icon: CreditCard, label: "Cancel Anytime" },
  { icon: CheckCircle2, label: "100% Safe" },
];

const Paywall = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activatedPlan, setActivatedPlan] = useState("");

  const reason = (location.state as any)?.reason || searchParams.get("reason") || "upgrade";
  const patientProfileId =
    (location.state as any)?.patientProfileId || searchParams.get("patient_profile_id");

  // Handle Stripe redirect success
  useEffect(() => {
    const success = searchParams.get("success");
    const plan = searchParams.get("plan");
    const profileId = searchParams.get("patient_profile_id");

    if (success === "true" && plan && profileId) {
      // Update patient plan in DB
      (async () => {
        await supabase
          .from("patient_profiles")
          .update({ plan })
          .eq("id", profileId);

        await supabase.from("payments").insert({
          patient_profile_id: profileId,
          amount: plan === "pro" ? 49 : plan === "family" ? 29 : 19,
          plan,
          status: "success",
        });

        setActivatedPlan(plan === "pro" ? "Family Pro" : "Family");
        setShowSuccess(true);
      })();
    }
  }, [searchParams]);

  const handlePayment = async (plan: typeof plans[0]) => {
    if (!patientProfileId) {
      toast.error("Patient profile not found");
      return;
    }

    setLoading(plan.key);

    try {
      const { data, error } = await supabase.functions.invoke("create-stripe-checkout", {
        body: { plan_key: plan.key, patient_profile_id: patientProfileId },
      });

      if (error || !data?.url) {
        throw new Error("Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(null);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 page-transition">
        <div className="text-center max-w-sm animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-success" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground mb-2">
            Welcome to MedCircle {activatedPlan}! 🎉
          </h1>
          <p className="text-muted-foreground mb-8">
            Your parent is now protected. All premium features are unlocked.
          </p>
          <button
            onClick={() => navigate("/patient", { replace: true })}
            className="w-full bg-primary text-primary-foreground rounded-2xl py-4 text-lg font-bold shadow-lg hover:opacity-90 transition-opacity"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="text-foreground p-1">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-foreground">{t("pricing")}</h1>
        <div className="w-6" />
      </div>

      {/* Reason Banner */}
      <div className="px-4 mt-4">
        <div className="bg-accent rounded-2xl p-4 text-center">
          <Sparkles size={20} className="text-primary mx-auto mb-1" />
          <p className="text-sm font-semibold text-foreground">
            {reason === "medicine_limit"
              ? "Upgrade to add unlimited medicines for your parent"
              : reason === "caretaker"
              ? "Upgrade to invite caretakers and monitor remotely"
              : "Unlock all MedCircle features"}
          </p>
        </div>
      </div>

      {/* Plans */}
      <div className="px-4 mt-6 max-w-lg mx-auto space-y-4">
        {plans.map((plan) => (
          <div
            key={plan.key}
            className={`rounded-2xl border-2 p-5 transition-all relative ${
              plan.highlighted
                ? "border-primary bg-primary/5 shadow-lg"
                : "border-border bg-card"
            }`}
          >
            {plan.badge && (
              <span className="absolute -top-3 right-4 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                {plan.badge}
              </span>
            )}
            <h2 className="text-lg font-extrabold text-foreground">{plan.label}</h2>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-extrabold text-primary">₹{plan.price}</span>
              <span className="text-muted-foreground text-sm">{plan.period}</span>
            </div>
            <ul className="mt-3 space-y-2">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground">{f}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => handlePayment(plan)}
              disabled={loading !== null}
              className={`w-full mt-4 py-3.5 rounded-xl text-base font-bold transition-all disabled:opacity-50 ${
                plan.buttonStyle === "outline"
                  ? "border-2 border-primary text-primary bg-transparent hover:bg-primary/5"
                  : plan.buttonStyle === "premium"
                  ? "bg-primary text-primary-foreground shadow-lg hover:opacity-90 text-lg py-4"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              }`}
            >
              {loading === plan.key ? "Redirecting to payment..." : plan.buttonText}
            </button>
          </div>
        ))}
      </div>

      {/* Trust Badges */}
      <div className="px-4 mt-8 max-w-lg mx-auto">
        <div className="grid grid-cols-2 gap-3">
          {trustBadges.map((badge, i) => (
            <div key={i} className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2.5">
              <badge.icon size={16} className="text-primary flex-shrink-0" />
              <span className="text-xs font-semibold text-muted-foreground">{badge.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Paywall;
