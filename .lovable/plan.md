

## Problem
The voice command language is hardcoded to default to English (`useState<VoiceLang>("en")`) and doesn't sync with the app's UI language preference from `LanguageContext`.

## Plan

**File: `src/contexts/VoiceCommandContext.tsx`**
1. Import `useLanguage` from `LanguageContext` (already imported but unused in provider).
2. Initialize `voiceLang` state from the current app language: `useState<VoiceLang>(language)` where `language` comes from `useLanguage()`.
3. Add a `useEffect` that syncs `voiceLang` whenever the app `language` changes — so switching UI language in Settings/LanguageToggle automatically updates voice command language too.

**File: `src/components/VoiceCommandButton.tsx`** — No changes needed; it already reads `voiceLang` from context.

This is a ~5-line change in one file.

