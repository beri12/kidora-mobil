# Mobile feature → API map

Audited against `beri12/kidora@bd922b3` (`kidora-api/src`). Wire-level request/response
details for the routes already in use are in `API_CONTRACTS.md`.

**Status:** ✅ in the app · 🟡 endpoint exists, not in the app yet · 🔴 backend work needed
(never call an endpoint marked 🔴 until it is deployed).

## Authentication and onboarding

| Mobile feature | Endpoint(s) | Status | Notes |
|---|---|---|---|
| Email/password login, MFA | `POST /auth/login` | ✅ | 403 bodies drive the verify step |
| Register (all self-signup roles) | `POST /auth/register` | ✅ | |
| Email/SMS verification | `POST /auth/{email,phone}/{verify,resend}` | ✅ | |
| Phone OTP login | `POST /auth/phone/login`, `/verify` | ✅ | Twilio reach to +251 is a config issue |
| Forgot / reset password | `POST /auth/password/{forgot,reset}` | ✅ | |
| Refresh / logout / me | `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` | ✅ | Single-use refresh rotation |
| Role choice | `POST /auth/role` | ✅ | |
| Google / Facebook in the app | `GET /auth/{p}?client=app&challenge=`, `POST /auth/oauth/exchange {code, codeVerifier}`, `appClient` in `GET /auth/providers` | 🔴 | `BACKEND_CHANGES.md` §1. Buttons hidden until advertised |
| Join a course with a teacher code | `POST /courses/access-code/join {code}` | ✅ new | Format checked on device first |
| School join code at signup | `schoolCode` on `/auth/register`, `/auth/role` | ✅ | |
| Parent links a child | — | 🔴 | No parent-initiated linking endpoint |
| MFA setup | `POST /auth/mfa/{setup,enable}` | 🟡 | Stays on web for now |
| Account deletion | — | 🔴 | Required by both stores |

## Student

| Feature | Endpoint(s) | Status |
|---|---|---|
| Dashboard (XP, level, streak, continue, quests, recommendations) | `GET /student/dashboard` | ✅ |
| Learning worlds / islands | `GET /student/world` | ✅ |
| Quests + claim | `GET /student/quests`, `POST /student/quests/:id/claim` | ✅ |
| Achievements, badges, leaderboard | `GET /student/{achievements,badges,leaderboard}` | ✅ |
| Wallet | `GET /rewards` | ✅ |
| Courses: mine, browse, detail, enrol, leave | `GET /learning/{my-courses,browse}`, `GET/POST /learning/courses/:id[/enroll]` | ✅ (leave 🟡 `DELETE …/enroll`) |
| Course progress | `GET /learning/courses/:id/progress` | 🟡 |
| Lesson player | `GET /learning/courses/:c/lessons/:l` | ✅ |
| Content/video/lesson completion | `POST /learning/content/:id/{complete,progress}`, `POST /learning/lessons/:id/complete` | ✅ |
| Lesson percent/time | `POST /learning/lessons/:id/progress` | 🟡 |
| Quizzes | `GET /lms/quizzes/:id`, `POST …/attempts`, `POST /lms/attempts/:id/submit` | ✅ |
| Exams | `POST /lms/exams/:id/attempts`, `GET /student/exams` | 🟡 |
| Assignments | `GET /student/assignments`, `POST /student/assignments/:id/submit` | 🟡 (list only) |
| Certificates | `GET /student/certificates`, `GET /lms/certificates/verify/:code` | 🟡 |
| Avatar / shop | `GET/PUT /avatar`, `GET /avatar/items`, `POST /inventory/:id/equip`, `POST /rewards/purchase` | 🟡 (wait for security fix S5) |
| Notifications list | `GET /lms/notifications`, `PATCH …/read[-all]` | 🟡 |
| Push notifications | — | 🔴 device-token endpoint + model |

## Games and simulations

| Feature | Endpoint(s) | Status |
|---|---|---|
| Game library, detail, recommendations, mastery | `GET /games`, `/games/:slug`, `/games/recommendations`, `/games/progress` | ✅ |
| Play (server-scored) | `POST /games/:slug/sessions`, `POST /games/sessions/:id/{attempt,hint,complete}`, `GET /games/sessions/:id` | ✅ |
| Teacher class mastery | `GET /games/classes/:classId/mastery` | 🟡 |
| Game manifest (engine, delivery, version, devices, offline, approval) | — | 🔴 additive columns on `Game` |
| External/partner game sessions (short-lived scoped token, events) | — | 🔴 `GameSession` extension or new module; `packages/game-sdk` |
| Simulations catalog/player | — | 🔴 no model or content |

## Kai

| Feature | Endpoint(s) | Status |
|---|---|---|
| Chat with lesson/course context, daily limit | `POST /lms/ai/tutor {message, kind?, lessonId?, courseId?}` | ✅ |
| History | `GET /lms/ai/tutor/history` | ✅ |
| Streaming | `POST /ai/chat/stream` (different service) | 🟡 not adopted: converge services first (S8) |
| Voice | — | 🔴 none; RECORD_AUDIO is deliberately blocked in the app |

## Parent, teacher, school

| Feature | Endpoint(s) | Status |
|---|---|---|
| Parent: children, dashboard, activity | `GET /parent/children`, `/parent/dashboard?childId=`, `/parent/children/:id/activity` | ✅ |
| Parent: progress, assessments, assignments, achievements per child | `GET /parent/children/:id/{progress,assessments,assignments,achievements}` | 🟡 |
| Teacher: dashboard, classes, class, students, courses, lessons, resources | `GET /teacher/*` | ✅ |
| Teacher: gradebook, assignments, submissions, grading | `GET /teacher/gradebook`, `/teacher/assignments[/:id/submissions]`, `PATCH /teacher/submissions/:id/grade` | 🟡 |
| Teacher: course access code, assign students | `GET/PATCH /courses/:id/access-code`, `POST …/rotate`, `POST /courses/:id/assign` | 🟡 |
| Teacher: upload + review + publish | `/uploads/{library,presign,complete}`, `PUT /uploads/direct/:token`, `PATCH /authoring/content/:id/status/:s`, `PATCH /teacher/resources/:id/attach` | ✅ (draft enforced client-side until §2 ships) |
| School: dashboard | `GET /school/dashboard` | ✅ |
| School: analytics, classes, teachers, students, join requests, course review | `GET /school/*`, `POST /school/join-requests/:id/{approve,decline}`, `PATCH /school/courses/:id/review` | 🟡 |
| District | — | 🔴 |

## Offline sync

| Event | Endpoint | Server idempotency today | Gap |
|---|---|---|---|
| Content completed | `POST /learning/content/:id/complete` | Upsert on `(studentId, contentItemId)` | `completedAt` = sync time; `Idempotency-Key` ignored |
| Lesson completed | `POST /learning/lessons/:id/complete` | Reward grant keyed; second call 0 XP | No client timestamp |
| Quiz submit | `POST /lms/attempts/:id/submit` | One submit per attempt | Not queued offline by design |
| Game complete | `POST /games/sessions/:id/complete` | Idempotent | Server-authoritative, online only |

## Endpoints deliberately not used

`POST /missions/:id/complete` (self-award, S1), `/progress`, `/quizzes/*`, `/lessons/*`,
`/courses` legacy routes (superseded by `/learning/*` and `/lms/*`), payments and
subscriptions (store policy decision pending, see `CAPABILITY_REPORT.md`), admin routes.
