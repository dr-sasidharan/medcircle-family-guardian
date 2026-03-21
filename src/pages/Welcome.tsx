import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import LanguageToggle from "@/components/LanguageToggle";
import logo from "@/assets/medcircle-logo.png";
import {
  Heart, UserRound, ScanLine, Shield, Bell, Stethoscope,
  Pill, QrCode, Brain, ChevronRight, Star, Download,
} from "lucide-react";

const features = [
  {
    icon: ScanLine,
    title: "AI Prescription Scanner",
    desc: "Scan any prescription & instantly understand your medicines",
    color: "#0d9488",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    desc: "Never miss a dose with timing-aware medicine reminders",
    color: "#f59e0b",
  },
  {
    icon: Shield,
    title: "Drug Interaction Alerts",
    desc: "AI checks for dangerous drug interactions automatically",
    color: "#f43f5e",
  },
  {
    icon: Stethoscope,
    title: "Symptom Checker",
    desc: "Describe symptoms & get instant AI health guidance",
    color: "#8b5cf6",
  },
  {
    icon: QrCode,
    title: "Emergency QR Card",
    desc: "Share your health profile instantly with any doctor",
    color: "#3b82f6",
  },
  {
    icon: Brain,
    title: "Doctor Summary",
    desc: "AI-generated health reports to share with your doctor",
    color: "#10b981",
  },
];

const testimonials = [
  { name: "Priya S.", age: 68, text: "My children added me on MedCircle and now they get alerts if I miss any medicine. Peace of mind for the whole family.", stars: 5 },
  { name: "Dr. Ramesh K.", age: null, text: "The emergency QR code saved time in A&E. I could instantly see the patient's medicines and allergies.", stars: 5 },
  { name: "Suresh M.", age: 72, text: "I just scan my prescription and it tells me everything in Tamil. Very useful for elderly people like me.", stars: 5 },
];

const Welcome = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { canInstall, isInstalled, install } = useInstallPrompt();

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass-header">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img src={logo} alt="MedCircle" className="w-8 h-8" />
            <span className="font-heading font-extrabold text-lg text-white">MedCircle</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            {canInstall && (
              <button
                onClick={install}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-heading font-bold text-white"
                style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}
              >
                <Download size={14} /> Install
              </button>
            )}
            {isInstalled && (
              <span className="text-xs text-glass-muted px-2">✅ Installed</span>
            )}
            <button
              onClick={() => navigate("/auth?mode=login")}
              className="px-4 py-2 rounded-xl text-sm font-heading font-bold text-[#34d399] glass-pill hover:bg-white/10"
            >
              Log In
            </button>
            <button
              onClick={() => navigate("/auth")}
              className="px-4 py-2 rounded-xl text-sm font-heading font-bold text-white"
              style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-20 text-center">
          <div className="inline-flex items-center gap-2 glass-pill px-4 py-1.5 text-sm font-bold mb-6 text-[#34d399]">
            <Pill size={14} /> India's #1 Family Medicine Guardian
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-extrabold text-white leading-tight max-w-3xl mx-auto">
            Your Family's Health, <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #34d399, #0d9488)" }}
            >
              Simplified & Safe
            </span>
          </h1>

          <p className="text-lg text-glass-secondary mt-5 max-w-xl mx-auto leading-relaxed">
            Scan prescriptions, track medicines, check drug interactions & share emergency health cards — all designed for Indian families & elderly patients.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <button
              onClick={() => navigate("/auth")}
              className="w-full sm:w-auto flex items-center justify-center gap-2 text-white px-8 py-4 rounded-2xl text-lg font-heading font-bold"
              style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)", boxShadow: "0 6px 20px rgba(13,148,136,0.5)" }}
            >
              <Heart size={20} /> Get Started Free
            </button>
            <button
              onClick={() => navigate("/auth?mode=login&demo=true")}
              className="w-full sm:w-auto flex items-center justify-center gap-2 glass-card text-[#34d399] px-8 py-4 rounded-2xl text-lg font-heading font-bold hover:bg-white/12"
              style={{ border: "2px solid rgba(13,148,136,0.4)" }}
            >
              🎮 Try Demo
            </button>
          </div>

          <p className="text-sm text-glass-muted mt-4">
            No credit card required · Available in English & Tamil
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-heading font-extrabold text-white">Everything Your Family Needs</h2>
          <p className="text-glass-secondary mt-2">Powered by AI, built for Indian families</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={i}
              className="glass-card p-6 group cursor-pointer"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                style={{ background: `${f.color}20` }}
              >
                <f.icon size={24} style={{ color: f.color }} />
              </div>
              <h3 className="font-heading font-bold text-base text-white mb-1">{f.title}</h3>
              <p className="text-sm text-glass-secondary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-extrabold text-white">How It Works</h2>
            <p className="text-glass-secondary mt-2">Get started in 3 simple steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Scan Your Prescription", desc: "Take a photo — AI extracts all medicines, dosages & timings instantly", emoji: "📸" },
              { step: "2", title: "Get Smart Reminders", desc: "Morning, afternoon & night — never miss a dose with alerts", emoji: "⏰" },
              { step: "3", title: "Share with Family", desc: "Add caretakers who get alerts if you miss a medicine", emoji: "👨‍👩‍👧" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-5xl mb-4">{s.emoji}</div>
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold mb-3"
                  style={{ background: "linear-gradient(135deg, #0d9488, #10b981)" }}>
                  {s.step}
                </div>
                <h3 className="font-heading font-bold text-lg text-white mb-2">{s.title}</h3>
                <p className="text-sm text-glass-secondary leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-heading font-extrabold text-white">Trusted by Families</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <div key={i} className="glass-card p-6">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} size={16} className="text-[#f59e0b] fill-[#f59e0b]" />
                ))}
              </div>
              <p className="text-glass-secondary text-sm leading-relaxed mb-4">"{t.text}"</p>
              <p className="text-sm font-heading font-bold text-white">
                {t.name} {t.age && <span className="text-glass-muted font-normal">· Age {t.age}</span>}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="glass-card-light p-10 relative overflow-hidden"
            style={{ border: "1px solid rgba(13,148,136,0.3)", boxShadow: "0 0 40px rgba(13,148,136,0.2)" }}>
            <h2 className="text-3xl font-heading font-extrabold mb-3 relative z-10 text-white">
              Start Protecting Your Family Today
            </h2>
            <p className="text-glass-secondary mb-8 relative z-10">
              Join thousands of Indian families who trust MedCircle
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
              <button
                onClick={() => navigate("/auth")}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl text-lg font-heading font-bold text-white"
                style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)", boxShadow: "0 6px 20px rgba(13,148,136,0.5)" }}
              >
                Create Free Account <ChevronRight size={18} className="inline ml-1" />
              </button>
              <button
                onClick={() => navigate("/auth?mode=login&demo=true")}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl text-lg font-heading font-bold text-white glass-pill hover:bg-white/10"
                style={{ border: "2px solid rgba(255,255,255,0.3)" }}
              >
                🎮 Try Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="MedCircle" className="w-6 h-6" />
            <span className="font-heading font-bold text-sm text-white">MedCircle Family Guardian</span>
          </div>
          <p className="text-xs text-glass-muted">
            ⚕️ For awareness only. Always consult your doctor before changing medication.
          </p>
          <p className="text-xs text-glass-muted">© 2026 MedCircle. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;
