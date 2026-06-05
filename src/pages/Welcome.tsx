import { useNavigate } from "react-router-dom";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import LanguageToggle from "@/components/LanguageToggle";
import logo from "@/assets/medcircle-logo.webp";
import {
  Heart, ScanLine, Shield, Bell, Stethoscope, Pill,
  QrCode, Brain, ChevronRight, Star, Download, Sparkles,
  CheckCircle2, Lock, Activity, Users, Zap, ArrowRight,
} from "lucide-react";

const features = [
  { icon: ScanLine, title: "AI Prescription Scanner", desc: "Scan any prescription and instantly understand every medicine, dose and timing.", grad: "from-teal-400 to-cyan-400" },
  { icon: Bell, title: "Smart Reminders", desc: "Adaptive, timing-aware reminders that learn your routine — never miss a dose.", grad: "from-amber-400 to-orange-400" },
  { icon: Shield, title: "Drug Interaction Alerts", desc: "Real-time AI safety checks across every medicine in your family circle.", grad: "from-rose-400 to-pink-400" },
  { icon: Stethoscope, title: "Symptom Checker", desc: "Describe symptoms and get clear, doctor-grade AI health guidance.", grad: "from-violet-400 to-fuchsia-400" },
  { icon: QrCode, title: "Emergency QR Card", desc: "Share a full medical profile with any doctor in a single scan.", grad: "from-sky-400 to-blue-500" },
  { icon: Brain, title: "Doctor Summary", desc: "AI-curated visit reports your doctor can read in 30 seconds.", grad: "from-emerald-400 to-teal-500" },
];

const testimonials = [
  { name: "Priya S.", age: 68, text: "My children added me on MedCircle and now they get alerts if I miss any medicine. Peace of mind for the whole family.", stars: 5 },
  { name: "Dr. Ramesh K.", age: null, text: "The emergency QR code saved time in A&E. I could instantly see the patient's medicines and allergies.", stars: 5 },
  { name: "Suresh M.", age: 72, text: "I just scan my prescription and it tells me everything in Tamil. Very useful for elderly people like me.", stars: 5 },
];

const stats = [
  { label: "Families protected", value: "120K+" },
  { label: "Doses tracked", value: "8.4M" },
  { label: "Interaction alerts", value: "210K" },
  { label: "Avg. user rating", value: "4.9 ★" },
];

const Welcome = () => {
  const navigate = useNavigate();
  const { canInstall, isInstalled, install } = useInstallPrompt();

  return (
    <div className="relative min-h-screen overflow-x-hidden mesh-bg animate-mesh-shift text-slate-900">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <div className="blob animate-float-slow" style={{ background: "#14B8A6", width: 520, height: 520, top: -120, left: -120 }} />
        <div className="blob animate-float-slow" style={{ background: "#22D3EE", width: 560, height: 560, top: 80, right: -160, animationDelay: "2s" }} />
        <div className="blob animate-float-slow" style={{ background: "#0F172A", width: 480, height: 480, bottom: -160, left: "30%", opacity: 0.35, animationDelay: "4s" }} />
      </div>

      {/* Floating glass navbar */}
      <nav className="sticky top-4 z-50 mx-auto max-w-6xl px-4">
        <div className="glass-nav rounded-2xl flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-400 blur-md opacity-60" />
              <img src={logo} alt="MedCircle" className="relative w-9 h-9 rounded-xl" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-slate-900">MedCircle</span>
          </div>
          <div className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-600">
            {["Features", "AI Assistant", "Trust", "Reviews"].map((l) => (
              <a key={l} href={`#${l.toLowerCase().replace(" ", "-")}`}
                 className="relative px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-white/60 transition-all">
                {l}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            {canInstall && (
              <button onClick={install} className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-white/70 border border-white/70 hover:bg-white text-slate-800">
                <Download size={14} /> Install
              </button>
            )}
            {isInstalled && <span className="hidden sm:inline text-xs text-slate-500 px-2">Installed</span>}
            <button onClick={() => navigate("/auth?mode=login")}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-white/70">
              Log In
            </button>
            <button onClick={() => navigate("/auth")}
                    className="gradient-cta text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5">
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-6 pt-20 pb-28">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 glass-panel rounded-full px-3.5 py-1.5 text-xs font-semibold text-teal-700 mb-6">
              <Sparkles size={13} className="text-teal-500" />
              AI-powered family health, reimagined
            </div>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
              Your family's health,
              <br />
              <span className="gradient-text">safer by design.</span>
            </h1>
            <p className="text-lg text-slate-600 mt-6 max-w-xl leading-relaxed font-sans">
              MedCircle is the AI healthcare platform that scans prescriptions, prevents
              dangerous drug interactions, and keeps every caretaker in sync — built for
              modern Indian families.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-9">
              <button onClick={() => navigate("/auth")}
                className="gradient-cta group text-white px-7 py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5">
                <Heart size={18} /> Get Started Free
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </button>
              <button onClick={() => navigate("/auth?mode=login&demo=true")}
                className="glass-panel gradient-border text-slate-800 px-7 py-4 rounded-2xl text-base font-semibold hover:-translate-y-0.5 transition-all">
                Try Live Demo
              </button>
            </div>
            <div className="flex items-center gap-5 mt-7 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-teal-500" /> No credit card</span>
              <span className="flex items-center gap-1.5"><Lock size={14} className="text-teal-500" /> HIPAA-aligned</span>
              <span className="flex items-center gap-1.5"><Zap size={14} className="text-teal-500" /> &lt; 2s scan</span>
            </div>
          </div>

          {/* Floating glass dashboard mockup */}
          <div className="relative animate-fade-up [animation-delay:120ms] perspective-[1400px]">
            <div className="absolute -inset-10 bg-gradient-to-br from-teal-300/40 via-cyan-300/30 to-transparent rounded-[40px] blur-3xl" />
            <div className="relative glass-panel rounded-3xl p-5 [transform:rotateX(6deg)_rotateY(-8deg)] animate-float-slow">
              {/* mock header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Good morning</p>
                  <p className="font-display text-lg font-bold">Priya's Circle</p>
                </div>
                <div className="flex -space-x-2">
                  {["from-teal-400 to-cyan-400","from-violet-400 to-fuchsia-400","from-amber-400 to-orange-400"].map((g,i)=>(
                    <div key={i} className={`w-8 h-8 rounded-full bg-gradient-to-br ${g} border-2 border-white`} />
                  ))}
                </div>
              </div>

              {/* Prescription scan card */}
              <div className="relative rounded-2xl bg-white/70 border border-white/80 p-4 mb-3 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-300/40 to-transparent rounded-full blur-2xl" />
                <div className="relative flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-cta flex items-center justify-center">
                    <ScanLine size={18} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 font-medium">Prescription scanned</p>
                    <p className="font-semibold text-sm text-slate-800">4 medicines · Dr. Iyer</p>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full w-[82%] gradient-cta rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Interaction alert */}
              <div className="relative rounded-2xl bg-gradient-to-br from-rose-50 to-white border border-rose-200/70 p-4 mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center">
                    <Shield size={16} className="text-rose-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold text-rose-500">Interaction alert</p>
                    <p className="text-sm font-semibold text-slate-800">Warfarin × Ibuprofen</p>
                    <p className="text-xs text-slate-500 mt-0.5">Bleeding risk · ask Dr. Iyer</p>
                  </div>
                </div>
              </div>

              {/* Family health row */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { i: Activity, l: "Vitals", v: "Stable", c: "text-teal-600" },
                  { i: Pill, l: "Doses", v: "3 of 4", c: "text-cyan-600" },
                  { i: Users, l: "Circle", v: "4 active", c: "text-violet-600" },
                ].map((s,i)=>(
                  <div key={i} className="rounded-xl bg-white/70 border border-white/70 p-3">
                    <s.i size={14} className={s.c} />
                    <p className="text-[10px] text-slate-500 mt-1.5 font-medium">{s.l}</p>
                    <p className="text-sm font-bold text-slate-800">{s.v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating mini card */}
            <div className="absolute -left-6 bottom-6 glass-panel rounded-2xl p-3 flex items-center gap-3 animate-float-slow [animation-delay:1.5s] [transform:rotate(-4deg)]">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <Bell size={16} className="text-white" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-medium">Reminder</p>
                <p className="text-sm font-semibold text-slate-800">Metformin · 8:00 AM</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-20 glass-panel rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6 animate-fade-up [animation-delay:200ms]">
          {stats.map((s,i)=>(
            <div key={i} className="text-center">
              <p className="font-display text-3xl md:text-4xl font-bold gradient-text">{s.value}</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs font-semibold text-teal-600 mb-3">Platform</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            Everything your family needs,
            <span className="gradient-text"> nothing they don't.</span>
          </h2>
          <p className="text-slate-600 mt-4">A unified healthcare layer — engineered with the polish of a fintech and the safety of a hospital system.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={i} className="relative card-hover glass-panel gradient-border rounded-[20px] p-6 overflow-hidden">
              <span className="shine-overlay" />
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.grad} flex items-center justify-center mb-4 shadow-lg shadow-teal-400/20`}>
                <f.icon size={22} className="text-white" />
              </div>
              <h3 className="font-display font-bold text-lg mb-1.5 text-slate-900">{f.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI Showcase */}
      <section id="ai-assistant" className="relative max-w-6xl mx-auto px-6 py-20">
        <div className="relative glass-dark rounded-[28px] p-8 md:p-14 overflow-hidden text-white">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-teal-400/30 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-cyan-400/30 blur-3xl" />

          <div className="relative grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-3 py-1 text-xs font-semibold mb-5">
                <Sparkles size={12} className="text-cyan-300" /> Meet your AI health assistant
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight">
                One assistant.
                <br />
                <span className="bg-gradient-to-r from-teal-300 to-cyan-200 bg-clip-text text-transparent">Every medicine moment.</span>
              </h2>
              <p className="text-white/70 mt-5 max-w-md">
                From prescription scan to dose reminder to interaction check — MedCircle's
                AI runs continuously in the background to keep your family safe.
              </p>

              <div className="mt-7 space-y-2.5">
                {[
                  "Prescription scanning with 99% OCR accuracy",
                  "Real-time drug interaction detection",
                  "Smart, routine-aware medication reminders",
                  "Shared family health records & emergency QR",
                ].map((t,i)=>(
                  <div key={i} className="flex items-center gap-3 text-sm text-white/85">
                    <span className="w-5 h-5 rounded-full bg-gradient-to-br from-teal-400 to-cyan-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={12} className="text-white" />
                    </span>
                    {t}
                  </div>
                ))}
              </div>

              <button onClick={() => navigate("/auth")}
                className="mt-8 gradient-cta text-white px-6 py-3.5 rounded-2xl text-sm font-semibold inline-flex items-center gap-2 hover:-translate-y-0.5 transition-all">
                Try the Assistant <ArrowRight size={16} />
              </button>
            </div>

            {/* Interactive glass dashboard */}
            <div className="relative">
              <div className="glass-panel rounded-3xl p-5 text-slate-900 animate-float-slow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg gradient-cta flex items-center justify-center">
                      <Brain size={16} className="text-white" />
                    </div>
                    <span className="font-display font-bold">Health Assistant</span>
                  </div>
                  <span className="text-[10px] font-semibold text-teal-600 bg-teal-50 px-2 py-1 rounded-full">LIVE</span>
                </div>

                <div className="space-y-2.5">
                  <div className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm">
                    <p className="text-xs text-slate-500 font-medium">You</p>
                    <p className="text-slate-800">Can dad take ibuprofen with his blood thinner?</p>
                  </div>
                  <div className="rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100 px-3.5 py-2.5 text-sm">
                    <p className="text-xs text-teal-700 font-semibold">MedCircle AI</p>
                    <p className="text-slate-800">
                      No — ibuprofen with warfarin raises bleeding risk. I've flagged it
                      in your family circle and notified Dr. Iyer.
                    </p>
                  </div>
                  <div className="rounded-xl bg-rose-50 border border-rose-100 px-3.5 py-2.5 flex items-center gap-2.5">
                    <Shield size={14} className="text-rose-500" />
                    <span className="text-xs font-semibold text-rose-600">Interaction blocked · paracetamol suggested</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section id="trust" className="relative max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-teal-600 mb-3">Trust & Security</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            Built to <span className="gradient-text">hospital-grade</span> standards.
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { i: Lock, t: "End-to-end encrypted", d: "AES-256 at rest, TLS 1.3 in transit." },
            { i: Shield, t: "HIPAA-aligned", d: "Privacy controls modeled on US healthcare." },
            { i: CheckCircle2, t: "ABDM compatible", d: "India's Ayushman Bharat health stack." },
            { i: Activity, t: "99.99% uptime", d: "Resilient infra across multiple regions." },
          ].map((b,i)=>(
            <div key={i} className="glass-panel rounded-2xl p-5 card-hover">
              <b.i size={22} className="text-teal-600" />
              <p className="font-display font-bold mt-3 text-slate-900">{b.t}</p>
              <p className="text-xs text-slate-500 mt-1">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="reviews" className="relative max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            Loved by <span className="gradient-text">families & doctors.</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <div key={i} className="glass-panel rounded-2xl p-6 card-hover">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} size={16} className="text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-slate-700 text-sm leading-relaxed mb-4">"{t.text}"</p>
              <p className="text-sm font-bold text-slate-900">
                {t.name} {t.age && <span className="text-slate-500 font-normal">· Age {t.age}</span>}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative max-w-5xl mx-auto px-6 py-20">
        <div className="relative glass-dark rounded-[28px] p-10 md:p-14 text-center overflow-hidden text-white">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-teal-400/40 to-cyan-400/30 blur-3xl" />
          <div className="relative">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Start protecting your family <span className="bg-gradient-to-r from-teal-300 to-cyan-200 bg-clip-text text-transparent">today.</span>
            </h2>
            <p className="text-white/70 mb-8 max-w-lg mx-auto">Join thousands of families who trust MedCircle to keep their loved ones safe.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button onClick={() => navigate("/auth")}
                className="gradient-cta text-white px-7 py-4 rounded-2xl text-base font-semibold flex items-center gap-2 hover:-translate-y-0.5 transition-all">
                Create Free Account <ChevronRight size={18} />
              </button>
              <button onClick={() => navigate("/auth?mode=login&demo=true")}
                className="bg-white/10 border border-white/20 backdrop-blur-xl text-white px-7 py-4 rounded-2xl text-base font-semibold hover:bg-white/20 transition-all">
                Try Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-10 border-t border-white/40">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="MedCircle" className="w-6 h-6" />
            <span className="font-display font-bold text-sm text-slate-900">MedCircle Family Guardian</span>
          </div>
          <p className="text-xs text-slate-500">For awareness only. Always consult your doctor before changing medication.</p>
          <p className="text-xs text-slate-500">© 2026 MedCircle. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;
