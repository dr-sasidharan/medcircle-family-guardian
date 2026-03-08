import React, { createContext, useContext, useState, ReactNode } from "react";

type Language = "en" | "ta" | "hi";

interface Translations {
  [key: string]: { en: string; ta: string; hi: string };
}

const translations: Translations = {
  // Welcome
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

  // Time of day
  morning: { en: "Morning", ta: "காலை", hi: "सुबह" },
  afternoon: { en: "Afternoon", ta: "மதியம்", hi: "दोपहर" },
  night: { en: "Night", ta: "இரவு", hi: "रात" },

  // Medicine actions
  mark_taken: { en: "Mark as Taken", ta: "எடுத்ததாக குறி", hi: "ली गई के रूप में चिह्नित करें" },
  taken: { en: "Taken ✓", ta: "எடுத்தது ✓", hi: "ली गई ✓" },

  // Nav
  dashboard: { en: "Dashboard", ta: "டாஷ்போர்டு", hi: "डैशबोर्ड" },
  medicines: { en: "Medicines", ta: "மருந்துகள்", hi: "दवाइयाँ" },
  scan: { en: "Scan", ta: "ஸ்கேன்", hi: "स्कैन" },
  insights: { en: "Insights", ta: "நுண்ணறிவுகள்", hi: "अंतर्दृष्टि" },
  profile: { en: "Profile", ta: "சுயவிவரம்", hi: "प्रोफ़ाइल" },

  // Add medicine
  add_medicine: { en: "Add Medicine", ta: "மருந்து சேர்க்க", hi: "दवा जोड़ें" },
  medicine_name: { en: "Medicine Name", ta: "மருந்து பெயர்", hi: "दवा का नाम" },
  dosage: { en: "Dosage", ta: "அளவு", hi: "खुराक" },
  timing: { en: "Timing", ta: "நேரம்", hi: "समय" },
  food_instruction: { en: "Food Instruction", ta: "உணவு அறிவுறுத்தல்", hi: "भोजन निर्देश" },
  upload_photo: { en: "Upload Tablet Photo", ta: "மாத்திரை புகைப்படம் பதிவேற்று", hi: "टैबलेट फोटो अपलोड करें" },
  save: { en: "Save Medicine", ta: "மருந்தை சேமி", hi: "दवा सहेजें" },

  // Medicine detail
  adherence: { en: "Adherence", ta: "இணக்கம்", hi: "अनुपालन" },
  missed_alert: { en: "MISSED DOSE ALERT", ta: "தவறிய மருந்து எச்சரிக்கை", hi: "छूटी खुराक अलर्ट" },
  weekly_adherence: { en: "Weekly Adherence", ta: "வாராந்திர இணக்கம்", hi: "साप्ताहिक अनुपालन" },
  purpose: { en: "Purpose", ta: "நோக்கம்", hi: "उद्देश्य" },
  how_to_take: { en: "How to Take", ta: "எப்படி எடுப்பது", hi: "कैसे लें" },
  side_effects: { en: "Side Effects", ta: "பக்க விளைவுகள்", hi: "दुष्प्रभाव" },
  foods_to_avoid: { en: "Foods to Avoid", ta: "தவிர்க்க வேண்டிய உணவுகள்", hi: "परहेज़ करने वाले खाद्य पदार्थ" },
  drug_interaction: { en: "Drug Interaction Warning", ta: "மருந்து ஊடாடல் எச்சரிக்கை", hi: "दवा संपर्क चेतावनी" },

  // Pricing
  pricing: { en: "Choose Your Plan", ta: "உங்கள் திட்டத்தைத் தேர்ந்தெடுங்கள்", hi: "अपना प्लान चुनें" },
  get_started: { en: "Get Started", ta: "தொடங்கு", hi: "शुरू करें" },
  free: { en: "Free", ta: "இலவசம்", hi: "मुफ़्त" },
  family_plan: { en: "Family Plan", ta: "குடும்ப திட்டம்", hi: "फैमिली प्लान" },
  family_pro: { en: "Family Pro", ta: "குடும்ப ப்ரோ", hi: "फैमिली प्रो" },
  one_time: { en: "One-Time Setup", ta: "ஒரு முறை அமைப்பு", hi: "वन-टाइम सेटअप" },
  per_month: { en: "per month", ta: "மாதம்", hi: "प्रति माह" },
  once: { en: "once", ta: "ஒரு முறை", hi: "एक बार" },

  // Dashboard
  good_morning: { en: "Good Morning", ta: "காலை வணக்கம்", hi: "सुप्रभात" },
  medicines_taken: { en: "medicines taken today", ta: "இன்று எடுத்த மருந்துகள்", hi: "आज ली गई दवाइयाँ" },
  of: { en: "of", ta: "இல்", hi: "में से" },

  // Food
  before_food: { en: "Before Food", ta: "உணவுக்கு முன்", hi: "खाने से पहले" },
  after_food: { en: "After Food", ta: "உணவுக்குப் பின்", hi: "खाने के बाद" },
  with_food: { en: "With Food", ta: "உணவுடன்", hi: "खाने के साथ" },

  // AI Features
  todays_insights: { en: "Today's Insights", ta: "இன்றைய நுண்ணறிவுகள்", hi: "आज की जानकारियाँ" },
  generating_insights: { en: "Generating insights...", ta: "நுண்ணறிவுகளை உருவாக்குகிறது...", hi: "जानकारियाँ तैयार हो रही हैं..." },
  ai_disclaimer: {
    en: "⚕️ AI information is for awareness only. Always consult your doctor.",
    ta: "⚕️ AI தகவல்கள் விழிப்புணர்வுக்கு மட்டுமே. எப்போதும் உங்கள் மருத்துவரை அணுகவும்.",
    hi: "⚕️ AI जानकारी केवल जागरूकता के लिए है। हमेशा अपने डॉक्टर से सलाह लें।",
  },
  drug_interaction_checker: { en: "Drug Interaction Checker", ta: "மருந்து ஊடாடல் சோதனை", hi: "दवा संपर्क जाँच" },
  medicine_1: { en: "Medicine 1", ta: "மருந்து 1", hi: "दवा 1" },
  medicine_2: { en: "Medicine 2", ta: "மருந்து 2", hi: "दवा 2" },
  check_interaction: { en: "Check Interaction", ta: "ஊடாடலைச் சோதி", hi: "संपर्क जाँचें" },
  checking: { en: "Checking...", ta: "சோதிக்கிறது...", hi: "जाँच हो रही है..." },
  symptoms_to_watch: { en: "Symptoms to Watch", ta: "கவனிக்க வேண்டிய அறிகுறிகள்", hi: "देखने योग्य लक्षण" },
  doctor_visit_summary: { en: "Pre-Doctor Visit Summary", ta: "மருத்துவர் சந்திப்பு சுருக்கம்", hi: "डॉक्टर मिलने से पहले की सारांश" },
  prepare_visit: { en: "Prepare for Your Visit", ta: "உங்கள் சந்திப்புக்கு தயாராகுங்கள்", hi: "अपनी मुलाकात के लिए तैयार हों" },
  prepare_visit_desc: {
    en: "Generate an AI summary of your medicines, adherence, and suggested questions for your doctor.",
    ta: "உங்கள் மருந்துகள், இணக்கம் மற்றும் மருத்துவருக்கான கேள்விகளின் AI சுருக்கத்தை உருவாக்கவும்.",
    hi: "अपनी दवाओं, अनुपालन और डॉक्टर के लिए सुझावित प्रश्नों का AI सारांश तैयार करें।",
  },
  generate_summary: { en: "Generate Summary", ta: "சுருக்கம் உருவாக்கு", hi: "सारांश तैयार करें" },
  generating_summary: { en: "Generating Summary...", ta: "சுருக்கம் உருவாக்குகிறது...", hi: "सारांश तैयार हो रहा है..." },
  your_summary: { en: "Your Summary", ta: "உங்கள் சுருக்கம்", hi: "आपका सारांश" },
  share: { en: "Share", ta: "பகிர்", hi: "शेयर करें" },
  print: { en: "Print", ta: "அச்சிடு", hi: "प्रिंट करें" },
  regenerate: { en: "🔄 Regenerate Summary", ta: "🔄 மீண்டும் உருவாக்கு", hi: "🔄 दोबारा तैयार करें" },

  // Patient Dashboard buttons
  scan_prescription: { en: "Scan Prescription", ta: "மருந்து சீட்டை ஸ்கேன் செய்", hi: "प्रिस्क्रिप्शन स्कैन करें" },
  what_is_tablet: { en: "What Is This Tablet?", ta: "இந்த மாத்திரை என்ன?", hi: "यह गोली क्या है?" },

  // Settings / Elderly mode
  settings: { en: "Settings", ta: "அமைப்புகள்", hi: "सेटिंग्स" },
  elderly_mode: { en: "Elderly-Friendly Mode", ta: "முதியோர் நட்பு பயன்முறை", hi: "बुज़ुर्ग-अनुकूल मोड" },
  elderly_mode_desc: {
    en: "Larger text, higher contrast, simplified layout",
    ta: "பெரிய உரை, அதிக மாறுபாடு, எளிமையான தளவமைப்பு",
    hi: "बड़ा टेक्स्ट, अधिक कंट्रास्ट, सरल लेआउट",
  },

  // Emergency
  emergency_info: { en: "Emergency Info", ta: "அவசர தகவல்", hi: "आपातकालीन जानकारी" },
  show_to_doctor: {
    en: "🚨 Show this screen to your doctor in an emergency",
    ta: "🚨 அவசரத்தில் இந்தத் திரையை உங்கள் மருத்துவரிடம் காட்டுங்கள்",
    hi: "🚨 आपातकाल में यह स्क्रीन अपने डॉक्टर को दिखाएं",
  },
  blood_group: { en: "Blood Group", ta: "இரத்த வகை", hi: "रक्त समूह" },
  allergies: { en: "Allergies", ta: "ஒவ்வாமைகள்", hi: "एलर्जी" },
  current_medicines: { en: "Current Medicines", ta: "தற்போதைய மருந்துகள்", hi: "वर्तमान दवाइयाँ" },
  emergency_contact: { en: "Emergency Contact", ta: "அவசர தொடர்பு", hi: "आपातकालीन संपर्क" },

  // Refill
  refill_alert: { en: "runs out in", ta: "தீர்ந்து போகும்", hi: "में खत्म हो जाएगी" },
  days: { en: "days", ta: "நாட்கள்", hi: "दिन" },
  time_to_refill: { en: "Time to refill.", ta: "மீண்டும் நிரப்ப வேண்டிய நேரம்.", hi: "रीफिल करने का समय।" },

  // Empty state
  no_medicines_yet: { en: "No medicines added yet", ta: "இன்னும் மருந்துகள் சேர்க்கப்படவில்லை", hi: "अभी तक कोई दवा नहीं जोड़ी गई" },
  add_first_medicine: {
    en: "Add your first medicine to get started with reminders and insights.",
    ta: "நினைவூட்டல்களைத் தொடங்க உங்கள் முதல் மருந்தைச் சேர்க்கவும்.",
    hi: "रिमाइंडर और जानकारी शुरू करने के लिए अपनी पहली दवा जोड़ें।",
  },

  // Profile links
  upgrade_plan: { en: "Upgrade Plan", ta: "திட்டத்தை மேம்படுத்து", hi: "प्लान अपग्रेड करें" },
  upgrade_desc: {
    en: "Get unlimited medicines & caretaker access",
    ta: "வரம்பற்ற மருந்துகள் & பராமரிப்பாளர் அணுகல்",
    hi: "असीमित दवाइयाँ और देखभालकर्ता एक्सेस पाएं",
  },
  doctor_summary_desc: {
    en: "AI-generated summary for your next appointment",
    ta: "உங்கள் அடுத்த சந்திப்புக்கான AI சுருக்கம்",
    hi: "आपकी अगली अपॉइंटमेंट के लिए AI सारांश",
  },
  drug_checker_desc: {
    en: "Check if your medicines are safe together",
    ta: "உங்கள் மருந்துகள் ஒன்றாக எடுக்கலாமா என்று சோதிக்கவும்",
    hi: "जाँचें कि आपकी दवाइयाँ साथ में सुरक्षित हैं या नहीं",
  },

  // Care circle
  my_care_circle: { en: "My Care Circle", ta: "என் பராமரிப்பு வட்டம்", hi: "मेरा केयर सर्कल" },
  add: { en: "Add", ta: "சேர்", hi: "जोड़ें" },
  add_caretaker: { en: "Add Caretaker", ta: "பராமரிப்பாளர் சேர்க்க", hi: "देखभालकर्ता जोड़ें" },
  name: { en: "Name", ta: "பெயர்", hi: "नाम" },
  relationship: { en: "Relationship", ta: "உறவு", hi: "रिश्ता" },
  phone: { en: "Phone", ta: "தொலைபேசி", hi: "फ़ोन" },
  email: { en: "Email", ta: "மின்னஞ்சல்", hi: "ईमेल" },
  no_caretakers: { en: "No caretakers added yet", ta: "இன்னும் பராமரிப்பாளர்கள் சேர்க்கப்படவில்லை", hi: "अभी तक कोई देखभालकर्ता नहीं जोड़ा गया" },

  // Reminders
  reminders: { en: "Reminders", ta: "நினைவூட்டல்கள்", hi: "रिमाइंडर" },
  todays_summary: { en: "Today's Summary", ta: "இன்றைய சுருக்கம்", hi: "आज का सारांश" },
  no_medicines_scheduled: { en: "No medicines scheduled", ta: "மருந்துகள் திட்டமிடப்படவில்லை", hi: "कोई दवा शेड्यूल नहीं है" },
  add_medicines_reminder: { en: "Add medicines to see reminders here", ta: "நினைவூட்டல்களைக் காண மருந்துகளைச் சேர்க்கவும்", hi: "रिमाइंडर देखने के लिए दवाइयाँ जोड़ें" },
  or_enter_manually: { en: "or enter manually", ta: "அல்லது கைமுறையாக உள்ளிடவும்", hi: "या मैन्युअल रूप से दर्ज करें" },
  scan_tablet_strip: { en: "Scan Tablet Strip", ta: "மாத்திரை பட்டையை ஸ்கேன் செய்", hi: "टैबलेट स्ट्रिप स्कैन करें" },
  tap_to_upload: { en: "Tap to upload", ta: "பதிவேற்ற தட்டவும்", hi: "अपलोड करने के लिए टैप करें" },
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
