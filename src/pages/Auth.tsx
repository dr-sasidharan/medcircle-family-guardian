import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Mail, Lock, User, Loader2, ArrowLeft, Phone, KeyRound } from "lucide-react";
import { toast } from "sonner";

type AuthMode = "email" | "phone" | "login" | "caretaker";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const initialMode = (searchParams.get("mode") as AuthMode) || "login";
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [isLogin, setIsLogin] = useState(initialMode === "login");

  // Email fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // Phone fields
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Caretaker fields
  const [caretakerCode, setCaretakerCode] = useState("");

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // Check onboarding status
        supabase
          .from("patient_profiles")
          .select("onboarding_complete")
          .eq("user_id", session.user.id)
          .limit(1)
          .then(({ data }) => {
            if (data?.length && data[0].onboarding_complete) {
              navigate("/patient", { replace: true });
            } else {
              navigate("/onboarding", { replace: true });
            }
          });
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase
          .from("patient_profiles")
          .select("onboarding_complete")
          .eq("user_id", session.user.id)
          .limit(1)
          .then(({ data }) => {
            if (data?.length && data[0].onboarding_complete) {
              navigate("/patient", { replace: true });
            } else {
              navigate("/onboarding", { replace: true });
            }
          });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // OTP countdown timer
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Logged in successfully!");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Check your email for verification link!");
      }
    } catch (error: any) {
      toast.error(error.message);
    }
    setLoading(false);
  };

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { phone },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOtpSent(true);
      setOtpCountdown(60);
      toast.success("OTP sent to your phone!");
    } catch (error: any) {
      toast.error(error.message || "Failed to send OTP");
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast.error("Please enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { phone, otp },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.session) {
        // Set the session manually
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        toast.success(data.is_new_user ? "Account created!" : "Welcome back!");
      }
    } catch (error: any) {
      toast.error(error.message || "Verification failed");
    }
    setLoading(false);
  };

  const handleCaretakerLink = async () => {
    if (!caretakerCode || caretakerCode.length !== 6) {
      toast.error("Please enter the 6-digit MedCircle code");
      return;
    }
    setLoading(true);
    try {
      // First sign up/login as caretaker
      if (!email || !password) {
        toast.error("Please enter your email and password first");
        setLoading(false);
        return;
      }

      // Try sign up first
      let session;
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, is_caretaker: true } },
      });

      if (signUpError) {
        // If already exists, try login
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        session = signInData.session;
      } else {
        if (!signUpData.session) {
          toast.success("Check your email to verify, then log in and enter the code.");
          setLoading(false);
          return;
        }
        session = signUpData.session;
      }

      if (!session) {
        toast.error("Failed to authenticate");
        setLoading(false);
        return;
      }

      // Find patient by medcircle_code
      const { data: patient, error: patientError } = await supabase
        .from("patient_profiles")
        .select("id, name")
        .eq("medcircle_code", caretakerCode)
        .limit(1);

      if (patientError || !patient?.length) {
        toast.error("No patient found with this code. Please check and try again.");
        setLoading(false);
        return;
      }

      // Create caretaker link
      const { error: linkError } = await supabase.from("caretaker_links").insert({
        caretaker_user_id: session.user.id,
        patient_profile_id: patient[0].id,
      });

      if (linkError) {
        if (linkError.code === "23505") {
          toast.info("You're already linked to this patient!");
        } else {
          throw linkError;
        }
      } else {
        toast.success(`Linked to ${patient[0].name}'s profile!`);
      }

      navigate("/caretaker", { replace: true });
    } catch (error: any) {
      toast.error(error.message);
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) toast.error(error.message);
  };

  const getTitle = () => {
    if (mode === "caretaker") return "Join as Caretaker";
    if (mode === "phone") return isLogin ? "Log In with Phone" : "Sign Up with Phone";
    return isLogin ? "Welcome Back" : "Create Account";
  };

  const getSubtitle = () => {
    if (mode === "caretaker") return "Link to a patient's MedCircle account";
    if (mode === "phone") return isLogin ? "Enter your phone to continue" : "We'll send you a verification code";
    return isLogin ? "Sign in to continue" : "Sign up to get started";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 page-transition">
      <div className="w-full max-w-md">
        {/* Back button */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft size={18} /> Back
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
            style={{
              background: "linear-gradient(135deg, #0d9488, #0f766e)",
              boxShadow: "0 4px 20px rgba(13,148,136,0.3)",
            }}
          >
            💊
          </div>
          <h1 className="text-2xl font-heading font-extrabold text-foreground">{getTitle()}</h1>
          <p className="text-muted-foreground text-sm mt-1">{getSubtitle()}</p>
        </div>

        {/* Mode tabs (for non-caretaker) */}
        {mode !== "caretaker" && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setMode("email"); setOtpSent(false); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-heading font-bold transition-colors ${
                mode === "email"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              ✉️ Email
            </button>
            <button
              onClick={() => { setMode("phone"); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-heading font-bold transition-colors ${
                mode === "phone"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              📱 Phone
            </button>
          </div>
        )}

        {/* Google Login */}
        {mode !== "caretaker" && mode !== "phone" && (
          <>
            <button
              className="w-full flex items-center justify-center gap-2 bg-card border-2 border-border rounded-2xl py-3.5 text-base font-semibold text-foreground hover:bg-secondary transition-colors"
              onClick={handleGoogleLogin}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground">or</span>
              </div>
            </div>
          </>
        )}

        {/* Email Form */}
        {mode === "email" && (
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-sm font-semibold text-foreground mb-1 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 pl-10 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 pl-10 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 pl-10 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  minLength={6}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white rounded-2xl py-4 text-lg font-heading font-bold shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}
            >
              {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin inline" />}
              {isLogin ? "Log In" : "Sign Up"}
            </button>
          </form>
        )}

        {/* Phone Form */}
        {mode === "phone" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1 block">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 pl-10 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={otpSent}
                />
              </div>
            </div>

            {!otpSent ? (
              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full text-white rounded-2xl py-4 text-lg font-heading font-bold shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}
              >
                {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin inline" />}
                Send OTP
              </button>
            ) : (
              <>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1 block">Enter OTP</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 pl-10 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary tracking-widest text-center text-lg font-mono"
                      maxLength={6}
                    />
                  </div>
                </div>

                <button
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.length !== 6}
                  className="w-full text-white rounded-2xl py-4 text-lg font-heading font-bold shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}
                >
                  {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin inline" />}
                  Verify & Continue
                </button>

                <button
                  onClick={() => { setOtpSent(false); setOtp(""); }}
                  disabled={otpCountdown > 0}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {otpCountdown > 0 ? `Resend OTP in ${otpCountdown}s` : "Resend OTP"}
                </button>
              </>
            )}
          </div>
        )}

        {/* Caretaker Form */}
        {mode === "caretaker" && (
          <div className="space-y-4">
            <div
              className="rounded-2xl p-4 border"
              style={{ background: "linear-gradient(135deg, #ede9fe, #f5f3ff)", borderColor: "#c4b5fd" }}
            >
              <p className="text-sm text-[#4c1d95]">
                Ask the patient for their <strong>6-digit MedCircle code</strong> (found on their Profile page).
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1 block">Your Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 pl-10 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1 block">Your Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 pl-10 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 pl-10 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1 block">Patient's MedCircle Code</label>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={caretakerCode}
                onChange={(e) => setCaretakerCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-foreground placeholder:text-muted-foreground placeholder:text-base placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary"
                maxLength={6}
              />
            </div>

            <button
              onClick={handleCaretakerLink}
              disabled={loading}
              className="w-full text-white rounded-2xl py-4 text-lg font-heading font-bold shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)" }}
            >
              {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin inline" />}
              Link & Continue
            </button>
          </div>
        )}

        {/* Toggle login/signup */}
        {mode !== "caretaker" && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-semibold hover:underline"
            >
              {isLogin ? "Sign Up" : "Log In"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
