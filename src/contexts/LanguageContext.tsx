import React, { createContext, useContext, useState, ReactNode } from "react";

type Language = "en" | "ta" | "hi" | "ml";

interface Translations {
  [key: string]: { en: string; ta: string; hi: string; ml: string };
}

const translations: Translations = {
  // Welcome
  welcome_headline: {
    en: "Know your parents are safe — from anywhere",
    ta: "உங்கள் பெற்றோர் பாதுகாப்பாக இருப்பதை அறியுங்கள் — எங்கிருந்தும்",
    hi: "जानें कि आपके माता-पिता सुरक्षित हैं — कहीं से भी",
    ml: "നിങ്ങളുടെ മാതാപിതാക്കൾ സുരക്ഷിതരാണെന്ന് അറിയൂ — എവിടെ നിന്നും",
  },
  welcome_subtext: {
    en: "Set up in 2 minutes. Peace of mind forever.",
    ta: "2 நிமிடங்களில் அமைக்கவும். நிம்மதி என்றென்றும்.",
    hi: "2 मिनट में सेटअप करें। हमेशा के लिए शांति।",
    ml: "2 മിനിറ്റിൽ സജ്ജമാക്കൂ. എന്നേക്കും സമാധാനം.",
  },
  i_am_patient: { en: "I am a Patient", ta: "நான் ஒரு நோயாளி", hi: "मैं एक मरीज़ हूँ", ml: "ഞാൻ ഒരു രോഗിയാണ്" },
  i_am_caretaker: { en: "I am a Caretaker", ta: "நான் ஒரு பராமரிப்பாளர்", hi: "मैं एक देखभालकर्ता हूँ", ml: "ഞാൻ ഒരു പരിചാരകനാണ്" },

  // Time of day
  morning: { en: "Morning", ta: "காலை", hi: "सुबह", ml: "രാവിലെ" },
  afternoon: { en: "Afternoon", ta: "மதியம்", hi: "दोपहर", ml: "ഉച്ചയ്ക്ക്" },
  night: { en: "Night", ta: "இரவு", hi: "रात", ml: "രാത്രി" },

  // Medicine actions
  mark_taken: { en: "Mark as Taken", ta: "எடுத்ததாக குறி", hi: "ली गई के रूप में चिह्नित करें", ml: "കഴിച്ചതായി അടയാളപ്പെടുത്തുക" },
  taken: { en: "Taken ✓", ta: "எடுத்தது ✓", hi: "ली गई ✓", ml: "കഴിച്ചു ✓" },

  // Nav
  dashboard: { en: "Dashboard", ta: "டாஷ்போர்டு", hi: "डैशबोर्ड", ml: "ഡാഷ്ബോർഡ്" },
  medicines: { en: "Medicines", ta: "மருந்துகள்", hi: "दवाइयाँ", ml: "മരുന്നുകൾ" },
  scan: { en: "Scan", ta: "ஸ்கேன்", hi: "स्कैन", ml: "സ്കാൻ" },
  insights: { en: "Insights", ta: "நுண்ணறிவுகள்", hi: "अंतर्दृष्टि", ml: "ഉൾക്കാഴ്ചകൾ" },
  profile: { en: "Profile", ta: "சுயவிவரம்", hi: "प्रोफ़ाइल", ml: "പ്രൊഫൈൽ" },

  // Add medicine
  add_medicine: { en: "Add Medicine", ta: "மருந்து சேர்க்க", hi: "दवा जोड़ें", ml: "മരുന്ന് ചേർക്കുക" },
  medicine_name: { en: "Medicine Name", ta: "மருந்து பெயர்", hi: "दवा का नाम", ml: "മരുന്നിന്റെ പേര്" },
  dosage: { en: "Dosage", ta: "அளவு", hi: "खुराक", ml: "ഡോസേജ്" },
  timing: { en: "Timing", ta: "நேரம்", hi: "समय", ml: "സമയം" },
  food_instruction: { en: "Food Instruction", ta: "உணவு அறிவுறுத்தல்", hi: "भोजन निर्देश", ml: "ഭക്ഷണ നിർദ്ദേശം" },
  upload_photo: { en: "Upload Tablet Photo", ta: "மாத்திரை புகைப்படம் பதிவேற்று", hi: "टैबलेट फोटो अपलोड करें", ml: "ഗുളിക ഫോട്ടോ അപ്‌ലോഡ് ചെയ്യുക" },
  save: { en: "Save Medicine", ta: "மருந்தை சேமி", hi: "दवा सहेजें", ml: "മരുന്ന് സേവ് ചെയ്യുക" },

  // Medicine detail
  adherence: { en: "Adherence", ta: "இணக்கம்", hi: "अनुपालन", ml: "പാലനം" },
  missed_alert: { en: "MISSED DOSE ALERT", ta: "தவறிய மருந்து எச்சரிக்கை", hi: "छूटी खुराक अलर्ट", ml: "നഷ്ടമായ ഡോസ് അലേർട്ട്" },
  weekly_adherence: { en: "Weekly Adherence", ta: "வாராந்திர இணக்கம்", hi: "साप्ताहिक अनुपालन", ml: "പ്രതിവാര പാലനം" },
  purpose: { en: "Purpose", ta: "நோக்கம்", hi: "उद्देश्य", ml: "ഉദ്ദേശ്യം" },
  how_to_take: { en: "How to Take", ta: "எப்படி எடுப்பது", hi: "कैसे लें", ml: "എങ്ങനെ കഴിക്കാം" },
  side_effects: { en: "Side Effects", ta: "பக்க விளைவுகள்", hi: "दुष्प्रभाव", ml: "പാർശ്വഫലങ്ങൾ" },
  foods_to_avoid: { en: "Foods to Avoid", ta: "தவிர்க்க வேண்டிய உணவுகள்", hi: "परहेज़ करने वाले खाद्य पदार्थ", ml: "ഒഴിവാക്കേണ്ട ഭക്ഷണങ്ങൾ" },
  drug_interaction: { en: "Drug Interaction Warning", ta: "மருந்து ஊடாடல் எச்சரிக்கை", hi: "दवा संपर्क चेतावनी", ml: "മരുന്ന് ഇടപെടൽ മുന്നറിയിപ്പ്" },

  // Pricing
  pricing: { en: "Choose Your Plan", ta: "உங்கள் திட்டத்தைத் தேர்ந்தெடுங்கள்", hi: "अपना प्लान चुनें", ml: "നിങ്ങളുടെ പ്ലാൻ തിരഞ്ഞെടുക്കൂ" },
  get_started: { en: "Get Started", ta: "தொடங்கு", hi: "शुरू करें", ml: "ആരംഭിക്കുക" },
  free: { en: "Free", ta: "இலவசம்", hi: "मुफ़्त", ml: "സൗജന്യം" },
  family_plan: { en: "Family Plan", ta: "குடும்ப திட்டம்", hi: "फैमिली प्लान", ml: "ഫാമിലി പ്ലാൻ" },
  family_pro: { en: "Family Pro", ta: "குடும்ப ப்ரோ", hi: "फैमिली प्रो", ml: "ഫാമിലി പ്രോ" },
  one_time: { en: "One-Time Setup", ta: "ஒரு முறை அமைப்பு", hi: "वन-टाइम सेटअप", ml: "ഒറ്റത്തവണ സെറ്റപ്പ്" },
  per_month: { en: "per month", ta: "மாதம்", hi: "प्रति माह", ml: "പ്രതിമാസം" },
  once: { en: "once", ta: "ஒரு முறை", hi: "एक बार", ml: "ഒരിക്കൽ" },

  // Dashboard
  good_morning: { en: "Good Morning", ta: "காலை வணக்கம்", hi: "सुप्रभात", ml: "സുപ്രഭാതം" },
  medicines_taken: { en: "medicines taken today", ta: "இன்று எடுத்த மருந்துகள்", hi: "आज ली गई दवाइयाँ", ml: "ഇന്ന് കഴിച്ച മരുന്നുകൾ" },
  of: { en: "of", ta: "இல்", hi: "में से", ml: "ൽ" },

  // Food
  before_food: { en: "Before Food", ta: "உணவுக்கு முன்", hi: "खाने से पहले", ml: "ഭക്ഷണത്തിന് മുമ്പ്" },
  after_food: { en: "After Food", ta: "உணவுக்குப் பின்", hi: "खाने के बाद", ml: "ഭക്ഷണത്തിന് ശേഷം" },
  with_food: { en: "With Food", ta: "உணவுடன்", hi: "खाने के साथ", ml: "ഭക്ഷണത്തോടൊപ്പം" },

  // AI Features
  todays_insights: { en: "Today's Insights", ta: "இன்றைய நுண்ணறிவுகள்", hi: "आज की जानकारियाँ", ml: "ഇന്നത്തെ ഉൾക്കാഴ്ചകൾ" },
  generating_insights: { en: "Generating insights...", ta: "நுண்ணறிவுகளை உருவாக்குகிறது...", hi: "जानकारियाँ तैयार हो रही हैं...", ml: "ഉൾക്കാഴ്ചകൾ തയ്യാറാക്കുന്നു..." },
  ai_disclaimer: {
    en: "⚕️ AI information is for awareness only. Always consult your doctor.",
    ta: "⚕️ AI தகவல்கள் விழிப்புணர்வுக்கு மட்டுமே. எப்போதும் உங்கள் மருத்துவரை அணுகவும்.",
    hi: "⚕️ AI जानकारी केवल जागरूकता के लिए है। हमेशा अपने डॉक्टर से सलाह लें।",
    ml: "⚕️ AI വിവരങ്ങൾ അവബോധത്തിന് മാത്രം. എല്ലായ്പ്പോഴും ഡോക്ടറെ സമീപിക്കുക.",
  },
  drug_interaction_checker: { en: "Drug Interaction Checker", ta: "மருந்து ஊடாடல் சோதனை", hi: "दवा संपर्क जाँच", ml: "മരുന്ന് ഇടപെടൽ പരിശോധന" },
  medicine_1: { en: "Medicine 1", ta: "மருந்து 1", hi: "दवा 1", ml: "മരുന്ന് 1" },
  medicine_2: { en: "Medicine 2", ta: "மருந்து 2", hi: "दवा 2", ml: "മരുന്ന് 2" },
  check_interaction: { en: "Check Interaction", ta: "ஊடாடலைச் சோதி", hi: "संपर्क जाँचें", ml: "ഇടപെടൽ പരിശോധിക്കുക" },
  checking: { en: "Checking...", ta: "சோதிக்கிறது...", hi: "जाँच हो रही है...", ml: "പരിശോധിക്കുന്നു..." },
  symptoms_to_watch: { en: "Symptoms to Watch", ta: "கவனிக்க வேண்டிய அறிகுறிகள்", hi: "देखने योग्य लक्षण", ml: "ശ്രദ്ധിക്കേണ്ട ലക്ഷണങ്ങൾ" },
  doctor_visit_summary: { en: "Pre-Doctor Visit Summary", ta: "மருத்துவர் சந்திப்பு சுருக்கம்", hi: "डॉक्टर मिलने से पहले की सारांश", ml: "ഡോക്ടർ സന്ദർശന സംഗ്രഹം" },
  prepare_visit: { en: "Prepare for Your Visit", ta: "உங்கள் சந்திப்புக்கு தயாராகுங்கள்", hi: "अपनी मुलाकात के लिए तैयार हों", ml: "സന്ദർശനത്തിന് തയ്യാറെടുക്കൂ" },
  prepare_visit_desc: {
    en: "Generate an AI summary of your medicines, adherence, and suggested questions for your doctor.",
    ta: "உங்கள் மருந்துகள், இணக்கம் மற்றும் மருத்துவருக்கான கேள்விகளின் AI சுருக்கத்தை உருவாக்கவும்.",
    hi: "अपनी दवाओं, अनुपालन और डॉक्टर के लिए सुझावित प्रश्नों का AI सारांश तैयार करें।",
    ml: "മരുന്നുകൾ, പാലനം, ഡോക്ടറോട് ചോദിക്കേണ്ട ചോദ്യങ്ങൾ എന്നിവയുടെ AI സംഗ്രഹം തയ്യാറാക്കുക.",
  },
  generate_summary: { en: "Generate Summary", ta: "சுருக்கம் உருவாக்கு", hi: "सारांश तैयार करें", ml: "സംഗ്രഹം തയ്യാറാക്കുക" },
  generating_summary: { en: "Generating Summary...", ta: "சுருக்கம் உருவாக்குகிறது...", hi: "सारांश तैयार हो रहा है...", ml: "സംഗ്രഹം തയ്യാറാക്കുന്നു..." },
  your_summary: { en: "Your Summary", ta: "உங்கள் சுருக்கம்", hi: "आपका सारांश", ml: "നിങ്ങളുടെ സംഗ്രഹം" },
  share: { en: "Share", ta: "பகிர்", hi: "शेयर करें", ml: "ഷെയർ ചെയ്യുക" },
  print: { en: "Print", ta: "அச்சிடு", hi: "प्रिंट करें", ml: "പ്രിന്റ് ചെയ്യുക" },
  regenerate: { en: "🔄 Regenerate Summary", ta: "🔄 மீண்டும் உருவாக்கு", hi: "🔄 दोबारा तैयार करें", ml: "🔄 വീണ്ടും തയ്യാറാക്കുക" },

  // Patient Dashboard buttons
  scan_prescription: { en: "Scan Prescription", ta: "மருந்து சீட்டை ஸ்கேன் செய்", hi: "प्रिस्क्रिप्शन स्कैन करें", ml: "പ്രിസ്ക്രിപ്ഷൻ സ്കാൻ ചെയ്യുക" },
  what_is_tablet: { en: "What Is This Tablet?", ta: "இந்த மாத்திரை என்ன?", hi: "यह गोली क्या है?", ml: "ഈ ഗുളിക എന്താണ്?" },

  // Settings / Elderly mode
  settings: { en: "Settings", ta: "அமைப்புகள்", hi: "सेटिंग्स", ml: "ക്രമീകരണങ്ങൾ" },
  elderly_mode: { en: "Elderly-Friendly Mode", ta: "முதியோர் நட்பு பயன்முறை", hi: "बुज़ुर्ग-अनुकूल मोड", ml: "മുതിർന്നവർക്കുള്ള മോഡ്" },
  elderly_mode_desc: {
    en: "Larger text, higher contrast, simplified layout",
    ta: "பெரிய உரை, அதிக மாறுபாடு, எளிமையான தளவமைப்பு",
    hi: "बड़ा टेक्स्ट, अधिक कंट्रास्ट, सरल लेआउट",
    ml: "വലിയ ടെക്സ്റ്റ്, ഉയർന്ന കോൺട്രാസ്റ്റ്, ലളിതമായ ലേഔട്ട്",
  },

  // Emergency
  emergency_info: { en: "Emergency Info", ta: "அவசர தகவல்", hi: "आपातकालीन जानकारी", ml: "അടിയന്തര വിവരം" },
  show_to_doctor: {
    en: "🚨 Show this screen to your doctor in an emergency",
    ta: "🚨 அவசரத்தில் இந்தத் திரையை உங்கள் மருத்துவரிடம் காட்டுங்கள்",
    hi: "🚨 आपातकाल में यह स्क्रीन अपने डॉक्टर को दिखाएं",
    ml: "🚨 അടിയന്തരാവസ്ഥയിൽ ഈ സ്ക്രീൻ ഡോക്ടറെ കാണിക്കുക",
  },
  blood_group: { en: "Blood Group", ta: "இரத்த வகை", hi: "रक्त समूह", ml: "രക്തഗ്രൂപ്പ്" },
  allergies: { en: "Allergies", ta: "ஒவ்வாமைகள்", hi: "एलर्जी", ml: "അലർജികൾ" },
  current_medicines: { en: "Current Medicines", ta: "தற்போதைய மருந்துகள்", hi: "वर्तमान दवाइयाँ", ml: "നിലവിലെ മരുന്നുകൾ" },
  emergency_contact: { en: "Emergency Contact", ta: "அவசர தொடர்பு", hi: "आपातकालीन संपर्क", ml: "അടിയന്തര ബന്ധപ്പെടൽ" },

  // Refill
  refill_alert: { en: "runs out in", ta: "தீர்ந்து போகும்", hi: "में खत्म हो जाएगी", ml: "തീരും" },
  days: { en: "days", ta: "நாட்கள்", hi: "दिन", ml: "ദിവസങ്ങൾ" },
  days_remaining: { en: "days remaining", ta: "நாட்கள் மீதம்", hi: "दिन शेष", ml: "ദിവസങ്ങൾ ശേഷിക്കുന്നു" },
  time_to_refill: { en: "Time to refill", ta: "மீண்டும் நிரப்ப வேண்டிய நேரம்", hi: "रीफिल करने का समय", ml: "റീഫിൽ ചെയ്യാൻ സമയമായി" },

  // Empty state
  no_medicines_yet: { en: "No medicines added yet", ta: "இன்னும் மருந்துகள் சேர்க்கப்படவில்லை", hi: "अभी तक कोई दवा नहीं जोड़ी गई", ml: "ഇതുവരെ മരുന്നുകൾ ചേർത്തിട്ടില്ല" },
  add_first_medicine: {
    en: "Add your first medicine to get started with reminders and insights.",
    ta: "நினைவூட்டல்களைத் தொடங்க உங்கள் முதல் மருந்தைச் சேர்க்கவும்.",
    hi: "रिमाइंडर और जानकारी शुरू करने के लिए अपनी पहली दवा जोड़ें।",
    ml: "ഓർമ്മപ്പെടുത്തലുകളും ഉൾക്കാഴ്ചകളും ലഭിക്കാൻ ആദ്യ മരുന്ന് ചേർക്കൂ.",
  },

  // Profile links
  upgrade_plan: { en: "Upgrade Plan", ta: "திட்டத்தை மேம்படுத்து", hi: "प्लान अपग्रेड करें", ml: "പ്ലാൻ അപ്‌ഗ്രേഡ് ചെയ്യുക" },
  upgrade_desc: {
    en: "Get unlimited medicines & caretaker access",
    ta: "வரம்பற்ற மருந்துகள் & பராமரிப்பாளர் அணுகல்",
    hi: "असीमित दवाइयाँ और देखभालकर्ता एक्सेस पाएं",
    ml: "പരിമിതിയില്ലാത്ത മരുന്നുകളും പരിചാരക ആക്സസും നേടൂ",
  },
  doctor_summary_desc: {
    en: "AI-generated summary for your next appointment",
    ta: "உங்கள் அடுத்த சந்திப்புக்கான AI சுருக்கம்",
    hi: "आपकी अगली अपॉइंटमेंट के लिए AI सारांश",
    ml: "അടുത്ത അപ്പോയിന്റ്മെന്റിനായുള്ള AI സംഗ്രഹം",
  },
  drug_checker_desc: {
    en: "Check if your medicines are safe together",
    ta: "உங்கள் மருந்துகள் ஒன்றாக எடுக்கலாமா என்று சோதிக்கவும்",
    hi: "जाँचें कि आपकी दवाइयाँ साथ में सुरक्षित हैं या नहीं",
    ml: "മരുന്നുകൾ ഒരുമിച്ച് കഴിക്കാൻ സുരക്ഷിതമാണോ പരിശോധിക്കൂ",
  },

  // Care circle
  my_care_circle: { en: "My Care Circle", ta: "என் பராமரிப்பு வட்டம்", hi: "मेरा केयर सर्कल", ml: "എന്റെ കെയർ സർക്കിൾ" },
  add: { en: "Add", ta: "சேர்", hi: "जोड़ें", ml: "ചേർക്കുക" },
  add_caretaker: { en: "Add Caretaker", ta: "பராமரிப்பாளர் சேர்க்க", hi: "देखभालकर्ता जोड़ें", ml: "പരിചാരകനെ ചേർക്കുക" },
  name: { en: "Name", ta: "பெயர்", hi: "नाम", ml: "പേര്" },
  relationship: { en: "Relationship", ta: "உறவு", hi: "रिश्ता", ml: "ബന്ധം" },
  phone: { en: "Phone", ta: "தொலைபேசி", hi: "फ़ोन", ml: "ഫോൺ" },
  email: { en: "Email", ta: "மின்னஞ்சல்", hi: "ईमेल", ml: "ഇമെയിൽ" },
  no_caretakers: { en: "No caretakers added yet", ta: "இன்னும் பராமரிப்பாளர்கள் சேர்க்கப்படவில்லை", hi: "अभी तक कोई देखभालकर्ता नहीं जोड़ा गया", ml: "ഇതുവരെ പരിചാരകരെ ചേർത്തിട്ടില്ല" },

  // Reminders
  reminders: { en: "Reminders", ta: "நினைவூட்டல்கள்", hi: "रिमाइंडर", ml: "ഓർമ്മപ്പെടുത്തലുകൾ" },
  todays_summary: { en: "Today's Summary", ta: "இன்றைய சுருக்கம்", hi: "आज का सारांश", ml: "ഇന്നത്തെ സംഗ്രഹം" },
  no_medicines_scheduled: { en: "No medicines scheduled", ta: "மருந்துகள் திட்டமிடப்படவில்லை", hi: "कोई दवा शेड्यूल नहीं है", ml: "മരുന്നുകൾ ഷെഡ്യൂൾ ചെയ്തിട്ടില്ല" },
  add_medicines_reminder: { en: "Add medicines to see reminders here", ta: "நினைவூட்டல்களைக் காண மருந்துகளைச் சேர்க்கவும்", hi: "रिमाइंडर देखने के लिए दवाइयाँ जोड़ें", ml: "ഓർമ്മപ്പെടുത്തലുകൾ കാണാൻ മരുന്നുകൾ ചേർക്കൂ" },
  or_enter_manually: { en: "or enter manually", ta: "அல்லது கைமுறையாக உள்ளிடவும்", hi: "या मैन्युअल रूप से दर्ज करें", ml: "അല്ലെങ്കിൽ സ്വയം ടൈപ്പ് ചെയ്യൂ" },
  scan_tablet_strip: { en: "Scan Tablet Strip", ta: "மாத்திரை பட்டையை ஸ்கேன் செய்", hi: "टैबलेट स्ट्रिप स्कैन करें", ml: "ഗുളിക സ്ട്രിപ്പ് സ്കാൻ ചെയ്യുക" },
  tap_to_upload: { en: "Tap to upload", ta: "பதிவேற்ற தட்டவும்", hi: "अपलोड करने के लिए टैप करें", ml: "അപ്‌ലോഡ് ചെയ്യാൻ ടാപ്പ് ചെയ്യുക" },

  // Dashboard UI
  medicines_taken_label: { en: "Medicines Taken", ta: "எடுத்த மருந்துகள்", hi: "ली गई दवाइयाँ", ml: "കഴിച്ച മരുന്നുകൾ" },
  weekly_progress: { en: "Weekly Progress", ta: "வாராந்திர முன்னேற்றம்", hi: "साप्ताहिक प्रगति", ml: "പ്രതിവാര പുരോഗതി" },
  no_medicines_title: { en: "No Medicines Yet", ta: "இன்னும் மருந்துகள் இல்லை", hi: "अभी तक कोई दवा नहीं", ml: "ഇതുവരെ മരുന്നുകളില്ല" },
  add_first_medicine_tracking: { en: "Add your first medicine to start tracking", ta: "கண்காணிக்க உங்கள் முதல் மருந்தைச் சேர்க்கவும்", hi: "ट्रैकिंग शुरू करने के लिए अपनी पहली दवा जोड़ें", ml: "ട്രാക്കിംഗ് ആരംഭിക്കാൻ ആദ്യ മരുന്ന് ചേർക്കൂ" },
  add_medicine_btn: { en: "+ Add Medicine", ta: "+ மருந்து சேர்க்க", hi: "+ दवा जोड़ें", ml: "+ മരുന്ന് ചേർക്കുക" },
  todays_medicines: { en: "Today's Medicines", ta: "இன்றைய மருந்துகள்", hi: "आज की दवाइयाँ", ml: "ഇന്നത്തെ മരുന്നുകൾ" },
  taken_label: { en: "Taken", ta: "எடுத்தது", hi: "ली गई", ml: "കഴിച്ചു" },
  take_now: { en: "Take Now", ta: "இப்போது எடு", hi: "अभी लें", ml: "ഇപ്പോൾ കഴിക്കൂ" },
  mark_taken_btn: { en: "Mark Taken", ta: "எடுத்ததாக குறி", hi: "ली गई चिह्नित करें", ml: "കഴിച്ചതായി അടയാളപ്പെടുത്തുക" },
  missed_label: { en: "Missed", ta: "தவறிவிட்டது", hi: "छूट गई", ml: "നഷ്ടമായി" },
  book_checkup: { en: "Book Checkup", ta: "பரிசோதனை முன்பதிவு", hi: "चेकअप बुक करें", ml: "ചെക്കപ്പ് ബുക്ക് ചെയ്യുക" },
  undo: { en: "Undo", ta: "செயல்தவிர்", hi: "पूर्ववत करें", ml: "പഴയപടിയാക്കുക" },
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
