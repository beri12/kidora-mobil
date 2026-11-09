# API routes the app calls

Base: `EXPO_PUBLIC_API_URL` (production `https://api.justkidora.com/api`). Auth = `Authorization: Bearer <accessToken>`.
Error body (global filter): `{ statusCode, path, timestamp, error: { message, code?, …extra } | "message" }`;
the client reads `error.message` / `error.code` (`src/api/client.ts`).
Retry policy: only `GET` is retried (network / 5xx, twice). No write is retried automatically.

| Method | Route | Auth / role | Request → Response (main fields) | Idempotency / notes |
|---|---|---|---|---|
| POST | `/auth/login` | public | `{email,password,mfaCode?}` → `{user,accessToken,refreshToken}`; 403 `EMAIL_NOT_VERIFIED`/`PHONE_NOT_VERIFIED` with code step; 401 `MFA_REQUIRED` | — |
| POST | `/auth/register` | public | `{name,email,password,role?,phone?}` → email or phone pending | re-register with same password re-sends code |
| POST | `/auth/email/verify` · `/auth/phone/verify` | public | `{email\|phone, code}` → session + `needsRole` | code single use |
| POST | `/auth/email/resend` · `/auth/phone/resend` · `/auth/phone/login` | public | → pending (`resendIn`) | 45 s cooldown, 5/hour |
| POST | `/auth/phone/login/verify` | public | `{phone,code}` → session | — |
| POST | `/auth/password/forgot` · `/auth/password/reset` | public | `{email}` → `{channel,masked…}` · `{email,code,password}` → session | reset ends other sessions |
| POST | `/auth/refresh` | public | `{refreshToken}` → `{accessToken,refreshToken}` | **single use**; one refresh in flight |
| POST | `/auth/logout` | any | → `{ok}` | revokes refresh tokens |
| GET | `/auth/me` · `/auth/providers` | any · public | user + school/orgRequest · `{providers}` | — |
| GET | `/auth/{google,facebook}?client=app&challenge=` | browser | redirect → `kidora://auth/callback#code=` | **new**; challenge = S256(verifier) |
| POST | `/auth/oauth/exchange` | public | `{code,codeVerifier}` → session + `needsRole` | code: 60 s, single use |
| POST | `/auth/role` | any | `{role,dateOfBirth?,gradeLevel?}` → new session or `needsVerification` | once |
| GET | `/student/dashboard` · `/student/world` · `/student/quests` · `/student/achievements` · `/student/badges` · `/student/leaderboard` | CHILD | see `src/api/learning.ts` | — |
| POST | `/student/quests/:id/claim` | CHILD | → quest | granted once (server key) |
| GET | `/learning/my-courses` · `/learning/browse` · `/learning/courses/:id` | CHILD | lists / detail with `accessDecision` | — |
| POST | `/learning/courses/:id/enroll` | CHILD | → enrolment | idempotent |
| GET | `/learning/courses/:c/lessons/:l` | CHILD, enrolled | player payload | cached on device after success |
| POST | `/learning/content/:id/complete` | CHILD | → `{ok,lessonCompleted}` | safe to replay; queued offline with `Idempotency-Key` |
| POST | `/learning/content/:id/progress` | CHILD | `{positionSec,watchedDeltaSec,durationSeconds}` | delta capped by server clock |
| POST | `/learning/lessons/:id/complete?timeSpentSec=` | CHILD | → `{rewards,completion,certificate}` | second call gives 0 XP |
| GET | `/lms/quizzes/:id` | CHILD, enrolled | questions without answers | — |
| POST | `/lms/quizzes/:id/attempts` | CHILD | → attempt | returns the open attempt if any |
| POST | `/lms/attempts/:id/submit` | CHILD, owner | `{answers:[{questionId,selected?,answerText?}]}` → score, review, outcome | one submit per attempt; never auto-retried |
| GET | `/games` · `/games/:slug` · `/games/recommendations` · `/games/progress` | any | lists / levels | — |
| POST | `/games/:slug/sessions` | any | `{level}` → session + challenges (no solutions) | 30/min |
| POST | `/games/sessions/:id/attempt` | owner | `{challengeId,answer}` → `{correct,result,revealed,…}` | 409 if already solved (treated as done) |
| POST | `/games/sessions/:id/hint` · `/complete` | owner | hint step · summary (XP decided server-side) | complete is idempotent |
| GET | `/rewards` | any | wallet | read-only in app |
| POST | `/lms/ai/tutor` · GET `/lms/ai/tutor/history` | any | `{message,kind?,lessonId?,courseId?}` → `{reply,remainingToday}` | daily limit; 503 = provider down |
| GET | `/parent/children` · `/parent/dashboard?childId=` · `/parent/children/:id/activity` | PARENT | linked children only (403 otherwise) | — |
| GET | `/teacher/dashboard` · `/teacher/classes` · `/teacher/classes/:id` · `/teacher/courses` · `/teacher/lessons?courseId=` · `/teacher/resources` | TEACHER | — | — |
| POST | `/uploads/library` (multipart `file`) | TEACHER, school roles | → resource `{id,url,kind,mimeType}` | private until attached |
| PATCH | `/teacher/resources/:id/attach` | owner | `{lessonId}` | = publishing a file to a lesson |
| POST | `/uploads/presign` | course owner | `{courseId,lessonId,fileName,fileSizeBytes,mimeType}` → `{sessionId,uploadUrl,headers,direct}` | resumes an open session |
| PUT | `uploadUrl` (`/uploads/direct/:token` or S3) | Bearer if not `direct` | raw file stream | retry the same session |
| POST | `/uploads/complete` | owner | `{sessionId,title,status:'DRAFT'}` → content item + video | **`status` new**; finalises once |
| GET/POST | `/uploads/videos/:id/status` · `/retry` | owner | processing state · re-run processing | no duplicate records |
| PATCH | `/authoring/content/:id/status/PUBLISHED` | course author | → item | the review → publish step |
| GET | `/school/dashboard` | school roles with a school | aggregates | 403 when no school is linked |
