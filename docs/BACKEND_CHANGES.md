# API changes made for the mobile app

Two small, backward-compatible changes in `kidora-api`. The website keeps working exactly
as before; both changes only add an optional behaviour that the app asks for.
**They take effect only after the API is deployed** (merge the PR, wait for the
"Kidora Container Images" workflow, then `update.sh <sha>` on the server).

## 1. Social sign-in that returns to the app (PKCE-bound)

**Problem:** after Google/Facebook sign-in the API always redirected to
`${WEB_URL}/auth/callback`, so the app could never receive the result.

**Change:**
- `GET /api/auth/google?client=app&challenge=<S256 challenge>` (same for `/facebook`)
  stores the challenge in a short-lived httpOnly cookie, beside the existing state cookie.
- On the callback, if that cookie is present the API redirects to
  `${MOBILE_APP_SCHEME}://auth/callback#code=…` (default scheme `kidora`) instead of the website.
- The one-time exchange code is **bound to the challenge**: `POST /api/auth/oauth/exchange`
  then requires `codeVerifier`, whose SHA-256 must equal the challenge (RFC 7636 S256).
  If another app registered the same URL scheme and caught the redirect, it still could not
  redeem the code. A wrong verifier burns the code.
- No client secret is in the app. The provider callback URLs registered with Google and
  Facebook are unchanged (`https://api.justkidora.com/api/auth/{provider}/callback`).

**Files:** `src/auth/strategies/oauth-state.store.ts`, `src/auth/guards/optional-oauth.guard.ts`,
`src/auth/oauth.controller.ts`, `src/auth/services/oauth.service.ts`, `src/config/app.config.ts`,
`.env.production.example` (`MOBILE_APP_SCHEME=kidora`, optional).

**Tests:** `oauth.service.spec.ts` (verifier required, wrong verifier burns the code) and
`oauth-state.store.spec.ts` (marker set only for valid `client=app` requests, read once).

## 2. Lesson videos can be uploaded as drafts

**Problem:** `POST /api/uploads/complete` created the lesson's VIDEO item with the schema
default `PUBLISHED`, so in a live lesson children saw a new video before anyone reviewed it.

**Change:** `CompleteUploadDto.status?: 'DRAFT' | 'PUBLISHED'`. The app sends `DRAFT`; the
teacher previews it and publishes with the existing
`PATCH /api/authoring/content/:id/status/PUBLISHED`. Omitted: `PUBLISHED`, as before (website unchanged).

**Files:** `src/lms/uploads/dto.ts`, `src/lms/uploads/uploads.service.ts`. **Tests:** `src/lms/uploads/dto.spec.ts`.

## Not changed, but you should know (from the code review for the app)

| Finding | Where | Risk | Suggested fix |
|---|---|---|---|
| `POST /uploads/library` buffers the whole file in memory (multer memory storage, up to 500 MB) | `lms/uploads/uploads.controller.ts` | One large upload can exhaust the 1 GB server | The app sends videos through the streaming `presign → direct → complete` flow instead; switch the library route to disk storage |
| `POST /missions/:id/complete` lets a client complete a mission and take its reward | `economy/economy.controller.ts` | XP/coins farming | Verify progress server-side, or remove the route (the app never calls it; it uses `/student/quests/:id/claim`) |
| `/missions` reads a `frequency` field that doesn't exist, so daily/weekly progress shows 0 | `economy/economy.service.ts` | Wrong numbers | Use the mission `kind`; the app uses `/student/quests` |
| Lesson payload sends `checkpoints[].correct` to students | `lms/learning/learning.service.ts` | Answers visible to a curious student | Strip `correct` for students |
| `/games*` has no role guard | `games/games.controller.ts` | Teachers/parents can earn game XP | Restrict to `CHILD` if intended |
| `PUT /avatar` doesn't check item ownership | `avatar/avatar.service.ts` | Free cosmetics | Check inventory before equipping (the app doesn't offer avatar editing yet) |
| No district-level endpoints | — | District admins without a school get 403 | Add aggregated, privacy-thresholded district reports |
| Two Kai services with different shapes (`/ai/chat`, `/lms/ai/tutor`, `/ai/tutor/chat`) | `ai-tutor/`, `lms/ai/`, `modules/ai/` | Maintenance | Keep one; the app uses `/lms/ai/tutor` (daily limit, lesson context, history) |
