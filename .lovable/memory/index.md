Design system restored to clean default (white bg, solid teal primary, standard shadows, no glassmorphism).

## Design & Language Preferences

- All UI labels, page titles, section headers, button text, and form labels must be in **English** (hardcoded, not using `t()`)
- Only AI-generated content (doctor summary, medicine info, drug interaction results, health insights) should be translated to the user's selected language (Tamil, Hindi, Malayalam)
- The `t()` translation function from LanguageContext should NOT be used for UI labels
- Voice command language auto-syncs with the app's UI language preference
- Supported languages for AI content: English (en), Tamil (ta), Hindi (hi), Malayalam (ml)

## Design System — Clean Default

- **Background**: White (#fff) for pages, light grey (bg-muted/30) for dashboards
- **Cards**: White bg-card with border-border, rounded-2xl, shadow-sm
- **Primary**: Teal hsl(174, 84%, 32%) — used for headers, buttons, accents
- **Inputs**: bg-muted border border-border rounded-xl, focus:ring-ring
- **Headers**: Solid bg-primary with white text
- **Bottom nav**: White bg with border-t border-border
- **No glassmorphism, no backdrop-filter blur, no animated gradient background**

## Admin Dashboard

- Active users metric uses auth.users last_sign_in_at (30-day window)
- "Total Registered" and "Active (30 days)" shown side by side as top metrics
