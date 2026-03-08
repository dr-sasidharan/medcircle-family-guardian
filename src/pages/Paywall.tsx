import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Shield, Lock, CreditCard, CheckCircle2, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const plans = [
  {
    key: "one_time",
    price: 19,
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
  { icon: Shield, label: "Secure UPI Payment" },
  { icon: Lock, label: "256-bit Encrypted" },
  { icon: CreditCard, label: "Cancel Anytime" },
  { icon: CheckCircle2, label: "100% Safe" },
];

const Paywall = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activatedPlan, setActivatedPlan] = useState("");

  const reason = (location.state as any)?.reason || "upgrade";
  const patientProfileId = (location.state as any)?.patientProfileId;

  const loadRazorpay = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) { resolve(true); return; }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (plan: typeof plans[0]) => {
    if (!patientProfileId) {
      toast.error("Patient profile not found");
      return;
    }

    setLoading(plan.key);

    const loaded = await loadRazorpay();
    if (!loaded) {
      toast.error("Payment gateway failed to load");
      setLoading(null);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
        body: { amount: plan.price, plan: plan.plan_value, patient_profile_id: patientProfileId },
      });

      if (error || !data?.order_id) {
        throw new Error("Failed to create order");
      }

      const options = {
        key: data.key_id,
        amount: plan.price * 100,
        currency: "INR",
        name: "MedCircle",
        description: `${plan.label} - MedCircle`,
        order_id: data.order_id,
        handler: async (response: any) => {
          try {
            const { error: verifyError } = await supabase.functions.invoke("verify-payment", {
              body: {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                plan: plan.plan_value,
                amount: plan.price,
                patient_profile_id: patientProfileId,
              },
            });

            if (verifyError) throw verifyError;

            setActivatedPlan(plan.label);
            setShowSuccess(true);
          } catch {
            toast.error("Payment verification failed");
          }
        },
        prefill: { contact: "" },
        theme: { color: "#0d9488" },
        method: { upi: true, card: true, netbanking: true, wallet: true },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        toast.error("Payment failed. Please try again.");
        setLoading(null);
      });
      rzp.open();
    } catch {
      toast.error("Something went wrong");
    } finally {
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
              {loading === plan.key ? "Processing..." : plan.buttonText}
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
