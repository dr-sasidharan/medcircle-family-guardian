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
  { icon: ScanLine, title: "AI Prescription Scanner", desc: "Scan any prescription & instantly understand your medicines", color: "text-primary" },
  { icon: Bell, title: "Smart Reminders", desc: "Never miss a dose with timing-aware medicine reminders", color: "text-warning" },
  { icon: Shield, title: "Drug Interaction Alerts", desc: "AI checks for dangerous drug interactions automatically", color: "text-destructive" },
  { icon: Stethoscope, title: "Symptom Checker", desc: "Describe symptoms & get instant AI health guidance", color: "text-violet-500" },
  { icon: QrCode, title: "Emergency QR Card", desc: "Share your health profile instantly with any doctor", color: "text-blue-500" },
  { icon: Brain, title: "Doctor Summary", desc: "AI-generated health reports to share with your doctor", color: "text-success" },
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
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img src={logo} alt="MedCircle" className="w-8 h-8" />
            <span className="font-bold text-lg text-foreground">MedCircle</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            {canInstall && (
              <button onClick={install} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold bg-primary text-primary-foreground">
                <Download size={14} /> Install
              </button>
            )}
            {isInstalled && <span className="text-xs text-muted-foreground px-2">✅ Installed</span>}
            <button onClick={() => navigate("/auth?mode=login")} className="px-4 py-2 rounded-xl text-sm font-bold text-primary hover:bg-primary/5">Log In</button>
            <button onClick={() => navigate("/auth")} className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-primary-foreground">Sign Up</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 to-background">
        <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-1.5 rounded-full text-sm font-bold mb-6 text-primary">
            <Pill size={14} /> India's #1 Family Medicine Guardian
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight max-w-3xl mx-auto">
            Your Family's Health, <br />
            <span className="text-primary">Simplified & Safe</span>
          </h1>
          <p className="text-lg text-muted-foreground mt-5 max-w-xl mx-auto leading-relaxed">
            Scan prescriptions, track medicines, check drug interactions & share emergency health cards — all designed for Indian families & elderly patients.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <button onClick={() => navigate("/auth")}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-2xl text-lg font-bold shadow-lg hover:opacity-90">
              <Heart size={20} /> Get Started Free
            </button>
            <button onClick={() => navigate("/auth?mode=login&demo=true")}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-card border-2 border-primary/30 text-primary px-8 py-4 rounded-2xl text-lg font-bold hover:bg-primary/5">
              🎮 Try Demo
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">No credit card required · Available in English & Tamil</p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground">Everything Your Family Needs</h2>
          <p className="text-muted-foreground mt-2">Powered by AI, built for Indian families</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 group cursor-pointer shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-muted group-hover:scale-110 transition-transform">
                <f.icon size={24} className={f.color} />
              </div>
              <h3 className="font-bold text-base text-foreground mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 bg-muted/50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">How It Works</h2>
            <p className="text-muted-foreground mt-2">Get started in 3 simple steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Scan Your Prescription", desc: "Take a photo — AI extracts all medicines, dosages & timings instantly", emoji: "📸" },
              { step: "2", title: "Get Smart Reminders", desc: "Morning, afternoon & night — never miss a dose with alerts", emoji: "⏰" },
              { step: "3", title: "Share with Family", desc: "Add caretakers who get alerts if you miss a medicine", emoji: "👨‍👩‍👧" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-5xl mb-4">{s.emoji}</div>
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold mb-3">{s.step}</div>
                <h3 className="font-bold text-lg text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground">Trusted by Families</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} size={16} className="text-warning fill-warning" />
                ))}
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">"{t.text}"</p>
              <p className="text-sm font-bold text-foreground">
                {t.name} {t.age && <span className="text-muted-foreground font-normal">· Age {t.age}</span>}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-10 relative overflow-hidden shadow-sm">
            <h2 className="text-3xl font-bold mb-3 text-foreground">Start Protecting Your Family Today</h2>
            <p className="text-muted-foreground mb-8">Join thousands of Indian families who trust MedCircle</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => navigate("/auth")}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl text-lg font-bold bg-primary text-primary-foreground shadow-lg hover:opacity-90">
                Create Free Account <ChevronRight size={18} className="inline ml-1" />
              </button>
              <button onClick={() => navigate("/auth?mode=login&demo=true")}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl text-lg font-bold bg-card border-2 border-border text-foreground hover:bg-muted">
                🎮 Try Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="MedCircle" className="w-6 h-6" />
            <span className="font-bold text-sm text-foreground">MedCircle Family Guardian</span>
          </div>
          <p className="text-xs text-muted-foreground">⚕️ For awareness only. Always consult your doctor before changing medication.</p>
          <p className="text-xs text-muted-foreground">© 2026 MedCircle. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;
