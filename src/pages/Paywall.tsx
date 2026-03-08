import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Shield, Lock, CheckCircle2, Sparkles, IndianRupee, Loader2 } from "lucide-react";
import { toast } from "sonner";

const plans = [
  {
    key: "one_time",
    price: 15,
    label: "One-Time Setup",
    period: "once",
    plan_value: "family",
    features: ["Full setup for one parent", "No monthly fee", "First month Family Plan included"],
    highlighted: false,
    buttonText: "Pay ₹15",
  },
  {
    key: "family",
    price: 10,
    label: "Family Plan",
    period: "/month",
    plan_value: "family",
    features: ["Unlimited medicines", "Caretaker dashboard", "Missed dose alerts", "1 caretaker"],
    highlighted: false,
    buttonText: "Pay ₹10",
  },
  {
    key: "pro",
    price: 30,
    label: "Family Pro",
    period: "/month",
    plan_value: "pro",
    badge: "Best Value",
    features: ["Everything in Family Plan", "AI health insights", "Drug interaction checker", "Hospital visits timeline", "3 caretakers"],
    highlighted: true,
    buttonText: "Pay ₹30",
  },
];

const trustBadges = [
  { icon: Shield, label: "Secure Payment" },
  { icon: Lock, label: "End-to-End Encrypted" },
  { icon: IndianRupee, label: "Instant Activation" },
  { icon: CheckCircle2, label: "100% Safe" },
];

const CASHFREE_JS_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";

const loadCashfreeSDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).Cashfree) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = CASHFREE_JS_URL;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Cashfree SDK"));
    document.head.appendChild(script);
  });
};

const Paywall = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activatedPlan, setActivatedPlan] = useState("");
  const [verifying, setVerifying] = useState(false);

  const reason = (location.state as any)?.reason || searchParams.get("reason") || "upgrade";
  const patientProfileId =
    (location.state as any)?.patientProfileId || searchParams.get("patient_profile_id");

  // Check for return from Cashfree payment
  useEffect(() => {
    const orderId = searchParams.get("order_id");
    const plan = searchParams.get("plan");
    const ppId = searchParams.get("patient_profile_id");

    if (orderId && plan && ppId) {
      verifyPayment(orderId, plan, ppId);
    }
  }, []);

  const verifyPayment = async (orderId: string, plan: string, ppId: string) => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: {
          order_id: orderId,
          plan,
          amount: plans.find((p) => p.plan_value === plan)?.price || 0,
          patient_profile_id: ppId,
        },
      });

      if (error) throw error;
      if (data?.success) {
        setActivatedPlan(plan === "pro" ? "Family Pro" : "Family");
        setShowSuccess(true);
      } else {
        toast.error("Payment verification failed. Please contact support.");
      }
    } catch {
      toast.error("Could not verify payment. Please contact support.");
    } finally {
      setVerifying(false);
    }
  };

  const handlePayment = async (plan: typeof plans[0]) => {
    if (!patientProfileId) {
      toast.error("Patient profile not found");
      return;
    }

    setProcessing(true);
    try {
      // Load Cashfree SDK
      await loadCashfreeSDK();

      // Create order via edge function
      const { data, error } = await supabase.functions.invoke("create-cashfree-order", {
        body: {
          amount: plan.price,
          plan: plan.plan_value,
          patient_profile_id: patientProfileId,
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Failed to create order");
      }

      const { payment_session_id } = data;

      // Initialize Cashfree checkout
      const cashfree = (window as any).Cashfree({ mode: "production" });

      const result = await cashfree.checkout({
        paymentSessionId: payment_session_id,
        redirectTarget: "_self",
      });

      // If we reach here, it means redirect didn't happen (popup mode)
      if (result?.error) {
        toast.error(result.error.message || "Payment failed");
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground">Verifying your payment...</p>
          <p className="text-sm text-muted-foreground mt-2">Please wait, this will only take a moment.</p>
        </div>
      </div>
    );
  }

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
            Your payment is confirmed. All premium features are now unlocked.
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
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="text-foreground p-1">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Pricing</h1>
        <div className="w-6" />
      </div>

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

      <div className="px-4 mt-6 max-w-lg mx-auto space-y-4">
        {plans.map((plan) => (
          <div
            key={plan.key}
            className={`rounded-2xl border-2 p-5 transition-all relative ${
              plan.highlighted ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-card"
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
              disabled={processing}
              className={`w-full mt-4 py-3.5 rounded-xl text-base font-bold transition-all disabled:opacity-50 ${
                plan.highlighted
                  ? "bg-primary text-primary-foreground shadow-lg hover:opacity-90 text-lg py-4"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              }`}
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  Processing...
                </span>
              ) : (
                plan.buttonText
              )}
            </button>
          </div>
        ))}
      </div>

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
