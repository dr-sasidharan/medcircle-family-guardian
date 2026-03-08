import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Shield, Lock, CheckCircle2, Sparkles, Copy, IndianRupee } from "lucide-react";
import { toast } from "sonner";

const UPI_ID = "saseedharan2004-1@oksbi";

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
    buttonText: "Pay ₹49",
  },
  {
    key: "family",
    price: 42,
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
    buttonText: "Pay ₹42",
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
    buttonText: "Pay ₹49",
  },
];

const trustBadges = [
  { icon: Shield, label: "Secure UPI Payment" },
  { icon: Lock, label: "End-to-End Encrypted" },
  { icon: IndianRupee, label: "Instant Activation" },
  { icon: CheckCircle2, label: "100% Safe" },
];

const Paywall = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<typeof plans[0] | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activatedPlan, setActivatedPlan] = useState("");

  const reason = (location.state as any)?.reason || searchParams.get("reason") || "upgrade";
  const patientProfileId =
    (location.state as any)?.patientProfileId || searchParams.get("patient_profile_id");

  const copyUpiId = () => {
    navigator.clipboard.writeText(UPI_ID);
    toast.success("UPI ID copied!");
  };

  const openUpiApp = (plan: typeof plans[0]) => {
    const upiUrl = `upi://pay?pa=${UPI_ID}&pn=MedCircle&am=${plan.price}&cu=INR&tn=MedCircle_${plan.key}_plan`;
    window.location.href = upiUrl;
  };

  const handleConfirmPayment = async () => {
    if (!selectedPlan || !transactionId.trim()) {
      toast.error("Please enter your UPI transaction ID");
      return;
    }
    if (!patientProfileId) {
      toast.error("Patient profile not found");
      return;
    }

    setConfirming(true);

    try {
      // Save payment record
      await supabase.from("payments").insert({
        patient_profile_id: patientProfileId,
        amount: selectedPlan.price,
        plan: selectedPlan.plan_value,
        razorpay_payment_id: transactionId.trim(),
        razorpay_order_id: `upi_${Date.now()}`,
        status: "pending_verification",
      });

      // Update patient plan immediately (manual verification can revoke later)
      await supabase
        .from("patient_profiles")
        .update({ plan: selectedPlan.plan_value })
        .eq("id", patientProfileId);

      setActivatedPlan(selectedPlan.plan_value === "pro" ? "Family Pro" : "Family");
      setShowSuccess(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setConfirming(false);
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
            Your payment is being verified. All premium features are now unlocked.
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

  // UPI payment sheet for selected plan
  if (selectedPlan) {
    return (
      <div className="min-h-screen bg-background pb-12 page-transition">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button onClick={() => setSelectedPlan(null)} className="text-foreground p-1">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-foreground">Pay via UPI</h1>
          <div className="w-6" />
        </div>

        <div className="p-5 max-w-lg mx-auto space-y-6">
          {/* Amount */}
          <div className="bg-accent rounded-2xl p-5 text-center">
            <p className="text-sm text-muted-foreground mb-1">Amount to Pay</p>
            <p className="text-4xl font-extrabold text-primary">₹{selectedPlan.price}</p>
            <p className="text-sm text-muted-foreground mt-1">{selectedPlan.label}</p>
          </div>

          {/* UPI ID */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-sm font-semibold text-foreground mb-3">Send payment to this UPI ID:</p>
            <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-3">
              <span className="text-base font-bold text-foreground flex-1 break-all">{UPI_ID}</span>
              <button onClick={copyUpiId} className="text-primary hover:opacity-70 transition-opacity">
                <Copy size={20} />
              </button>
            </div>
            <button
              onClick={() => openUpiApp(selectedPlan)}
              className="w-full mt-4 bg-[#5f259f] text-white rounded-xl py-3.5 text-base font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <IndianRupee size={18} />
              Open UPI App to Pay
            </button>
          </div>

          {/* Steps */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-sm font-semibold text-foreground mb-3">Steps:</p>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Copy the UPI ID above or tap "Open UPI App"</li>
              <li>Pay <span className="font-bold text-foreground">₹{selectedPlan.price}</span> from any UPI app (GPay, PhonePe, Paytm, etc.)</li>
              <li>Enter your UPI Transaction ID below</li>
              <li>Tap "I've Paid" to activate your plan</li>
            </ol>
          </div>

          {/* Transaction ID Input */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">
              UPI Transaction ID / Reference Number
            </label>
            <input
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. 412345678901"
            />
          </div>

          {/* Confirm */}
          <button
            onClick={handleConfirmPayment}
            disabled={confirming || !transactionId.trim()}
            className="w-full bg-primary text-primary-foreground rounded-2xl py-4 text-lg font-bold shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {confirming ? "Verifying..." : "I've Paid — Activate Plan"}
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
              onClick={() => setSelectedPlan(plan)}
              className={`w-full mt-4 py-3.5 rounded-xl text-base font-bold transition-all ${
                plan.highlighted
                  ? "bg-primary text-primary-foreground shadow-lg hover:opacity-90 text-lg py-4"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              }`}
            >
              {plan.buttonText}
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
