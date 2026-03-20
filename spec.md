# MedCircle — Product Specification

> **MedCircle** is a Progressive Web App (PWA) for medication management, caretaker coordination, and health monitoring — built for Indian families caring for elderly patients. It supports multilingual AI content (Tamil, Hindi, Malayalam, English), elderly-friendly UI modes, voice commands, and WhatsApp-based reminders.

**Live URL:** https://medcircle-family-guardian.lovable.app

---

## Tech Stack

| Layer        | Technology                                              |
| ------------ | ------------------------------------------------------- |
| Frontend     | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui     |
| State        | TanStack React Query, React Context                     |
| Routing      | React Router v6                                         |
| Backend      | Supabase (Lovable Cloud) — Auth, Postgres, Edge Functions, Storage |
| AI           | Lovable AI gateway (Gemini / GPT models), RxNorm APIs   |
| Payments     | Razorpay, Stripe, Cashfree                              |
| Messaging    | Twilio (WhatsApp reminders, OTP)                        |
| PWA          | vite-plugin-pwa, service worker, installable            |
| Charts       | Recharts                                                |
| QR           | qrcode.react                                            |

---

## Folder Structure

```
├── public/
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   ├── placeholder.svg
│   └── robots.txt
├── src/
│   ├── assets/                          # Static images
│   ├── components/
│   │   ├── ui/                          # shadcn/ui primitives (40+ components)
│   │   ├── AnimatedPage.tsx             # Page transition wrapper
│   │   ├── BottomNav.tsx                # Mobile bottom navigation bar
│   │   ├── DailyInsights.tsx            # AI-powered daily health insights
│   │   ├── EditProfileSheet.tsx         # Profile edit bottom sheet
│   │   ├── EmergencyInfoButton.tsx      # Quick emergency info access
│   │   ├── EmergencyQRSection.tsx       # QR code for emergency card
│   │   ├── LanguageToggle.tsx           # Language selector (EN/TA/HI/ML)
│   │   ├── NavLink.tsx                  # Navigation link component
│   │   ├── ProtectedRoute.tsx           # Auth guard wrapper
│   │   ├── RefillBanner.tsx             # Medicine refill alert banner
│   │   ├── VoiceCommandButton.tsx       # Floating voice command FAB
│   │   └── WhatsAppPreview.tsx          # WhatsApp message preview
│   ├── contexts/
│   │   ├── ElderlyModeContext.tsx        # Large text / simplified UI toggle
│   │   ├── LanguageContext.tsx           # i18n context (en/ta/hi/ml)
│   │   └── VoiceCommandContext.tsx       # Voice navigation context
│   ├── hooks/
│   │   ├── use-mobile.tsx               # Mobile viewport detection
│   │   ├── use-toast.ts                 # Toast notification hook
│   │   ├── useInstallPrompt.ts          # PWA install prompt hook
│   │   └── useNotificationReminders.ts  # Browser notification scheduling
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts                # Auto-generated Supabase client
│   │       └── types.ts                 # Auto-generated DB types
│   ├── lib/
│   │   └── utils.ts                     # Utility helpers (cn, etc.)
│   ├── pages/
│   │   ├── Welcome.tsx                  # Landing / marketing page
│   │   ├── Auth.tsx                     # Login / Signup
│   │   ├── ResetPassword.tsx            # Password reset flow
│   │   ├── Onboarding.tsx               # First-time patient setup
│   │   ├── PatientDashboard.tsx         # Main patient home screen
│   │   ├── AddMedicine.tsx              # Add new medicine form
│   │   ├── MedicineDetail.tsx           # Single medicine view + doses
│   │   ├── Reminders.tsx                # Reminder management
│   │   ├── ScanPrescription.tsx         # AI prescription scanner (camera)
│   │   ├── ScanTablet.tsx               # AI tablet identifier (camera)
│   │   ├── DrugInteraction.tsx          # 3-layer drug interaction checker
│   │   ├── SymptomChecker.tsx           # AI symptom analysis
│   │   ├── DoctorSummary.tsx            # AI-generated doctor report
│   │   ├── Profile.tsx                  # Patient profile management
│   │   ├── Settings.tsx                 # App settings
│   │   ├── CaretakerDashboard.tsx       # Caretaker monitoring view
│   │   ├── HospitalBooking.tsx          # Doctor appointment booking
│   │   ├── EmergencyCard.tsx            # Public emergency info (no auth)
│   │   ├── NotificationLog.tsx          # Notification history
│   │   ├── Pricing.tsx                  # Subscription plans display
│   │   ├── Paywall.tsx                  # Payment gateway integration
│   │   ├── AdminDashboard.tsx           # Admin analytics panel
│   │   └── NotFound.tsx                 # 404 page
│   ├── App.tsx                          # Root component + routing
│   ├── main.tsx                         # Entry point
│   └── index.css                        # Global styles + design tokens
├── supabase/
│   ├── config.toml                      # Supabase project config
│   ├── migrations/                      # SQL migration files
│   └── functions/                       # Edge Functions (see below)
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Routes

| Path                    | Component            | Auth | Description                        |
| ----------------------- | -------------------- | ---- | ---------------------------------- |
| `/`                     | Welcome              | No   | Landing page with install prompt   |
| `/auth`                 | Auth                 | No   | Login / Signup                     |
| `/reset-password`       | ResetPassword        | No   | Password reset                     |
| `/emergency/:token`     | EmergencyCard        | No   | Public emergency profile via QR    |
| `/onboarding`           | Onboarding           | Yes  | First-time patient setup wizard    |
| `/patient`              | PatientDashboard     | Yes  | Main dashboard                     |
| `/add-medicine`         | AddMedicine          | Yes  | Add medicine form                  |
| `/medicine-detail/:id`  | MedicineDetail       | Yes  | Medicine details + dose tracking   |
| `/reminders`            | Reminders            | Yes  | Reminder management                |
| `/scan`                 | ScanPrescription     | Yes  | AI prescription scanner            |
| `/scan-tablet`          | ScanTablet           | Yes  | AI tablet identifier               |
| `/drug-interaction`     | DrugInteraction      | Yes  | 3-layer drug interaction checker   |
| `/symptoms`             | SymptomChecker       | Yes  | AI symptom analysis                |
| `/doctor-summary`       | DoctorSummary        | Yes  | AI doctor report generator         |
| `/profile`              | Profile              | Yes  | Patient profile                    |
| `/settings`             | Settings             | Yes  | App settings                       |
| `/caretaker`            | CaretakerDashboard   | Yes  | Caretaker monitoring               |
| `/hospital-booking`     | HospitalBooking      | Yes  | Doctor appointment booking         |
| `/notifications`        | NotificationLog      | Yes  | Notification history               |
| `/pricing`              | Pricing              | Yes  | Subscription plans                 |
| `/paywall`              | Paywall              | Yes  | Payment processing                 |
| `/admin`                | AdminDashboard       | Yes  | Admin analytics                    |

---

## Main Features

### 1. Medicine Management
- Add, edit, delete medicines with dosage, timing, food instructions, and purpose
- Photo upload for medicine identification
- Active/inactive toggle
- Refill tracking with tablet count and alerts

### 2. Dose Tracking
- Daily dose schedule with taken/missed status
- One-tap dose confirmation
- Missed dose detection and alerts
- Dose history and adherence analytics

### 3. Drug Interaction Checker (3-Layer Verification)
- **Layer 1 — RxNorm API:** Converts drug names → RxCUI identifiers
- **Layer 2 — RxNorm Interaction API:** Fetches FDA-verified interaction data
- **Layer 3 — AI:** Translates results into patient's language, adds clinical tips
- **Badges:** Green (FDA Verified) / Amber (AI Generated — confirm with doctor)
- **High severity:** Full-screen red modal requiring doctor acknowledgment
- All checks logged to `interaction_cache` table

### 4. AI-Powered Features
- **Prescription Scanner:** Camera → AI extracts medicine names, dosages
- **Tablet Identifier:** Camera → AI identifies pill by shape/color/markings
- **Symptom Checker:** Symptom input → urgency assessment + side-effect detection
- **Doctor Summary:** AI-generated medical report for doctor visits
- **Daily Health Insights:** Personalized daily tips based on medicines/conditions
- **Medicine Info:** AI-powered drug information lookup

### 5. Caretaker System
- Link caretakers via MedCircle code
- Caretakers can view patient medicines, doses, and bookings
- Missed dose alerts sent to caretakers
- WhatsApp notifications for caretaker alerts

### 6. Emergency Card
- Public URL with QR code (no login required)
- Displays: name, age, blood group, allergies, chronic conditions, emergency contact, current medicines, emergency notes

### 7. WhatsApp Reminders (Twilio)
- Automated medicine reminders via WhatsApp
- Patient can respond with "taken" / "skip"
- Follow-up messages for missed doses
- Caretaker notification on prolonged non-response
- Webhook for inbound message processing

### 8. Hospital & Doctor Booking
- Browse doctors by specialty
- View available time slots
- Book appointments with notes
- Caretaker can book on behalf of patient

### 9. Multilingual AI Content
- UI labels: always English
- AI-generated content translated to: Tamil (ta), Hindi (hi), Malayalam (ml), English (en)
- Language selection persisted in context

### 10. Elderly Mode
- Larger text sizes throughout the app
- Simplified layouts with bigger touch targets
- High-contrast elements
- Toggle in settings

### 11. Voice Commands
- Floating voice command button
- Navigate app via voice ("go to medicines", "check symptoms")
- Language-aware recognition

### 12. PWA & Installability
- Service worker for offline caching
- Install prompt on Welcome page and Patient Dashboard
- Dismissible install banner with "Install MedCircle" CTA

### 13. Payments
- Three payment gateways: Razorpay, Stripe, Cashfree
- Plan tiers: Free, Pro
- Payment verification and status tracking

### 14. Admin Dashboard
- Platform-wide metrics and analytics
- User activity monitoring

---

## Database Schema

### `patient_profiles`
| Column              | Type          | Nullable | Default                  |
| ------------------- | ------------- | -------- | ------------------------ |
| id                  | uuid (PK)     | No       | gen_random_uuid()        |
| user_id             | uuid          | Yes      | —                        |
| name                | text          | No       | 'User'                   |
| age                 | integer       | No       | 0                        |
| blood_group         | text          | Yes      | —                        |
| allergies           | text[]        | Yes      | —                        |
| chronic_conditions  | text[]        | Yes      | —                        |
| emergency_contact   | text          | Yes      | —                        |
| emergency_notes     | text          | Yes      | —                        |
| emergency_token     | uuid          | No       | gen_random_uuid()        |
| medcircle_code      | text          | Yes      | random 6-digit           |
| photo_url           | text          | Yes      | —                        |
| plan                | text          | No       | 'free'                   |
| onboarding_complete | boolean       | No       | false                    |
| last_active_at      | timestamptz   | Yes      | now()                    |
| created_at          | timestamptz   | No       | now()                    |
| updated_at          | timestamptz   | No       | now()                    |

### `medicines`
| Column           | Type        | Nullable | Default       |
| ---------------- | ----------- | -------- | ------------- |
| id               | uuid (PK)   | No       | gen_random_uuid() |
| user_id          | uuid        | Yes      | —             |
| name             | text        | No       | —             |
| dosage           | text        | No       | —             |
| timing           | text        | No       | —             |
| food_instruction | text        | No       | 'after_food'  |
| purpose          | text        | Yes      | —             |
| photo_url        | text        | Yes      | —             |
| is_active        | boolean     | No       | true          |
| created_at       | timestamptz | No       | now()         |
| updated_at       | timestamptz | No       | now()         |

### `doses`
| Column         | Type        | Nullable | Default        |
| -------------- | ----------- | -------- | -------------- |
| id             | uuid (PK)   | No       | gen_random_uuid() |
| medicine_id    | uuid (FK)   | No       | —              |
| user_id        | uuid        | Yes      | —              |
| scheduled_time | text        | No       | —              |
| scheduled_date | date        | No       | CURRENT_DATE   |
| taken          | boolean     | No       | false          |
| missed         | boolean     | No       | false          |
| taken_at       | timestamptz | Yes      | —              |
| created_at     | timestamptz | No       | now()          |

### `medicine_refills`
| Column             | Type        | Nullable | Default        |
| ------------------ | ----------- | -------- | -------------- |
| id                 | uuid (PK)   | No       | gen_random_uuid() |
| medicine_id        | uuid (FK)   | No       | —              |
| total_tablets      | integer     | No       | 30             |
| tablets_remaining  | integer     | No       | 30             |
| refill_date        | date        | Yes      | —              |
| created_at         | timestamptz | No       | now()          |
| updated_at         | timestamptz | No       | now()          |

### `caretakers`
| Column             | Type        | Nullable | Default        |
| ------------------ | ----------- | -------- | -------------- |
| id                 | uuid (PK)   | No       | gen_random_uuid() |
| patient_profile_id | uuid (FK)   | No       | —              |
| name               | text        | No       | —              |
| phone              | text        | No       | —              |
| email              | text        | Yes      | —              |
| relationship       | text        | No       | —              |
| is_active          | boolean     | No       | true           |
| created_at         | timestamptz | No       | now()          |

### `caretaker_links`
| Column             | Type        | Nullable | Default        |
| ------------------ | ----------- | -------- | -------------- |
| id                 | uuid (PK)   | No       | gen_random_uuid() |
| patient_profile_id | uuid (FK)   | No       | —              |
| caretaker_user_id  | uuid        | No       | —              |
| created_at         | timestamptz | No       | now()          |

### `doctors`
| Column        | Type        | Nullable | Default        |
| ------------- | ----------- | -------- | -------------- |
| id            | uuid (PK)   | No       | gen_random_uuid() |
| user_id       | uuid        | Yes      | —              |
| name          | text        | No       | —              |
| specialty     | text        | No       | —              |
| hospital_name | text        | No       | —              |
| phone         | text        | Yes      | —              |
| photo_url     | text        | Yes      | —              |
| is_active     | boolean     | No       | true           |
| created_at    | timestamptz | No       | now()          |

### `doctor_slots`
| Column    | Type        | Nullable | Default        |
| --------- | ----------- | -------- | -------------- |
| id        | uuid (PK)   | No       | gen_random_uuid() |
| doctor_id | uuid (FK)   | No       | —              |
| slot_date | date        | No       | —              |
| slot_time | text        | No       | —              |
| is_booked | boolean     | No       | false          |
| created_at| timestamptz | No       | now()          |

### `bookings`
| Column              | Type        | Nullable | Default        |
| ------------------- | ----------- | -------- | -------------- |
| id                  | uuid (PK)   | No       | gen_random_uuid() |
| patient_profile_id  | uuid (FK)   | No       | —              |
| doctor_id           | uuid (FK)   | No       | —              |
| doctor_slot_id      | uuid (FK)   | No       | —              |
| status              | text        | No       | 'confirmed'    |
| notes               | text        | Yes      | —              |
| caretaker_notified  | boolean     | No       | false          |
| created_at          | timestamptz | No       | now()          |

### `interaction_cache`
| Column           | Type        | Nullable | Default        |
| ---------------- | ----------- | -------- | -------------- |
| id               | uuid (PK)   | No       | gen_random_uuid() |
| user_id          | uuid        | No       | —              |
| drug1            | text        | No       | —              |
| drug2            | text        | No       | —              |
| severity         | text        | No       | 'unknown'      |
| source           | text        | No       | 'claude'       |
| rxcui1           | text        | Yes      | —              |
| rxcui2           | text        | Yes      | —              |
| interaction_data | jsonb       | Yes      | —              |
| created_at       | timestamptz | No       | now()          |

### `symptom_checks`
| Column             | Type        | Nullable | Default        |
| ------------------ | ----------- | -------- | -------------- |
| id                 | uuid (PK)   | No       | gen_random_uuid() |
| patient_profile_id | uuid (FK)   | No       | —              |
| symptom            | text        | No       | —              |
| urgency            | text        | No       | 'NORMAL'       |
| urgency_color      | text        | No       | 'green'        |
| is_side_effect     | boolean     | No       | false          |
| likely_medicine    | text        | Yes      | —              |
| summary            | text        | Yes      | —              |
| what_to_do         | text[]      | Yes      | '{}'           |
| tamil_explanation  | text        | Yes      | —              |
| created_at         | timestamptz | No       | now()          |

### `hospital_visits`
| Column             | Type        | Nullable | Default        |
| ------------------ | ----------- | -------- | -------------- |
| id                 | uuid (PK)   | No       | gen_random_uuid() |
| patient_profile_id | uuid (FK)   | No       | —              |
| visit_date         | date        | No       | —              |
| doctor_name        | text        | No       | —              |
| hospital_name      | text        | No       | —              |
| diagnosis          | text        | No       | —              |
| notes              | text        | Yes      | —              |
| report_url         | text        | Yes      | —              |
| created_at         | timestamptz | No       | now()          |

### `payments`
| Column              | Type        | Nullable | Default        |
| ------------------- | ----------- | -------- | -------------- |
| id                  | uuid (PK)   | No       | gen_random_uuid() |
| patient_profile_id  | uuid (FK)   | No       | —              |
| plan                | text        | No       | —              |
| amount              | integer     | No       | —              |
| status              | text        | No       | 'pending'      |
| razorpay_order_id   | text        | Yes      | —              |
| razorpay_payment_id | text        | Yes      | —              |
| upi_transaction_id  | text        | Yes      | —              |
| created_at          | timestamptz | No       | now()          |

### `whatsapp_reminders`
| Column             | Type        | Nullable | Default        |
| ------------------ | ----------- | -------- | -------------- |
| id                 | uuid (PK)   | No       | gen_random_uuid() |
| user_id            | uuid        | No       | —              |
| medicine_id        | uuid (FK)   | No       | —              |
| medicine_name      | text        | No       | —              |
| dosage             | text        | No       | —              |
| timing             | text        | No       | —              |
| phone              | text        | No       | —              |
| scheduled_date     | date        | No       | CURRENT_DATE   |
| sent_at            | timestamptz | Yes      | —              |
| response           | text        | Yes      | —              |
| response_at        | timestamptz | Yes      | —              |
| followup_sent_at   | timestamptz | Yes      | —              |
| caretaker_notified | boolean     | Yes      | false          |
| created_at         | timestamptz | No       | now()          |

### `phone_otps`
| Column     | Type        | Nullable | Default        |
| ---------- | ----------- | -------- | -------------- |
| id         | uuid (PK)   | No       | gen_random_uuid() |
| phone      | text        | No       | —              |
| otp        | text        | No       | —              |
| verified   | boolean     | No       | false          |
| expires_at | timestamptz | No       | —              |
| created_at | timestamptz | No       | now()          |

---

## Edge Functions

| Function               | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `admin-metrics`        | Platform-wide analytics for admin dashboard          |
| `caretaker-alert`      | Send missed-dose alerts to linked caretakers          |
| `create-cashfree-order`| Create Cashfree payment order                        |
| `create-razorpay-order`| Create Razorpay payment order                        |
| `create-stripe-checkout`| Create Stripe checkout session                      |
| `doctor-summary`       | AI-generated medical summary for doctor visits       |
| `drug-interaction`     | 3-layer drug interaction check (RxNorm + AI)         |
| `emergency-profile`    | Fetch patient emergency data by token (public)       |
| `health-insights`      | AI daily health insights based on patient data       |
| `medicine-info`        | AI drug information lookup                           |
| `missed-dose-checker`  | Detect and flag missed doses                         |
| `scan-prescription`    | AI prescription image → structured medicine data     |
| `scan-tablet`          | AI tablet image → drug identification                |
| `send-otp`             | Send phone OTP via Twilio                            |
| `setup-demo`           | Seed demo data for testing                           |
| `symptom-checker`      | AI symptom analysis with urgency assessment          |
| `verify-otp`           | Verify phone OTP code                                |
| `verify-payment`       | Verify and confirm payment status                    |
| `whatsapp-reminder`    | Send WhatsApp medicine reminders via Twilio          |
| `whatsapp-webhook`     | Process inbound WhatsApp responses                   |

---

## Database Functions

| Function                  | Returns    | Purpose                                      |
| ------------------------- | ---------- | --------------------------------------------- |
| `get_my_profile_id()`     | uuid       | Get current user's patient_profile.id         |
| `get_linked_patient_ids()`| uuid[]     | Get patient IDs linked to current caretaker   |
| `get_my_doctor_id()`      | uuid       | Get current user's doctor.id                  |
| `is_my_medicine(uuid)`    | boolean    | Check if medicine belongs to current user     |
| `handle_new_user()`       | trigger    | Auto-create patient_profile on signup         |
| `update_updated_at_column()`| trigger  | Auto-update updated_at timestamp              |

---

## Storage Buckets

| Bucket           | Public | Purpose                    |
| ---------------- | ------ | -------------------------- |
| `profile-photos` | Yes    | Patient profile pictures   |

---

## Security (RLS Summary)

- All patient data tables enforce `user_id = auth.uid()` or profile-based ownership
- Caretakers can read (not write) linked patient data via `get_linked_patient_ids()`
- Emergency card is public via unique token (no auth)
- `interaction_cache` scoped to inserting/viewing own records
- Service role has full access where needed for edge functions
- Doctor slots are publicly viewable but only insertable by the owning doctor

---

## Environment Variables

| Variable                          | Source       |
| --------------------------------- | ------------ |
| `VITE_SUPABASE_URL`              | Auto (Cloud) |
| `VITE_SUPABASE_PUBLISHABLE_KEY`  | Auto (Cloud) |
| `VITE_SUPABASE_PROJECT_ID`       | Auto (Cloud) |
| `LOVABLE_API_KEY`                | Secret       |
| `SUPABASE_SERVICE_ROLE_KEY`      | Secret       |
| `TWILIO_ACCOUNT_SID`             | Secret       |
| `TWILIO_AUTH_TOKEN`              | Secret       |
| `TWILIO_PHONE_NUMBER`            | Secret       |
| `RAZORPAY_KEY_ID`                | Secret       |
| `RAZORPAY_KEY_SECRET`            | Secret       |
| `STRIPE_SECRET_KEY`              | Secret       |
| `CASHFREE_APP_ID`                | Secret       |
| `CASHFREE_SECRET_KEY`            | Secret       |
