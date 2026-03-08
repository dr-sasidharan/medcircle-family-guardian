import { Mic, MicOff, X } from "lucide-react";
import { useVoiceCommand } from "@/contexts/VoiceCommandContext";
import { useState } from "react";

const langLabels = [
  { code: "en" as const, label: "EN", flag: "🇬🇧" },
  { code: "ta" as const, label: "தமிழ்", flag: "🇮🇳" },
  { code: "hi" as const, label: "हिंदी", flag: "🇮🇳" },
  { code: "ml" as const, label: "മലയാളം", flag: "🇮🇳" },
];

const VoiceCommandButton = () => {
  const { isListening, startListening, stopListening, voiceLang, setVoiceLang, feedback } =
    useVoiceCommand();
  const [showPanel, setShowPanel] = useState(false);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <>
      {/* Feedback Toast Banner */}
      {feedback && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-slide-up">
          <div className="bg-card/95 backdrop-blur-xl border border-primary/20 rounded-2xl px-5 py-3 shadow-xl max-w-[90vw]">
            <p className="text-sm font-medium text-foreground text-center">{feedback}</p>
          </div>
        </div>
      )}

      {/* Language Selector Panel */}
      {showPanel && (
        <div className="fixed bottom-28 right-4 z-[90] animate-slide-up">
          <div className="bg-card/95 backdrop-blur-xl border border-primary/20 rounded-2xl p-3 shadow-xl space-y-1.5">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Voice Language</span>
              <button onClick={() => setShowPanel(false)} className="p-1 rounded-lg hover:bg-secondary">
                <X size={14} className="text-muted-foreground" />
              </button>
            </div>
            {langLabels.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setVoiceLang(l.code);
                  setShowPanel(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  voiceLang === l.code
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground hover:bg-secondary"
                }`}
              >
                <span className="text-base">{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Floating Mic Button */}
      <div className="fixed bottom-24 right-4 z-[80] flex flex-col items-center gap-2">
        {/* Language indicator chip */}
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="px-2.5 py-1 rounded-full bg-card/90 backdrop-blur border border-primary/15 text-[10px] font-bold text-muted-foreground uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
        >
          {langLabels.find((l) => l.code === voiceLang)?.label}
        </button>

        {/* Main mic button */}
        <button
          onClick={handleMicClick}
          className={`relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-95 ${
            isListening
              ? "bg-coral text-white shadow-coral/40 animate-pulse"
              : "text-white shadow-primary/30"
          }`}
          style={
            !isListening
              ? { background: "linear-gradient(135deg, #0d9488, #0f766e)" }
              : undefined
          }
          aria-label={isListening ? "Stop listening" : "Start voice command"}
        >
          {isListening ? <MicOff size={24} /> : <Mic size={24} />}

          {/* Ripple effect when listening */}
          {isListening && (
            <>
              <span className="absolute inset-0 rounded-2xl border-2 border-coral animate-ping opacity-30" />
              <span className="absolute -inset-1 rounded-2xl border border-coral/20 animate-pulse" />
            </>
          )}
        </button>
      </div>
    </>
  );
};

export default VoiceCommandButton;
