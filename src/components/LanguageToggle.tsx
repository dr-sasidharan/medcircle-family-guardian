import { useLanguage } from "@/contexts/LanguageContext";

const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();
  const langs = [
    { code: "en" as const, label: "EN" },
    { code: "ta" as const, label: "தமிழ்" },
    { code: "hi" as const, label: "हिं" },
  ];

  return (
    <div className="flex gap-1 bg-secondary rounded-lg p-1">
      {langs.map((l) => (
        <button
          key={l.code}
          onClick={() => setLanguage(l.code)}
          className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
            language === l.code
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageToggle;
