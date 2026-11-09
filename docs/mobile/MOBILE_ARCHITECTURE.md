# Kidora mobile architecture

## Decisions and why they differ from the original brief

| Brief said | What the project does | Why |
|---|---|---|
| `apps/mobile` inside the platform monorepo | The app lives at the root of its own repo, `beri12/kidora-mobil` | It already existed here; moving it would break history and CI for no gain |
| Routes in `app/` | Routes in `src/app/` | Expo Router supports both; `AGENTS.md` requires `src/app/` |
| `packages/api-client`, `contracts`, `shared-types`… | One typed client in `src/api/` | The backend is in another repository; shared packages would need publishing. Recommended next step: generate types from the API's Swagger document (`/api/docs`) into `src/api/generated/` in CI, instead of a hand-maintained package |
| NativeWind | `StyleSheet` + tokens in `src/theme` | Already consistent across 40+ files; swapping styling systems is churn without user benefit |
| BullMQ | — | Not in the backend |
| Tabs Home / Explore / Learn / Kai / Profile | Home / Islands / Games / Kai / Me | Pending product decision (see plan). Same five slots; rename is a one-file change |

## Layers

```
src/app/            screens (Expo Router). No fetch() here.
src/features/*      screen building blocks + feature logic (auth, courses, lessons, quiz,
                    games, ai-tutor, student)
src/api/            client.ts (auth header, single-flight refresh, timeouts, GET-only retry,
                    ApiError) + one module per API domain with typed request/response
src/offline/        SQLite content cache, pending-ops queue, NetInfo-driven sync
src/stores/         Zustand: auth session (tokens in SecureStore), settings (SQLite kv)
src/i18n/           typed dictionaries (en, am), resolveLanguage, useT()
src/components/     design system primitives (Screen, Button, Card, Field, states…)
src/theme/          colour, radius, spacing, type tokens; island colours
```

Data flow: screen → TanStack Query hook → `src/api/<domain>.ts` → `client.ts` → API. React Query
retries are off (the client retries GETs itself); all mutations are single-shot. Query cache is
cleared on sign-out so one account's data never shows for the next.

## Navigation and roles

`src/app/_layout.tsx` gates `(auth)` vs `(app)` with `Stack.Protected` on the session status.
`(app)/index.tsx` routes by `user.role` into `(student)`, `(parent)`, `(teacher)` or `(school)`
tab groups. This is presentation only: every endpoint enforces the role on the server.

## Internationalisation

- `src/i18n/en.ts` is the source; `Dictionary` is derived from it, so `am.ts` fails to compile
  if a key is missing, and `TKey` makes `t('…')` calls type-checked.
- Language = Settings choice, else the first supported phone language (`expo-localization`
  `useLocales()`), else English.
- Adding a language: a new dictionary file + one entry in `LANGUAGES`.
- Ethiopic script renders with the system fonts (Noto Sans Ethiopic on Android, Kefa on iOS).
  Bundling a font is deferred until the copy review: it adds bundle size and must be tested on
  low-end Android first.
- Server text (errors, course content) is English today; localising it is a backend task.

## Security model (OWASP MASVS summary)

- **Storage:** tokens only in SecureStore, device-only, after first unlock. Settings in SQLite
  kv (nothing sensitive). Lesson cache in SQLite is cleared on logout.
- **Network:** HTTPS only to the public API; no secrets in the bundle (`EXPO_PUBLIC_*` only).
- **Auth:** single-flight refresh honouring single-use rotation; failed refresh ends the session.
- **Integrity:** XP, grades, game scores and rewards are decided by the server; the app never
  sends a score.
- **Privacy:** no analytics or crash SDK yet; when added, scrub PII (Kai input is already
  scrubbed of emails/phone numbers before sending).
- **Platform:** microphone and overlay permissions blocked on Android.

## Offline

Network-failure-only cache of lessons already opened (never used to bypass a 403), and a SQLite
queue of content completions replayed on reconnect with an `Idempotency-Key`. Server-side
idempotency is required before more event types are queued (see plan, Phase 4).
