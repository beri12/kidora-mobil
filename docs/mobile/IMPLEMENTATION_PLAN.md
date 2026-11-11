# Kidora mobile: implementation plan and running checklist

Update this file at the end of every working session. It is the hand-off between sessions:
decisions made, what is verified, what is blocked and on whom.

Legend: `[x]` done and tested · `[~]` partly done · `[ ]` not started · **B** = needs backend
work in `beri12/kidora` · **U** = needs a decision or credential from the owner.

## Open decisions for the owner (U)

1. **Backend changes:** may changes be made in `beri12/kidora` (`kidora-api`) on a branch for
   review? Phase 0 found that the two API changes the app depends on are not in that repo.
   Nothing has been changed there.
2. **Tab names:** keep Home / Islands / Games / Kai / Me, or switch to the brief's
   Home / Explore / Learn / Kai / Profile?
3. **Payments:** web-only, or store in-app purchases with server receipt validation?
4. **Bonus wheel (S7):** keep the random post-level reward for children or make it fixed?
5. **Amharic copy:** who reviews the Amharic strings (native-speaking educator)?
6. **Dark theme:** in scope for v1? The app is light-only (`userInterfaceStyle: light`).

## Phase 0 — Audit ✅ (2026-11-09)

- [x] Backend, web, AI service and schema inspected from source (`kidora@bd922b3`)
- [x] Every endpoint the app calls verified to exist
- [x] `EXISTING_PLATFORM_AUDIT.md`, `API_INTEGRATION_MAP.md`, `MOBILE_ARCHITECTURE.md`, this plan
- [x] `BACKEND_CHANGES.md` corrected (changes are *not* implemented)
- [ ] Live site / live API review — the audit environment could not reach `justkidora.com`,
      `api.justkidora.com` or `docs.expo.dev`. Repeat with network access.

## Phase 1 — Mobile foundation

- [x] Expo SDK 58 app, strict TypeScript, Expo Router in `src/app`, lint clean
- [x] Typed API client: timeouts, cancellation, GET-only retry, single-flight refresh, ApiError
- [x] Auth: login, register, verify, phone OTP, MFA code, forgot/reset, role step, logout
- [x] Tokens in SecureStore; session expiry routes to sign-in
- [x] Role-aware navigation (student / parent / teacher / school)
- [x] Student dashboard from `/student/dashboard` (no hard-coded data)
- [x] Social sign-in hidden unless the API advertises app return (was a dead end) — 2026-11-09
- [x] Course join with teacher access code — 2026-11-09
- [x] i18n foundation: English + Amharic, typed keys, Settings language picker — 2026-11-09
- [~] Screens translated: tab bars, sign-in, social buttons, settings, course search/join.
      **Remaining:** sign-up, verify, phone, forgot, reset, role, home, islands, games, play,
      lesson, quiz, course, Kai, me, parent, teacher, school, upload (≈250 strings)
- [ ] Amharic review by a native speaker (U5); test Ethiopic rendering on a low-end Android
- [ ] **B** Social sign-in to app (`BACKEND_CHANGES.md` §1), then re-enable automatically
- [ ] **B** Parent-initiated child linking endpoint, then parent onboarding screen
- [ ] Dark theme (U6)
- [ ] Teacher onboarding beyond role request (org request status screen exists on web)

## Phase 2 — Learning experience

- [x] Worlds/islands, courses, enrol, lesson player (17 types), content/video/lesson completion
- [x] Quizzes (6 types, timer, server grading, review)
- [x] XP / level / streak / quests / achievements / badges / leaderboard (read-only, server-owned)
- [ ] Exams (`/lms/exams/:id/attempts`)
- [ ] Assignment hand-in (file + text)
- [ ] Certificates list + verify link
- [ ] Course progress screen (`/learning/courses/:id/progress`), leave course
- [ ] Reward animations for level-up / badge unlock driven by server responses
- [ ] **B** Avatar editing after ownership check (S5)

## Phase 3 — Games

- [x] Game library, recommendations, server-scored native engine for all seeded games
- [x] 3D worlds (Three.js on expo-gl) for every server challenge kind: Coding City robot route,
      Science Planet launch lab, themed 3D choice scenes (Math, Reading, History, Coding, Science);
      Creative World builder (on-device, no XP); 2D fallback + Settings switch — 2026-11-11.
      See `docs/games/KIDORA_3D_GAMES.md`
- [ ] 3D on real devices (dev build; low-end Android + iPhone)
- [ ] **B** Loops / if-blocked blocks in the server grid checker, then a Repeat block in the app
- [ ] **B** Game manifest columns (engine, delivery, version, supported devices, offline,
      age, approval) — additive migration
- [ ] **B** External game session: short-lived token scoped to one session, event endpoint
      validating every event, no PII to partners
- [ ] `packages/game-sdk` + `docs/game-partners/GAME_SDK.md`
- [ ] Launcher choosing WEB / UNITY_WEBGL / DEEP_LINK / NATIVE_GAME by device capability
- [~] First Three.js experience — done natively with expo-gl instead of a WebView (above)
- [ ] **B** S2: role guard on games

## Phase 4 — Offline

- [x] Lesson cache (network failure only), content-completion queue with idempotency keys
- [ ] **B** Server honours `Idempotency-Key` (Redis, 24 h) and accepts `clientCompletedAt`
      (never moves progress backwards)
- [ ] Download manager (explicit downloads, media files, storage screen, delete)
- [ ] Sync status indicator
- [ ] Conflict rules doc: server wins for grades/XP; progress is max(percent); completion is
      monotonic

## Phase 5 — Kai and simulations

- [x] Kai tab + in-lesson sheet with lesson/course context, daily limit, history, PII scrub
- [ ] **B** Converge the three AI tutor services (S8); then streaming replies
- [ ] Voice: none in backend; would need microphone permission (currently blocked) — U
- [ ] **B** Simulations: model, content, catalog; then player

## Phase 6 — Parents, teachers, schools

- [x] Parent: children, KPIs, activity
- [x] Teacher: dashboard, classes, roster, library, upload → review → publish
- [x] School: aggregate dashboard
- [ ] Parent: per-child progress / assessments / achievements screens
- [ ] Teacher: gradebook, grading, course access codes, assignment review
- [ ] School: analytics, classes, teachers, join-request approvals
- [ ] **B** District endpoints

## Phase 7 — Hardening and release

- [x] `eas.json` profiles (development, preview APK, production)
- [x] App icon, adaptive icon, splash, favicon from the justkidora.com wordmark — 2026-11-09
- [ ] Designer-made icon art, if the brand team has one (the website ships no favicon)
- [ ] **B** Account deletion + parental consent records (store requirements)
- [ ] **B** Push token endpoint; then Expo Notifications
- [ ] Crash reporting with PII scrubbing (U: vendor)
- [ ] E2E on a staging API with test accounts (never production student data)
- [ ] Device testing: low-end Android, iPhone, tablet
- [ ] `RELEASE_READINESS.md`

## Session log

### 2026-11-09 — Phase 0 + Phase 1 gaps

Implemented:
- Audit docs (above); existing docs moved to `docs/mobile/`.
- `src/features/auth/providers.ts`: social buttons require `appClient.pkce` from
  `/auth/providers`. Before this, tapping Google/Facebook on production would end on the website.
- `src/api/uploads.ts` `enforceDraft`: a teacher's uploaded video that the server created as
  `PUBLISHED` is moved back to `DRAFT`; if that fails the screen says it is live. Before this the
  app said "students can't see it yet" for a video children could already see.
- `src/i18n/*`, `expo-localization@~58.0.5` (installed with npm at the version matching the
  other SDK 58 modules, because `expo install` could not reach `api.expo.dev`).
- `src/features/courses/JoinByCode.tsx` + `accessCode.ts` on the course search screen.

APIs reused: `GET /auth/providers`, `POST /courses/access-code/join`,
`PATCH /authoring/content/:id/status/:status`. APIs added: none. Database changes: none.

Checks run: `tsc --noEmit` ✅, `expo lint` ✅, `jest` ✅ 84/84 (was 54), `expo export` for
Android and iOS ✅ (Hermes bundles 5.3 MB each). Not run: device builds (EAS needs the owner's
Expo account), anything against the live API.

### 2026-11-09 (later) — launch fix + justkidora.com brand

Reported: launching the app showed only "Kidora" and then Expo Router's "Unmatched Route".
Cause: the app opens at `/`, and the only `/` screen was `(app)/index.tsx`, inside the
signed-in group that `Stack.Protected` removes while signed out. Fix: `src/app/index.tsx`
outside both groups redirects to sign-in, the role step, or the role's home. Also
`unstable_settings.initialRouteName` → `anchor` (deprecated in this expo-router).

Brand, taken from `kidora-web` (the website itself was unreachable from the sandbox):
- Fonts Baloo 2 (700, 800) and Nunito (600–900) via `@expo-google-fonts/*`, loaded before the
  splash hides. Every `fontWeight` in `src/` was replaced by the matching `fonts.*` family
  (Android ignores `fontWeight` on custom fonts).
- `KidoraLogo` (wordmark + star + "Learn • Play • Grow"), `AuthScreen` (gradient + floating
  shapes + white card) on all six signed-out screens; gradient on every other screen and tab.
- Sign-in copy now matches the website ("Welcome back!").
- New icon/adaptive icon/splash/favicon rendered from the real fonts.

Checked in a browser (Expo web) at 390×844: launch → `/sign-in` (was Unmatched Route), sign-up,
and a mocked sign-in → `/home` with tabs. `tsc` ✅ `lint` ✅ `jest` 84/84 ✅ `expo export`
Android + iOS ✅ (5.5 MB each, fonts ≈1.4 MB). Not checked: a real device.
