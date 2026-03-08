import React, { createContext, useContext, useState, ReactNode } from "react";

type Language = "en" | "ta" | "hi";

interface Translations {
  [key: string]: { en: string; ta: string; hi: string };
}

const translations: Translations = {
  welcome_headline: {
    en: "Know your parents are safe — from your hostel room",
    ta: "உங்கள் பெற்றோர் பாதுகாப்பாக இருப்பதை அறியுங்கள்",
    hi: "जानें कि आपके माता-पिता सुरक्षित हैं — अपने हॉस्टल से",
  },
  welcome_subtext: {
    en: "Set up in 2 minutes. Peace of mind forever.",
    ta: "2 நிமிடங்களில் அமைக்கவும். நிம்மதி என்றென்றும்.",
    hi: "2 मिनट में सेटअप करें। हमेशा के लिए शांति।",
  },
  i_am_patient: { en: "I am a Patient", ta: "நான் ஒரு நோயாளி", hi: "मैं एक मरीज़ हूँ" },
  i_am_caretaker: { en: "I am a Caretaker", ta: "நான் ஒரு பராமரிப்பாளர்", hi: "मैं एक देखभालकर्ता हूँ" },
  morning: { en: "Morning", ta: "காலை", hi: "सुबह" },
  afternoon: { en: "Afternoon", ta: "மதியம்", hi: "दोपहर" },
  night: { en: "Night", ta: "இரவு", hi: "रात" },
  mark_taken: { en: "Mark as Taken", ta: "எடுத்ததாக குறி", hi: "ली गई के रूप में चिह्नित करें" },
  taken: { en: "Taken ✓", ta: "எடுத்தது ✓", hi: "ली गई ✓" },
  dashboard: { en: "Dashboard", ta: "டாஷ்போர்டு", hi: "डैशबोर्ड" },
  medicines: { en: "Medicines", ta: "மருந்துகள்", hi: "दवाइयाँ" },
  scan: { en: "Scan", ta: "ஸ்கேன்", hi: "स्कैन" },
  insights: { en: "Insights", ta: "நுண்ணறிவுகள்", hi: "अंतर्दृष्टि" },
  profile: { en: "Profile", ta: "சுயவிவரம்", hi: "प्रोफ़ाइल" },
  add_medicine: { en: "Add Medicine", ta: "மருந்து சேர்க்க", hi: "दवा जोड़ें" },
  medicine_name: { en: "Medicine Name", ta: "மருந்து பெயர்", hi: "दवा का नाम" },
  dosage: { en: "Dosage", ta: "அளவு", hi: "खुराक" },
  timing: { en: "Timing", ta: "நேரம்", hi: "समय" },
  food_instruction: { en: "Food Instruction", ta: "உணவு அறிவுறுத்தல்", hi: "भोजन निर्देश" },
  upload_photo: { en: "Upload Tablet Photo", ta: "மாத்திரை புகைப்படம் பதிவேற்று", hi: "टैबलेट फोटो अपलोड करें" },
  save: { en: "Save Medicine", ta: "மருந்தை சேமி", hi: "दवा सहेजें" },
  adherence: { en: "Adherence", ta: "இணக்கம்", hi: "अनुपालन" },
  missed_alert: { en: "MISSED DOSE ALERT", ta: "தவறிய மருந்து எச்சரிக்கை", hi: "छूटी खुराक अलर्ट" },
  weekly_adherence: { en: "Weekly Adherence", ta: "வாராந்திர இணக்கம்", hi: "साप्ताहिक अनुपालन" },
  purpose: { en: "Purpose", ta: "நோக்கம்", hi: "उद्देश्य" },
  how_to_take: { en: "How to Take", ta: "எப்படி எடுப்பது", hi: "कैसे लें" },
  side_effects: { en: "Side Effects", ta: "பக்க விளைவுகள்", hi: "दुष्प्रभाव" },
  foods_to_avoid: { en: "Foods to Avoid", ta: "தவிர்க்க வேண்டிய உணவுகள்", hi: "परहेज़ करने वाले खाद्य पदार्थ" },
  drug_interaction: { en: "Drug Interaction Warning", ta: "மருந்து ஊடாடல் எச்சரிக்கை", hi: "दवा संपर्क चेतावनी" },
  pricing: { en: "Choose Your Plan", ta: "உங்கள் திட்டத்தைத் தேர்ந்தெடுங்கள்", hi: "अपना प्लान चुनें" },
  get_started: { en: "Get Started", ta: "தொடங்கு", hi: "शुरू करें" },
  free: { en: "Free", ta: "இலவசம்", hi: "मुफ़्त" },
  family_plan: { en: "Family Plan", ta: "குடும்ப திட்டம்", hi: "फैमिली प्लान" },
  family_pro: { en: "Family Pro", ta: "குடும்ப ப்ரோ", hi: "फैमिली प्रो" },
  one_time: { en: "One-Time Setup", ta: "ஒரு முறை அமைப்பு", hi: "वन-टाइम सेटअप" },
  per_month: { en: "per month", ta: "மாதம்", hi: "प्रति माह" },
  once: { en: "once", ta: "ஒரு முறை", hi: "एक बार" },
  good_morning: { en: "Good Morning", ta: "காலை வணக்கம்", hi: "सुप्रभात" },
  medicines_taken: { en: "medicines taken today", ta: "இன்று எடுத்த மருந்துகள்", hi: "आज ली गई दवाइयाँ" },
  of: { en: "of", ta: "இல்", hi: "में से" },
  before_food: { en: "Before Food", ta: "உணவுக்கு முன்", hi: "खाने से पहले" },
  after_food: { en: "After Food", ta: "உணவுக்குப் பின்", hi: "खाने के बाद" },
  with_food: { en: "With Food", ta: "உணவுடன்", hi: "खाने के साथ" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("en");
  const t = (key: string) => translations[key]?.[language] || key;
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
