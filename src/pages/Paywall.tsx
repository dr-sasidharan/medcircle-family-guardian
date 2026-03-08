import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Shield, Lock, CheckCircle2, Sparkles, IndianRupee, Loader2, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

const UPI_ID = "saseedharan2004-01@oksbi";
const MERCHANT_NAME = "MedCircle";

const plans = [
  {
    key: "one_time",
    price: 15,
    label: "One-Time Setup",
    period: "once",
    plan_value: "family",
    features: ["Full setup for one parent", "No monthly fee", "First month Family Plan included"],
    buttonText: "Pay ₹15",
  },
  {
    key: "family",
    price: 10,
    label: "Family Plan",
    period: "/month",
    plan_value: "family",
    features: ["Unlimited medicines", "Caretaker dashboard", "Missed dose alerts", "1 caretaker"],
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
    buttonText: "Pay ₹30",
    highlighted: true,
  },
];

const trustBadges = [
  { icon: Shield, label: "Secure Payment" },
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
  const [confirming, setConfirming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activatedPlan, setActivatedPlan] = useState("");
  const [transactionId, setTransactionId] = useState("");

  const reason = (location.state as any)?.reason || searchParams.get("reason") || "upgrade";
  const patientProfileId =
    (location.state as any)?.patientProfileId || searchParams.get("patient_profile_id");

  const generateUpiUrl = (amount: number, txnNote: string) => {
    return `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent(txnNote)}`;
  };

  const handleSelectPlan = (plan: typeof plans[0]) => {
    setSelectedPlan(plan);
  };

  const handleOpenUpiApp = () => {
    if (!selectedPlan) return;
    const url = generateUpiUrl(selectedPlan.price, `MedCircle ${selectedPlan.label}`);
    window.location.href = url;
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(UPI_ID);
    toast.success("UPI ID copied!");
  };

  const handleConfirmPayment = async () => {
    if (!selectedPlan || !patientProfileId) {
      toast.error("Missing plan or profile info");
      return;
    }

    const txnId = transactionId.trim();
    if (!txnId || txnId.length < 6) {
      toast.error("Please enter a valid UPI Transaction ID (at least 6 characters)");
      return;
    }

    setConfirming(true);
    try {
      // Record payment with transaction ID — pending admin verification
      const { error: payErr } = await supabase.from("payments").insert({
        patient_profile_id: patientProfileId,
        amount: selectedPlan.price,
        plan: selectedPlan.plan_value,
        status: "pending_verification",
        razorpay_payment_id: txnId, // storing UPI txn ID here
      } as any);

      if (payErr) throw payErr;

      setActivatedPlan(selectedPlan.label);
      setShowSuccess(true);
      toast.success("Payment submitted for verification!");
    } catch (err: any) {
      console.error("Payment confirm error:", err);
      toast.error("Failed to submit payment. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 page-transition">
        <div className="text-center max-w-sm animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground mb-2">
            Payment Submitted! 🎉
          </h1>
          <p className="text-muted-foreground mb-2">
            Your payment for <span className="font-bold text-foreground">{activatedPlan}</span> is being verified.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Your plan will be activated once we verify your UPI transaction. This usually takes just a few minutes.
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

  // QR Payment screen
  if (selectedPlan) {
    const upiUrl = generateUpiUrl(selectedPlan.price, `MedCircle ${selectedPlan.label}`);

    return (
      <div className="min-h-screen bg-background pb-12 page-transition">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button onClick={() => setSelectedPlan(null)} className="text-foreground p-1">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-foreground">Pay ₹{selectedPlan.price}</h1>
          <div className="w-6" />
        </div>

        <div className="px-4 mt-6 max-w-md mx-auto space-y-6">
          {/* Plan summary */}
          <div className="bg-accent rounded-2xl p-4 text-center">
            <p className="text-sm font-semibold text-foreground">
              {selectedPlan.label} — <span className="text-primary font-extrabold">₹{selectedPlan.price}</span>
              <span className="text-muted-foreground"> {selectedPlan.period}</span>
            </p>
          </div>

          {/* QR Code */}
          <div className="bg-card rounded-2xl border-2 border-border p-6 flex flex-col items-center space-y-4">
            <p className="text-sm font-semibold text-foreground">Scan QR to pay with any UPI app</p>
            <div className="bg-white p-4 rounded-xl">
              <QRCodeSVG value={upiUrl} size={200} level="H" />
            </div>
            <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-2.5">
              <span className="text-sm font-mono text-foreground">{UPI_ID}</span>
              <button onClick={copyUpiId} className="text-primary">
                <Copy size={16} />
              </button>
            </div>
          </div>

          {/* Open UPI App button */}
          <button
            onClick={handleOpenUpiApp}
            className="w-full bg-primary text-primary-foreground rounded-2xl py-4 text-base font-bold shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <ExternalLink size={18} />
            Open UPI App to Pay
          </button>

          {/* Confirm payment button */}
          <button
            onClick={handleConfirmPayment}
            disabled={confirming}
            className="w-full bg-foreground text-background rounded-2xl py-4 text-base font-bold shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {confirming ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                Submitting...
              </span>
            ) : (
              "✅ I Have Paid"
            )}
          </button>

          <p className="text-xs text-muted-foreground text-center">
            After paying via UPI, tap "I Have Paid". Our team will verify and activate your plan within minutes.
          </p>
        </div>
      </div>
    );
  }

  // Plan selection screen
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
              onClick={() => handleSelectPlan(plan)}
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
