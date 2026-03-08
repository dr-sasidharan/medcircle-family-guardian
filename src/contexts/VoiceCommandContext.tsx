import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

type VoiceLang = "en" | "ta" | "hi" | "ml";

interface VoiceCommandContextType {
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  voiceLang: VoiceLang;
  setVoiceLang: (lang: VoiceLang) => void;
  lastTranscript: string;
  feedback: string;
}

const VoiceCommandContext = createContext<VoiceCommandContextType | undefined>(undefined);

// Map voice language to BCP-47 speech recognition locale
const langToBCP: Record<VoiceLang, string> = {
  en: "en-IN",
  ta: "ta-IN",
  hi: "hi-IN",
  ml: "ml-IN",
};

// Command definitions per language → route / action
const COMMANDS: Record<VoiceLang, { patterns: RegExp[]; action: string }[]> = {
  en: [
    { patterns: [/home|dashboard|main/i], action: "/patient" },
    { patterns: [/add\s*(medicine|med|tablet|pill)/i], action: "/add-medicine" },
    { patterns: [/reminder|history|schedule/i], action: "/reminders" },
    { patterns: [/profile|my\s*account/i], action: "/profile" },
    { patterns: [/scan\s*(prescription|rx)/i], action: "/scan" },
    { patterns: [/scan\s*tablet|identify\s*tablet|what\s*is\s*this/i], action: "/scan-tablet" },
    { patterns: [/family|caretaker|care\s*circle/i], action: "/caretaker" },
    { patterns: [/setting/i], action: "/settings" },
    { patterns: [/doctor\s*summary|visit\s*summary/i], action: "/doctor-summary" },
    { patterns: [/drug\s*interaction|interaction\s*check/i], action: "/drug-interaction" },
    { patterns: [/pricing|plan|upgrade/i], action: "/pricing" },
  ],
  ta: [
    { patterns: [/முகப்பு|டாஷ்போர்டு/], action: "/patient" },
    { patterns: [/மருந்து\s*சேர்|மாத்திரை\s*சேர்/], action: "/add-medicine" },
    { patterns: [/நினைவூட்டல்|வரலாறு/], action: "/reminders" },
    { patterns: [/சுயவிவரம்|ப்ரொஃபைல்/], action: "/profile" },
    { patterns: [/ஸ்கேன்\s*மருந்து|மருந்து\s*சீட்டு/], action: "/scan" },
    { patterns: [/மாத்திரை\s*ஸ்கேன்|இந்த\s*மாத்திரை/], action: "/scan-tablet" },
    { patterns: [/குடும்பம்|பராமரிப்பாளர்/], action: "/caretaker" },
    { patterns: [/அமைப்பு|செட்டிங்/], action: "/settings" },
    { patterns: [/மருத்துவர்\s*சுருக்கம்/], action: "/doctor-summary" },
    { patterns: [/மருந்து\s*ஊடாடல்/], action: "/drug-interaction" },
  ],
  hi: [
    { patterns: [/होम|डैशबोर्ड|मुख्य/], action: "/patient" },
    { patterns: [/दवा\s*जोड़|दवाई\s*जोड़/], action: "/add-medicine" },
    { patterns: [/रिमाइंडर|इतिहास/], action: "/reminders" },
    { patterns: [/प्रोफ़ाइल|प्रोफाइल/], action: "/profile" },
    { patterns: [/प्रिस्क्रिप्शन\s*स्कैन/], action: "/scan" },
    { patterns: [/टैबलेट\s*स्कैन|यह\s*गोली/], action: "/scan-tablet" },
    { patterns: [/परिवार|देखभाल/], action: "/caretaker" },
    { patterns: [/सेटिंग/], action: "/settings" },
    { patterns: [/डॉक्टर\s*सारांश/], action: "/doctor-summary" },
    { patterns: [/दवा\s*संपर्क/], action: "/drug-interaction" },
  ],
  ml: [
    { patterns: [/ഹോം|ഡാഷ്ബോർഡ്|മുഖപ്പേജ്/], action: "/patient" },
    { patterns: [/മരുന്ന്\s*ചേർ|ഗുളിക\s*ചേർ/], action: "/add-medicine" },
    { patterns: [/ഓർമ്മപ്പെടുത്തൽ|ചരിത്രം/], action: "/reminders" },
    { patterns: [/പ്രൊഫൈൽ/], action: "/profile" },
    { patterns: [/പ്രിസ്ക്രിപ്ഷൻ\s*സ്കാൻ/], action: "/scan" },
    { patterns: [/ഗുളിക\s*സ്കാൻ|ഈ\s*ഗുളിക/], action: "/scan-tablet" },
    { patterns: [/കുടുംബം|പരിചാരകൻ/], action: "/caretaker" },
    { patterns: [/ക്രമീകരണം|സെറ്റിംഗ്/], action: "/settings" },
    { patterns: [/ഡോക്ടർ\s*സംഗ്രഹം/], action: "/doctor-summary" },
    { patterns: [/മരുന്ന്\s*ഇടപെടൽ/], action: "/drug-interaction" },
  ],
};

const FEEDBACK_MESSAGES: Record<VoiceLang, { listening: string; navigating: string; notUnderstood: string; noSupport: string }> = {
  en: {
    listening: "🎤 Listening... Speak a command",
    navigating: "Navigating to",
    notUnderstood: "Sorry, I didn't understand. Try saying: Home, Add Medicine, Reminders, Profile, Scan, Settings",
    noSupport: "Voice commands are not supported in this browser",
  },
  ta: {
    listening: "🎤 கேட்கிறேன்... ஒரு கட்டளையைச் சொல்லுங்கள்",
    navigating: "செல்கிறது",
    notUnderstood: "மன்னிக்கவும், புரியவில்லை. முயற்சிக்கவும்: முகப்பு, மருந்து சேர், நினைவூட்டல், சுயவிவரம்",
    noSupport: "இந்த உலாவியில் குரல் கட்டளைகள் ஆதரிக்கப்படவில்லை",
  },
  hi: {
    listening: "🎤 सुन रहा हूँ... एक कमांड बोलें",
    navigating: "जा रहे हैं",
    notUnderstood: "माफ़ करें, समझ नहीं आया। बोलें: होम, दवा जोड़ें, रिमाइंडर, प्रोफ़ाइल",
    noSupport: "इस ब्राउज़र में वॉइस कमांड समर्थित नहीं हैं",
  },
  ml: {
    listening: "🎤 കേൾക്കുന്നു... ഒരു കമാൻഡ് പറയൂ",
    navigating: "പോകുന്നു",
    notUnderstood: "ക്ഷമിക്കണം, മനസ്സിലായില്ല. ശ്രമിക്കുക: ഹോം, മരുന്ന് ചേർക്കുക, ഓർമ്മപ്പെടുത്തൽ, പ്രൊഫൈൽ",
    noSupport: "ഈ ബ്രൗസറിൽ വോയ്‌സ് കമാൻഡുകൾ പിന്തുണയ്ക്കുന്നില്ല",
  },
};

const PAGE_NAMES: Record<VoiceLang, Record<string, string>> = {
  en: {
    "/patient": "Dashboard",
    "/add-medicine": "Add Medicine",
    "/reminders": "Reminders",
    "/profile": "Profile",
    "/scan": "Scan Prescription",
    "/scan-tablet": "Scan Tablet",
    "/caretaker": "Family",
    "/settings": "Settings",
    "/doctor-summary": "Doctor Summary",
    "/drug-interaction": "Drug Interaction",
    "/pricing": "Pricing",
  },
  ta: {
    "/patient": "டாஷ்போர்டு",
    "/add-medicine": "மருந்து சேர்",
    "/reminders": "நினைவூட்டல்",
    "/profile": "சுயவிவரம்",
    "/scan": "மருந்து சீட்டு ஸ்கேன்",
    "/scan-tablet": "மாத்திரை ஸ்கேன்",
    "/caretaker": "குடும்பம்",
    "/settings": "அமைப்புகள்",
    "/doctor-summary": "மருத்துவர் சுருக்கம்",
    "/drug-interaction": "மருந்து ஊடாடல்",
    "/pricing": "திட்டம்",
  },
  hi: {
    "/patient": "डैशबोर्ड",
    "/add-medicine": "दवा जोड़ें",
    "/reminders": "रिमाइंडर",
    "/profile": "प्रोफ़ाइल",
    "/scan": "प्रिस्क्रिप्शन स्कैन",
    "/scan-tablet": "टैबलेट स्कैन",
    "/caretaker": "परिवार",
    "/settings": "सेटिंग्स",
    "/doctor-summary": "डॉक्टर सारांश",
    "/drug-interaction": "दवा संपर्क",
    "/pricing": "प्लान",
  },
  ml: {
    "/patient": "ഡാഷ്ബോർഡ്",
    "/add-medicine": "മരുന്ന് ചേർക്കുക",
    "/reminders": "ഓർമ്മപ്പെടുത്തൽ",
    "/profile": "പ്രൊഫൈൽ",
    "/scan": "പ്രിസ്ക്രിപ്ഷൻ സ്കാൻ",
    "/scan-tablet": "ഗുളിക സ്കാൻ",
    "/caretaker": "കുടുംബം",
    "/settings": "ക്രമീകരണം",
    "/doctor-summary": "ഡോക്ടർ സംഗ്രഹം",
    "/drug-interaction": "മരുന്ന് ഇടപെടൽ",
    "/pricing": "പ്ലാൻ",
  },
};

export const VoiceCommandProvider = ({ children }: { children: ReactNode }) => {
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState<VoiceLang>("en");
  const [lastTranscript, setLastTranscript] = useState("");
  const [feedback, setFeedback] = useState("");
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  // We need to use a ref for navigate since this provider is inside BrowserRouter
  const navigateRef = useRef<((path: string) => void) | null>(null);

  const processCommand = useCallback(
    (transcript: string) => {
      const commands = COMMANDS[voiceLang] || COMMANDS.en;
      const msgs = FEEDBACK_MESSAGES[voiceLang];
      const names = PAGE_NAMES[voiceLang];

      for (const cmd of commands) {
        for (const pattern of cmd.patterns) {
          if (pattern.test(transcript)) {
            const pageName = names[cmd.action] || cmd.action;
            setFeedback(`${msgs.navigating} ${pageName}`);
            toast({
              title: `🎤 ${msgs.navigating} ${pageName}`,
              duration: 2000,
            });
            if (navigateRef.current) {
              navigateRef.current(cmd.action);
            }
            return true;
          }
        }
      }

      setFeedback(msgs.notUnderstood);
      toast({
        title: msgs.notUnderstood,
        duration: 4000,
      });
      return false;
    },
    [voiceLang, toast]
  );

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const msgs = FEEDBACK_MESSAGES[voiceLang];
      toast({ title: msgs.noSupport, variant: "destructive", duration: 3000 });
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = new SpeechRecognition();
    recognition.lang = langToBCP[voiceLang];
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setIsListening(true);
      setFeedback(FEEDBACK_MESSAGES[voiceLang].listening);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setLastTranscript(transcript);
      processCommand(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      if (event.error !== "aborted") {
        setFeedback("");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setTimeout(() => setFeedback(""), 3000);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [voiceLang, processCommand, toast]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setFeedback("");
  }, []);

  return (
    <VoiceCommandContext.Provider
      value={{ isListening, startListening, stopListening, voiceLang, setVoiceLang, lastTranscript, feedback }}
    >
      <VoiceNavigateHelper navigateRef={navigateRef} />
      {children}
    </VoiceCommandContext.Provider>
  );
};

// Helper component that sets the navigate ref (must be inside Router)
const VoiceNavigateHelper = ({ navigateRef }: { navigateRef: React.MutableRefObject<((path: string) => void) | null> }) => {
  const navigate = useNavigate();
  navigateRef.current = navigate;
  return null;
};

export const useVoiceCommand = () => {
  const ctx = useContext(VoiceCommandContext);
  if (!ctx) throw new Error("useVoiceCommand must be used within VoiceCommandProvider");
  return ctx;
};
