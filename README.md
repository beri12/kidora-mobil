# Kidora mobile (Android & iOS)

A native Expo / React Native app for [Kidora](https://justkidora.com), connected to the
existing production API (`https://api.justkidora.com/api`). It is not a WebView: every
screen is native and talks to the same NestJS API the website uses.

| | |
|---|---|
| Expo SDK | 58 (React Native 0.88, React 19.3, Hermes) |
| Navigation | Expo Router (file routes in `src/app`) |
| Data | TanStack Query + one typed API client (`src/api/client.ts`) |
| State | Zustand (session, settings, small UI state) |
| Storage | SecureStore (tokens only) · SQLite (offline lesson cache + sync queue) · SQLite kv-store (preferences) |
| Motion | Reanimated 4 + Gesture Handler, honouring the OS "reduce motion" setting and an in-app switch |
| Forms | React Hook Form + Zod |

## What is in it

- **Sign-in:** email + password, phone OTP, email/SMS verification, MFA code, forgot/reset
  password, Google and Facebook sign-in (system browser + PKCE; needs the API change in
  `docs/BACKEND_CHANGES.md`), and the "How will you use Kidora?" role step.
- **Students:** home (streak week, XP/level, continue learning, daily quest, recommended
  practice, top learners), learning islands from `/student/world`, course pages, course
  search, the lesson player (text, images, video with progress reporting, audio, documents,
  callouts, examples, code, quizzes, external links; unknown types degrade gracefully), the
  quiz engine (all six question types, timer, server grading and review), the game engine
  (every seeded game: multiple choice, the Code City robot, the Launch Lab), quests, achievements,
  badges, and **Kai** (tab + in-lesson sheet).
- **Parents:** linked children only, KPIs, weekly activity, subjects, insights, assignments, activity feed.
- **Teachers:** dashboard (KPIs, to-do, skill gaps), classes and rosters with student health,
  content library, and the **upload → review → publish** workflow.
- **School leaders:** server-side aggregate dashboard. District admins see an honest
  "coming soon" because the API has no district endpoints yet.
- **Offline:** lessons you opened are cached on the device and shown only when the network
  fails (never to bypass a refusal); content completions are queued with idempotency keys
  and replayed when you're back online. Rewards and grades are always decided by the server.
- **Feel:** an animated splash (Kai the owl bounces in and spells "Kidora", picking up
  seamlessly from the native splash), springy "3D" buttons and cards, cards that slide in,
  a hopping-owl loader, bouncing tab icons, shaking form errors, bouncing island nodes,
  animated progress bars, confetti, shake-on-miss, haptics and small generated sounds.
  All of it calms down with the OS "reduce motion" setting or the switch in Settings.

## Run it

```bash
cd apps/mobile
npm install
cp .env.example .env          # public values only (see below)
npx expo start                # then press "a" for Android or "i" for iOS
```

The app uses native modules (SecureStore, SQLite, video, audio), so use a **development
build**, not Expo Go:

```bash
npx eas-cli@latest build --profile development --platform android   # once
npx expo start --dev-client
```

Local API instead of production: put `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000/api` in `.env`
(the Android emulator's address for your computer's localhost; use your computer's LAN IP on a
real phone). Build profiles in `eas.json` carry the production values, so `.env` never ships.

## Environment: public values only

`EXPO_PUBLIC_*` values are compiled into the app and readable by anyone who downloads it.

| Variable | Example |
|---|---|
| `EXPO_PUBLIC_API_URL` | `https://api.justkidora.com/api` |
| `EXPO_PUBLIC_WEB_URL` | `https://justkidora.com` |
| `EXPO_PUBLIC_APP_SCHEME` | `kidora` (must match `scheme` in `app.json`) |

Never add `DATABASE_URL`, JWT secrets, OAuth client secrets, SMTP/Twilio/PayPal/Stripe/AI
keys or the internal AI-service URL. The app has no use for them: the API holds every secret.

## Checks

```bash
npm run typecheck     # tsc --noEmit (strict, noUncheckedIndexedAccess)
npm run lint          # eslint-config-expo, including the React Compiler rules
npm test              # jest-expo: 57 tests
npx expo export --platform android --platform ios   # proves both bundles build
```

## Build and release

```bash
npx eas-cli@latest login
npx eas-cli@latest build --profile preview --platform android      # installable APK for testing
npx eas-cli@latest build --profile production --platform all       # store builds
npx eas-cli@latest submit --profile production --platform android
```

Before the first store release:
1. Deploy the two API changes in `docs/BACKEND_CHANGES.md` (social sign-in from the app,
   draft video uploads).
2. Check the Kidora owl art in `assets/` (icon, splash, Android adaptive + monochrome icon, favicon).
   It is drawn in code: edit `scripts/render-brand.js` and run
   `node scripts/render-brand.js /tmp/brand` (needs Playwright), then copy the PNGs into `assets/`.
3. Google Play: complete the **Families** policy and Data safety form. Apple: answer the
   **Kids Category** questions and age rating.
4. Run the app against staging first, and check every role with a real account.

## Project layout

```
src/
  app/                 routes (Expo Router)
    (auth)/            sign-in, sign-up, verify, phone, forgot, reset
    (app)/             signed-in area
      (student)/       tabs: home, islands, games, tutor (Kai), me
      (parent)/        tabs: family, activity
      (teacher)/       tabs: teach, classes, library
      (school)/        school dashboard
      lesson/ quiz/ game/ play/ course/ class/   shared detail screens
      kai.tsx upload.tsx settings.tsx role.tsx
  api/                 typed client + one module per domain
  features/            screen building blocks (lessons, quiz, games, ai-tutor, auth…)
  components/          design system (ui.tsx, Confetti, CodeInput…)
  offline/             SQLite cache, sync queue, NetInfo-driven sync
  stores/              auth session, settings
  theme/ utils/ hooks/ config/
tests/                 Jest tests
docs/                  capability report, backend changes, API contracts
```
