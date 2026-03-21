# Memory: index.md
Updated: now

## Design & Language Preferences

- All UI labels, page titles, section headers, button text, and form labels must be in **English** (hardcoded, not using `t()`)
- Only AI-generated content (doctor summary, medicine info, drug interaction results, health insights) should be translated to the user's selected language (Tamil, Hindi, Malayalam)
- The `t()` translation function from LanguageContext should NOT be used for UI labels
- Voice command language auto-syncs with the app's UI language preference
- Supported languages for AI content: English (en), Tamil (ta), Hindi (hi), Malayalam (ml)

## Design System — Glassmorphism

- **Fonts**: Syne (600,700,800) for headings; Plus Jakarta Sans (400,500,600) for body
- **Background**: Fixed animated gradient mesh with 4 blurred blobs (teal, emerald, slate blue, dark ink)
- **Glass cards**: `glass-card` class — rgba(255,255,255,0.08) bg, blur(20px), white/15 border, 24px radius
- **Glass inputs**: `glass-input` class — rgba(255,255,255,0.06) bg, white text, white/40 placeholder
- **Glass nav**: `glass-nav` class — rgba(10,25,23,0.8) bg, blur(20px)
- **Text on glass**: white (primary), rgba(255,255,255,0.65) (secondary), rgba(255,255,255,0.4) (muted)
- **Accent colors**: Teal #0d9488, Emerald #10b981/#34d399, Amber #f59e0b, Coral #f43f5e, Violet #8b5cf6, Blue #3b82f6
- **Never use solid color backgrounds** — only for accents, glows, badges
- **All pages use transparent bg** with the global GlassBackground component in App.tsx
