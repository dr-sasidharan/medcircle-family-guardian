import LanguageToggle from "@/components/LanguageToggle";
import { ArrowLeft, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PLAN_NAMES: Record<string, string> = {
  free: "Free",
  family_plan: "Family Plan",
  family_pro: "Family Pro",
  one_time: "One-Time Setup",
};

const PERIOD_NAMES: Record<string, string> = {
  per_month: "month",
  once: "once",
};

const plans = [
  {
    key: "free",
    price: "₹0",
    period: "",
    features: ["Reminders only", "Max 2 medicines", "No family access"],
    highlighted: false,
  },
  {
    key: "one_time",
    price: "₹15",
    periodKey: "once",
    features: ["Full setup for one parent", "No monthly fee", "First month Family Plan included"],
    highlighted: false,
  },
  {
    key: "family_plan",
    price: "₹10",
    periodKey: "per_month",
    features: ["Unlimited medicines", "Caretaker dashboard", "Missed dose alerts", "1 caretaker"],
    highlighted: true,
  },
  {
    key: "family_pro",
    price: "₹30",
    periodKey: "per_month",
    features: ["Everything in Family Plan", "AI health insights", "Drug interaction checker", "Hospital visits timeline", "3 caretakers"],
    highlighted: false,
  },
];

const Pricing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="text-foreground p-1">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Pricing</h1>
        <LanguageToggle />
      </div>

      <div className="px-4 mt-6 max-w-lg mx-auto space-y-5">
        {plans.map((plan) => (
          <div
            key={plan.key}
            className={`rounded-2xl border-2 p-6 transition-all ${
              plan.highlighted
                ? "border-primary bg-primary/5 shadow-lg"
                : "border-border bg-card"
            }`}
          >
            <h2 className="text-xl font-extrabold text-foreground">{PLAN_NAMES[plan.key] || plan.key}</h2>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl font-extrabold text-primary">{plan.price}</span>
              {plan.periodKey && (
                <span className="text-muted-foreground text-sm">/{PERIOD_NAMES[plan.periodKey] || plan.periodKey}</span>
              )}
            </div>
            <ul className="mt-4 space-y-2.5">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Check size={16} className="text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground">{f}</span>
                </li>
              ))}
            </ul>
            <button
              className={`w-full mt-5 py-3.5 rounded-xl text-base font-bold transition-opacity hover:opacity-90 ${
                plan.highlighted
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              Get Started
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Pricing;