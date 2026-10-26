# Kidora backend capability report (for the mobile app)

Read from the code in `kidora-api/src` (controllers, DTOs, services, Prisma schema), not
inferred from environment variables. "Live" means the code path exists and the app calls it.
Production behaviour still depends on configuration (Twilio, SMTP, OAuth keys, AI provider),
so check those with a real account.

| Feature | Existing endpoint / module | Current status | Mobile integration | Missing backend work |
|---|---|---|---|---|
| Email + password sign-in | `POST /auth/login` (`auth/`) | Live; 403 bodies carry the code step | Done: sign-in screen, MFA prompt, verify step | — |
| Registration (optional phone) | `POST /auth/register` | Live; SMS if phone, else email | Done: phone optional for every role | — |
| Email / SMS verification | `/auth/email/verify\|resend`, `/auth/phone/verify\|resend` | Live | Done: one code screen (4 or 6 digits, autofill) | SMS→email fallback is in PR #1 (not merged) |
| Phone OTP log-in | `/auth/phone/login`, `/auth/phone/login/verify` | Live, needs Twilio | Done | Twilio cannot reach +251 from the US number (error 21612) |
| Forgot / reset password | `/auth/password/forgot`, `/auth/password/reset` | Live (SMS or email) | Done | — |
| MFA (TOTP) | `/auth/mfa/setup\|enable`, `mfaCode` on login | Live | Sign-in with code done; setting up MFA stays on web | — |
| Token refresh / logout | `/auth/refresh` (single-use rotation), `/auth/logout` | Live | Done: single-flight refresh, SecureStore, safe logout | — |
| Google / Facebook sign-in | `/auth/{google,facebook}`, `/auth/oauth/exchange`, `/auth/firebase` | Live for the website only | Done (system browser + PKCE) | **Added**: `?client=app` return to `kidora://`, PKCE-bound codes. Deploy needed |
| TikTok sign-in | `tiktokId` column only | Not implemented (provider rejected) | Not offered | Strategy + callback if wanted |
| Role choice after social sign-up | `POST /auth/role` | Live; school roles need verification | Done | — |
| Student dashboard | `GET /student/dashboard` | Live | Done: home screen | — |
| Learning islands | `GET /student/world` (worlds, nodes, statuses) | Live | Done: island picker + lesson path | — |
| Courses / enrolment | `/learning/browse`, `/learning/courses/:id`, `/enroll` | Live | Done | — |
| Lesson player | `GET /learning/courses/:c/lessons/:l` | Live (17 content types) | Done: all types; unknown types degrade | Strip `checkpoints[].correct` for students |
| Lesson / content progress | `/learning/content/:id/complete\|progress`, `/learning/lessons/:id/complete` | Live, idempotent rewards | Done; content completions queue offline | — |
| Quizzes | `/lms/quizzes/:id`, `/attempts`, `/lms/attempts/:id/submit` | Live, server grading, 6 types | Done: all 6 types, timer, review | — |
| Exams | `/lms/exams/:id/attempts` | Live | Not in app yet (BOSS nodes open the course) | — |
| Assignments | `/student/assignments`, submit | Live | Listed; hand-in stays on web | Mobile file submission UI |
| Games | `/games`, `/games/:slug`, sessions, attempt, hint, complete | Live, server-scored, idempotent XP | Done: one engine for all 5 games / 3 challenge kinds | No role guard (any role earns XP) |
| Game recommendations / mastery | `/games/recommendations`, `/games/progress` | Live | Done (home "Practice for you") | — |
| Number Quest, Math Match, Sequence Builder, Memory Match, Listening Challenge, Teacher-Created Challenge | — | **Do not exist as content** | Engine ready for new challenge kinds | Seed real, reviewed content + new checker kinds (ORDER, PAIRS, AUDIO_MC). The app must not invent official questions |
| XP, levels, coins | `RewardsService` (LMS), `/rewards` wallet | Live, keyed grants | Done (read-only in the app) | — |
| Quests | `/student/quests`, `/claim` | Live, once per quest | Done | — |
| Achievements / badges | `/student/achievements`, `/student/badges` | Live | Done | — |
| Missions (legacy) | `/missions`, `POST /missions/:id/complete` | **Unsafe**: client can self-award | Not used | Remove or verify progress |
| Leaderboard | `/student/leaderboard` | Live | Done (home, top 5) | — |
| Avatar / shop | `/avatar`, `/avatar/items`, `/rewards/purchase` | Live; no ownership check on equip | Not exposed yet | Ownership check before equip |
| Kai AI tutor | `POST /lms/ai/tutor`, `GET /lms/ai/tutor/history` | Live; daily limit; 503 when provider down | Done: tab + in-lesson sheet, quick actions, PII scrub | One AI service instead of three |
| Teacher AI (lesson plans, quiz drafts) | `/ai/teaching/*` | Live | Not in app | Drafts must stay drafts (they are not auto-published) |
| Parent dashboard | `/parent/dashboard`, `/parent/children/:id/*` | Live; ParentStudent links enforced | Done: switcher, KPIs, week, subjects, insights, activity | Child-linking flow (codes) not exposed in API for parents |
| Teacher dashboard / classes / students | `/teacher/dashboard`, `/classes`, `/classes/:id`, `/students` | Live (TEACHER only) | Done | — |
| Content library | `/teacher/resources`, `/uploads/library` | Live; library upload buffers in memory | Done: list, upload, attach to lesson | Disk storage for library uploads |
| Lesson video upload | `/uploads/presign`, `PUT /uploads/direct/:token`, `/uploads/complete`, `/uploads/videos/:id/status\|retry` | Live, streaming | Done: progress, cancel, processing status, retry | **Added**: `status: DRAFT` on complete. Deploy needed |
| Review & publish | `PATCH /authoring/content/:id/status/:status`, `PATCH /teacher/resources/:id/attach` | Live, author-checked | Done: explicit "Publish to students" | — |
| PDF text extraction, transcription, AI lesson generation from uploads | — | Not implemented (only video processing exists) | — | Processing jobs; AI output must be saved as drafts |
| School dashboard | `/school/dashboard`, `/school/analytics` | Live (needs a linked school) | Done: aggregates only | — |
| District dashboards | — | **None** | Honest placeholder | Aggregated district reports with small-group suppression |
| Payments | `/payments/*` (PayPal sandbox, Chapa, Stripe), `/subscriptions` | Live on web | **Not in app on purpose** | App-store rules for digital goods in kids' apps need a decision first (see below) |
| Notifications | `/notifications`, `/lms/notifications` | Live (in-app list) | Not in app yet | Push tokens (Expo push) endpoint |
| Offline | — | n/a | Done: lesson cache (network-failure only), idempotent queue for completions | Server-side `Idempotency-Key` support (the app already sends one) |

## Payments: a decision for you

Selling Kidora plans inside an iOS/Android app normally has to go through Apple/Google in-app
purchases. PayPal or Chapa checkout from inside the app can get it rejected, and Kids-category
apps have extra limits on purchase flows. So the app shows no prices and no checkout yet,
and the website keeps payments. Tell me which way you want to go: keep it web-only, or add
store in-app purchases backed by server receipt checks.
