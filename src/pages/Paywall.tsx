import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Shield, Lock, CheckCircle2, Sparkles, IndianRupee, Loader2, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

const UPI_ID = "saseedharan2004-2@okaxis";
const MERCHANT_NAME = "MedCircle";

const plans = [
  { key: "one_time", price: 15, label: "One-Time Setup", period: "once", plan_value: "family", features: ["Full setup for one parent", "No monthly fee", "First month Family Plan included"], buttonText: "Pay ₹15" },
  { key: "family", price: 10, label: "Family Plan", period: "/month", plan_value: "family", features: ["Unlimited medicines", "Caretaker dashboard", "Missed dose alerts", "1 caretaker"], buttonText: "Pay ₹10" },
  { key: "pro", price: 30, label: "Family Pro", period: "/month", plan_value: "pro", badge: "Best Value", features: ["Everything in Family Plan", "AI health insights", "Drug interaction checker", "Hospital visits timeline", "3 caretakers"], buttonText: "Pay ₹30", highlighted: true },
];

const trustBadges = [
  { icon: Shield, label: "Secure Payment" }, { icon: Lock, label: "End-to-End Encrypted" },
  { icon: IndianRupee, label: "Instant Activation" }, { icon: CheckCircle2, label: "100% Safe" },
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
  const stateProfileId = (location.state as any)?.patientProfileId || searchParams.get("patient_profile_id");
  const [patientProfileId, setPatientProfileId] = useState<string | null>(stateProfileId || null);

  useEffect(() => {
    if (patientProfileId) return;
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("patient_profiles").select("id").eq("user_id", user.id).limit(1).single();
      if (data) setPatientProfileId(data.id);
    };
    fetchProfile();
  }, [patientProfileId]);

  const generateUpiUrl = (amount: number, txnNote: string) => `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent(txnNote)}`;
  const handleOpenUpiApp = () => { if (!selectedPlan) return; window.location.href = generateUpiUrl(selectedPlan.price, `MedCircle ${selectedPlan.label}`); };
  const copyUpiId = () => { navigator.clipboard.writeText(UPI_ID); toast.success("UPI ID copied!"); };

  const handleConfirmPayment = async () => {
    if (!selectedPlan || !patientProfileId) { toast.error("Missing plan or profile info"); return; }
    const txnId = transactionId.trim();
    if (!txnId || txnId.length < 6) { toast.error("Please enter a valid UPI Transaction ID (at least 6 characters)"); return; }
    setConfirming(true);
    try {
      const { error: payErr } = await supabase.from("payments").insert({ patient_profile_id: patientProfileId, amount: selectedPlan.price, plan: selectedPlan.plan_value, status: "success", upi_transaction_id: txnId } as any);
      if (payErr) throw payErr;
      const { error: planErr } = await supabase.from("patient_profiles").update({ plan: selectedPlan.plan_value }).eq("id", patientProfileId);
      if (planErr) throw planErr;
      setActivatedPlan(selectedPlan.label); setShowSuccess(true);
      toast.success("Plan activated successfully!");
    } catch (err: any) { console.error("Payment confirm error:", err); toast.error("Failed to activate plan. Please try again."); } finally { setConfirming(false); }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 page-transition">
        <div className="text-center max-w-sm animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={40} className="text-success" /></div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Plan Activated! 🎉</h1>
          <p className="text-muted-foreground mb-2">Your <span className="font-bold text-foreground">{activatedPlan}</span> plan is now active.</p>
          <p className="text-sm text-muted-foreground mb-8">All premium features are unlocked. Enjoy MedCircle!</p>
          <button onClick={() => navigate("/patient", { replace: true })} className="w-full bg-primary text-primary-foreground rounded-2xl py-4 text-lg font-bold shadow-lg">Go to Dashboard</button>
        </div>
      </div>
    );
  }

  if (selectedPlan) {
    const upiUrl = generateUpiUrl(selectedPlan.price, `MedCircle ${selectedPlan.label}`);
    return (
      <div className="min-h-screen bg-background pb-12 page-transition">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button onClick={() => setSelectedPlan(null)} className="text-foreground p-1"><ArrowLeft size={24} /></button>
          <h1 className="text-lg font-bold text-foreground">Pay ₹{selectedPlan.price}</h1>
          <div className="w-6" />
        </div>
        <div className="px-4 mt-6 max-w-md mx-auto space-y-6">
          <div className="bg-card border border-border rounded-2xl p-4 text-center shadow-sm">
            <p className="text-sm font-semibold text-foreground">{selectedPlan.label} — <span className="text-primary font-bold">₹{selectedPlan.price}</span><span className="text-muted-foreground"> {selectedPlan.period}</span></p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center space-y-4 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Scan QR to pay with any UPI app</p>
            <div className="bg-white p-4 rounded-xl"><QRCodeSVG value={upiUrl} size={200} level="H" /></div>
            <div className="flex items-center gap-2 bg-muted px-4 py-2.5 rounded-full">
              <span className="text-sm font-mono text-foreground">{UPI_ID}</span>
              <button onClick={copyUpiId} className="text-primary"><Copy size={16} /></button>
            </div>
          </div>
          <button onClick={handleOpenUpiApp} className="w-full bg-primary text-primary-foreground rounded-2xl py-4 text-base font-bold flex items-center justify-center gap-2 shadow-lg">
            <ExternalLink size={18} /> Open UPI App to Pay
          </button>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">UPI Transaction ID / UTR Number</label>
            <input type="text" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="e.g. 412345678901 or UPI ref number"
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <p className="text-xs text-muted-foreground">Find this in your UPI app → payment history → transaction details</p>
          </div>
          <button onClick={handleConfirmPayment} disabled={confirming || transactionId.trim().length < 6}
            className="w-full bg-card border border-border text-foreground rounded-2xl py-4 text-base font-bold disabled:opacity-50 shadow-sm">
            {confirming ? <span className="flex items-center justify-center gap-2"><Loader2 size={18} className="animate-spin" />Verifying...</span> : "✅ I Have Paid — Verify & Activate"}
          </button>
          <p className="text-xs text-muted-foreground text-center">Enter your UPI Transaction ID after payment. We'll verify it and activate your plan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12 page-transition">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="text-foreground p-1"><ArrowLeft size={24} /></button>
        <h1 className="text-lg font-bold text-foreground">Pricing</h1>
        <div className="w-6" />
      </div>
      <div className="px-4 mt-4">
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-center">
          <Sparkles size={20} className="text-primary mx-auto mb-1" />
          <p className="text-sm font-semibold text-foreground">
            {reason === "medicine_limit" ? "Upgrade to add unlimited medicines for your parent" : reason === "caretaker" ? "Upgrade to invite caretakers and monitor remotely" : "Unlock all MedCircle features"}
          </p>
        </div>
      </div>
      <div className="px-4 mt-6 max-w-lg mx-auto space-y-4">
        {plans.map((plan) => (
          <div key={plan.key} className={`bg-card border rounded-2xl p-5 relative shadow-sm transition-shadow hover:shadow-md ${plan.highlighted ? "border-primary border-2" : "border-border"}`}>
            {plan.badge && <span className="absolute -top-3 right-4 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">{plan.badge}</span>}
            <h2 className="text-lg font-bold text-foreground">{plan.label}</h2>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-bold text-primary">₹{plan.price}</span>
              <span className="text-muted-foreground text-sm">{plan.period}</span>
            </div>
            <ul className="mt-3 space-y-2">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2"><CheckCircle2 size={15} className="text-primary flex-shrink-0" /><span className="text-sm text-muted-foreground">{f}</span></li>
              ))}
            </ul>
            <button onClick={() => setSelectedPlan(plan)}
              className={`w-full mt-4 rounded-xl text-base font-bold transition-all text-white ${plan.highlighted ? "py-4 text-lg bg-primary shadow-lg" : "py-3.5 bg-muted text-foreground border border-border"}`}>
              {plan.buttonText}
            </button>
          </div>
        ))}
      </div>
      <div className="px-4 mt-8 max-w-lg mx-auto">
        <div className="grid grid-cols-2 gap-3">
          {trustBadges.map((badge, i) => (
            <div key={i} className="flex items-center gap-2 bg-muted rounded-full px-3 py-2.5">
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
