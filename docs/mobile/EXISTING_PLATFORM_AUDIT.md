# Kidora platform audit (for the mobile app)

**Audited:** 2026-11-09. **Sources read:** `beri12/kidora@bd922b3` (`main`, plus the 10 other
branches checked for mobile-related changes) and this repository (`beri12/kidora-mobil`).
**Not done:** the live site (`justkidora.com`) and live API could not be reached from the audit
environment, and no production data was touched. Everything below comes from source code; the
production deployment may differ from `main`.

No secrets are reproduced here. Environment variable *names* are mentioned only where the
mobile app's behaviour depends on them.

## 1. Existing architecture

| Part | Where | Stack |
|---|---|---|
| API | `kidora/kidora-api` | NestJS 11, Prisma 6 (PostgreSQL, `@prisma/adapter-pg`), Redis (`ioredis`, cache + Socket.IO adapter), Passport (JWT, Google, Facebook), Firebase Admin (alt. social sign-in), `@nestjs/throttler` (global 120 req/min + tighter per-route limits), Swagger at `/api/docs`, Socket.IO gateways (chat) |
| Website | `kidora/kidora-web` | Next.js (app router: `(auth)`, `student`, `kid`, `parent`, `teacher`, `school`, `games`, `ai-tutor`, `avatar`, `rewards`, `pricing`, `payment`…), Tailwind |
| AI service | `kidora/apps/ai-service` | Python (FastAPI-style `app/`), internal only; the API calls it, clients never do |
| Deploy | `docker-compose.production.yml`, `deploy/nginx`, `DEPLOY.md` | Containers behind nginx; images built by a GitHub workflow |
| Mobile | this repo, at the root (not `apps/mobile`) | Expo SDK 58, RN 0.88, React 19.3, Expo Router, TanStack Query, Zustand, RHF + Zod |

The prompt's mentions of BullMQ: there is **no BullMQ** in `kidora-api/package.json`; background
work (video processing) runs in-process. Do not plan mobile features around a job queue that
does not exist.

## 2. Database entities (Prisma, 78 models, 47 enums, 21 migrations)

Grouped by what the app needs:

- **Identity:** `User` (role enum: `CHILD` = student, `PARENT`, `TEACHER`, `SCHOOL_ADMIN`,
  `SCHOOL_LEADER`, `DISTRICT_ADMIN`, `SUPER_ADMIN`, `ADMIN`), `RefreshToken`, `Session`,
  `LoginHistory`, `SocialAccount`, `OrgAccessRequest`, `ChildProfile`, `ParentStudent`.
- **Organisation:** `District`, `School`, `SchoolSettings`, `Grade`, `SchoolClass`,
  `ClassEnrollment`, `ClassTeacher`, `ClassCourse`, `Attendance`.
- **Learning:** `Subject`, `Course` (with `accessCode`, `access`: public/school/premium),
  `Section`, `Lesson`, `LessonContent` (17 content types, `status` DRAFT/PUBLISHED/ARCHIVED),
  `LessonActivity`, `ContentProgress`, `Progress`, `CourseEnrollment` (`source` incl.
  `ACCESS_CODE`), `CoursePrerequisite`, `LearningOutcome`, `LearningPath`, `Certificate`,
  `VideoAsset`, `UploadSession`, `Resource`.
- **Assessment:** `Quiz`, `QuizQuestion`, `QuizAttempt`, `QuizAnswer`, `Exam`, `Assignment`,
  `AssignmentSubmission`, `PeerReview`.
- **Gamification:** `RewardWallet`, `Transaction`, `StreakLog`, `Badge`, `UserBadge`,
  `Achievement`, `UserAchievement`, `Mission`, `StudentMission`, `Avatar`, `AvatarItem`,
  `Inventory`, `Pet`, `StudentSkill`.
- **Games:** `Game` (slug, world, subject, grade range, badge), `GameLevel`, `GameChallenge`
  (kinds: multiple choice, code robot, launch lab), `GameSession`, `GameAttempt`.
- **Learning worlds:** enum `World` = `READING_FOREST`, `MATH_ISLAND`, `SCIENCE_PLANET`,
  `CODING_CITY`, `ART_VALLEY`, `HISTORY_WORLD`. The "Creative World" the brief mentions exists
  as `ART_VALLEY`.
- **AI:** `AIConversation`, `AIUsage` (daily limits).
- **Other:** `Notification`, `Conversation`/`Message` (chat), `CalendarEvent`, `SupportTicket`,
  `Subscription`, `SubscriptionPlan`, `Payment`, `ActivityEvent`, `AuditLog`.

**Not in the schema:** device push tokens, game engine/delivery/version/approval metadata,
game partners, external game session tokens, client event IDs for idempotency, parental-consent
records.

## 3. Authentication flow

- `POST /auth/login` (alias `/auth/email/login`) → `{ user, accessToken, refreshToken }`. 403
  bodies carry `EMAIL_NOT_VERIFIED` / `PHONE_NOT_VERIFIED` with a pending verification step;
  401 `MFA_REQUIRED` when TOTP is on.
- Access token: JWT, `JWT_ACCESS_TTL` default **900 s**. Refresh token: JWT with a row id,
  `JWT_REFRESH_TTL` default **7 days**, **single-use rotation** (replaying a spent token revokes
  the family). The mobile client therefore runs exactly one refresh at a time.
- Registration (`/auth/register`) verifies by email or SMS code; phone OTP log-in exists;
  forgot/reset by email or SMS; reset ends other sessions.
- Social: `GET /auth/{google,facebook}` → provider → callback → **always redirects to
  `${WEB_URL}/auth/callback#code=…`** → `POST /auth/oauth/exchange { code }`. There is no path
  back to the app. Also `POST /auth/firebase` (Firebase ID token). See §8.
- Role choice for social sign-ups: `POST /auth/role`; school roles go through an
  `OrgAccessRequest` approved by an admin.
- Mobile storage: tokens only in SecureStore (`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`).

## 4. API endpoints

304 route handlers across 49 controller files. The full list with the mobile mapping is in
`API_INTEGRATION_MAP.md`. Every endpoint the app currently calls was checked against the
controllers: **all exist**.

## 5. Role permissions (as enforced in the API)

| Area | Guard | Notes |
|---|---|---|
| `/student/*`, `/learning/*`, quizzes | `CHILD` | Lessons require enrolment; content must be `PUBLISHED` |
| `/courses/access-code/join` | service checks `CHILD` | 10 wrong codes/hour per student + 10/min per IP |
| `/parent/*` | `PARENT` | Only children linked by `ParentStudent` or own `ChildProfile` (403 otherwise) |
| `/teacher/*` | `TEACHER` | Only own classes |
| `/school/*` | school roles with a `schoolId` | Aggregates; 403 if no school |
| `/authoring/*` | course author/instructor | Per-course checks in the service |
| `/games*` | JWT only | **Any role** can play and earn XP (see §9) |
| `/admin/*` | `ADMIN`/`SUPER_ADMIN` | Not used by the app |

Authorization is server-side throughout; the app's role-based navigation only decides what to
show and is not relied on for access control.

## 6. Features that can be reused as-is

Auth (all flows except social-to-app), student dashboard/world/quests/achievements/badges/
leaderboard, course browse/detail/enrol, **join by access code**, lesson player payload, content
and lesson completion (idempotent upserts and keyed reward grants), quizzes and exams (server
grading, one submit per attempt), games (server-scored sessions, no solutions sent, idempotent
completion, minimum-time anti-farming), Kai via `/lms/ai/tutor` (daily limit, lesson context,
history), parent dashboard/children/activity/progress/assessments, teacher dashboard/classes/
students/gradebook/resources, school dashboard/analytics, uploads (streaming presign flow),
notifications list, certificates, calendar.

## 7. Missing mobile-specific capabilities

| Capability | State | Needed for |
|---|---|---|
| Social sign-in returning to the app | Missing (redirect only to web) | Google/Facebook in the app |
| `status: DRAFT` on `/uploads/complete` | Missing (field silently stripped) | Teacher video review step |
| Push notifications | No device-token model or endpoint | Phase 6/7 |
| Parent–child linking from the parent side | No endpoint (links made by admins/schools/child profiles) | Parent onboarding |
| Client event IDs / `Idempotency-Key` | Not read anywhere | Offline queue beyond naturally idempotent routes |
| Game manifest fields (engine, delivery, version, devices, offline, approval) | Missing on `Game` | Game launcher, partner games |
| External game sessions / partner SDK | Missing | Phase 3 |
| Simulations | No model or content | Phase 5 |
| Downloadable lesson packages / content versions for offline | Missing | Phase 4 |
| Localised content and server messages (Amharic) | Server messages are English only | Full Amharic experience |
| Account deletion request | Not found | Store policy (both stores require it) |

## 8. Integration gaps found in this audit

1. **Social sign-in in the app could not finish.** The app showed Google/Facebook buttons
   whenever the provider was configured; production would land the child on the website.
   *Fixed in the app:* buttons appear only when `/auth/providers` advertises
   `appClient.pkce` (`src/features/auth/providers.ts`). Backend change still required.
2. **Draft video uploads were not drafts.** The app sends `status: 'DRAFT'`; the API's
   `ValidationPipe({ whitelist: true })` strips it and creates the item `PUBLISHED`, while the
   app told the teacher "students can't see it yet". *Fixed in the app:* the returned status is
   checked and the item is put back to `DRAFT` via `PATCH /authoring/content/:id/status/DRAFT`;
   if that fails the teacher is told it is live. There is still a window of a few hundred ms in
   which the item is published; only the backend change closes it.
3. `docs/mobile/BACKEND_CHANGES.md` previously described both API changes as made. They are not
   in the repository on any branch. The document now says so.
4. Offline queue sends `Idempotency-Key`, which the API ignores. Safe today only because the
   queued route (`/learning/content/:id/complete`) is an upsert; but each replay rewrites
   `completedAt` with the sync time, so "completed at" is the time it synced, not the time the
   child finished.
5. Course join by teacher code existed in the API and website but not in the app. *Added.*
6. No district endpoints; `DISTRICT_ADMIN` without a school gets 403 (app shows a placeholder).

## 9. Security concerns

| # | Finding | Evidence | Severity | Recommendation |
|---|---|---|---|---|
| S1 | `POST /missions/:id/complete` marks a mission complete and grants its reward without checking progress | `economy/economy.controller.ts:18`, `economy.service.ts completeMission` | High (XP/coin farming) | Verify progress server-side or remove; app never calls it |
| S2 | `/games*` has no role guard | `games.controller.ts` (`JwtAuthGuard` only) | Medium | Restrict session creation/XP to `CHILD` if that is the intent |
| S3 | Draft upload status ignored | §8.2 | Medium (unreviewed content shown to children) | Ship backend change 2 |
| S4 | `POST /uploads/library` buffers up to the largest limit in memory | `lms/uploads/uploads.controller.ts:70` | Medium (memory exhaustion) | Disk/stream storage |
| S5 | `PUT /avatar` updates fields without an ownership check on items | `avatar.service.ts update` | Low (free cosmetics) | Check inventory |
| S6 | Lesson payload may include `checkpoints[].correct` | Not confirmed in this audit | Unknown | Re-check the student video select |
| S7 | Bonus "wheel" after game levels gives a random XP/coin reward | `games.service.ts BONUS_WHEEL` | Product review | Free and earned only (not gambling), but random rewards for children deserve a product decision against the brief's "no manipulative reward systems" |
| S8 | Three AI tutor routes with different shapes (`/ai/chat`, `/ai/tutor/chat`, `/lms/ai/tutor`) | `ai-tutor/`, `modules/ai/`, `lms/ai/` | Maintenance / inconsistent safety | Converge on `/lms/ai/tutor` |
| S9 | No account-deletion workflow found | — | Store compliance (COPPA/GDPR-K, Play Families, Apple Kids) | Add a deletion request flow + parental consent records |

Mobile side (already in place, re-checked): no secrets in `EXPO_PUBLIC_*`, tokens only in
SecureStore, single-flight refresh, writes never auto-retried, RECORD_AUDIO and overlay
permissions blocked on Android, query cache cleared on sign-out.

## 10. Recommended implementation sequence

1. **Backend first (small, unblock real features):** change 1 (social PKCE + `appClient`
   advert), change 2 (`status: DRAFT`), S1 and S2. All backward compatible.
2. Phase 1 completion in the app: translate the remaining screens; Amharic copy review by a
   native-speaking educator; dark theme decision; tab naming decision (see
   `IMPLEMENTATION_PLAN.md`).
3. Phase 2: exams, assignments hand-in, certificates, avatar (after S5).
4. Phase 3: game manifest migration (additive columns on `Game`), external session tokens,
   `packages/game-sdk`, first Three.js game in a sandboxed WebView with a narrow token.
5. Phase 4: server-side `Idempotency-Key` (Redis, 24 h) + `clientCompletedAt` on completions,
   then lesson download packages.
6. Phases 5–7 as in the plan.
