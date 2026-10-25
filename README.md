# RedfoxGPU — Wishlist & Demand-Validation Platform

A production-quality Next.js site for **RedfoxGPU**, a proposed Ethiopian GPU cloud
service. It is a *demand-validation* tool, not a storefront: there is no pricing,
no capacity for sale, and no fabricated usage statistics anywhere on the site.

The app has two jobs:

1. **Explain the proposition** through a single landing page with distinct,
   purpose-built sections.
2. **Collect a structured wishlist application** through a one-question-at-a-time
   survey with conditional branching, then persist one row per email address to
   Supabase. Repeat submissions from the same address are rejected.

> **Honesty by design.** The confirmation dialog only appears after the server
> confirms the row was written. If storage is not configured or the insert fails,
> the applicant sees a real error with a retry action and **their answers are kept**.

---

## Table of contents

- [Stack](#stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Supabase setup](#supabase-setup)
- [Scripts](#scripts)
- [API contract](#api-contract)
- [How the survey works](#how-the-survey-works)
- [Project structure](#project-structure)
- [Editing content](#editing-content)
- [Security & privacy posture](#security--privacy-posture)
- [Rate limiting](#rate-limiting)
- [Analytics](#analytics)
- [Deployment](#deployment)
- [Accessibility, motion & performance](#accessibility-motion--performance)
- [What has been verified](#what-has-been-verified)
- [Known limitations](#known-limitations)

---

## Stack

| Concern         | Choice                                                        |
| --------------- | ------------------------------------------------------------- |
| Framework       | Next.js 16 (App Router), React 19, TypeScript 5.9             |
| Styling         | Tailwind CSS v4 (CSS-first `@theme` tokens, no config file)   |
| Motion          | Framer Motion 14                                              |
| 3D              | Three.js + `@react-three/fiber` (procedural, no asset files)  |
| Icons           | `lucide-react`                                                |
| Validation      | Zod 4 (shared by client and server)                           |
| Database        | Supabase (PostgreSQL) with Row Level Security                 |
| Testing         | Vitest                                                        |
| Lint / types    | ESLint 10 (`eslint-config-next`) + `tsc --noEmit`             |

No Redux, no global state library, no form library, no third-party analytics
dependency. State for the survey lives in a single component.

---

## Getting started

Requirements:

- **Node.js 20.9 or newer** (Next.js 16 minimum); 22 LTS recommended.
- npm (a `package-lock.json` is committed).

```bash
npm install
cp .env.example .env.local   # then fill in Supabase values (see below)
npm run dev                  # http://localhost:3000
```

The site runs **without any Supabase credentials**. In that state the survey is
fully usable, but submitting returns an honest `503 service_unconfigured` and the
UI shows the error panel with a retry button — it never fakes success.

---

## Environment variables

Copy `.env.example` to `.env.local` for local development and set the same names
in your host (e.g. Vercel → Settings → Environment Variables). **Never commit real
keys.**

| Variable                        | Required | Where       | Purpose                                                                                  |
| ------------------------------- | -------- | ----------- | ---------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes\*    | Client+SRV  | Supabase project URL.                                                                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes\*    | Client+SRV  | Public anon key. Currently unused by the frontend (anonymous DB access is denied) but part of a complete Supabase setup. |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes\*    | **Server**  | Insert key used by `POST /api/wishlist`. Never expose to the browser.                      |
| `NEXT_PUBLIC_SITE_URL`          | No       | Client+SRV  | Absolute site URL for canonical links, sitemap and OG metadata. Falls back to the Vercel URL, then `http://localhost:3000`. |
| `NEXT_PUBLIC_CONTACT_EMAIL`     | No       | Client      | Public contact address in the footer and privacy notice. Defaults to `contact@redfoxgpu.com`. |
| `NEXT_PUBLIC_ANALYTICS_ENDPOINT`| No       | Client      | Optional analytics sink. Empty disables forwarding.                                       |
| `UPSTASH_REDIS_REST_URL`        | No       | **Server**  | Distributed rate limiting (Upstash REST).                                                |
| `UPSTASH_REDIS_REST_TOKEN`      | No       | **Server**  | Distributed rate limiting (Upstash REST).                                                |

\* Required only if you want submissions to be persisted. Without them the app
still builds and serves, and submissions fail honestly.

> **Founder action:** `NEXT_PUBLIC_CONTACT_EMAIL` defaults to a placeholder
> address. Set it to a mailbox you actually monitor before launch. No office
> address, phone number or legal registration is claimed anywhere on the site.

Secrets are read only on the server. The service-role key is never imported into
any client component, and a build-time check confirmed it is absent from
`.next/static`.

---

## Supabase setup

1. Create a Supabase project.
2. Open the **SQL editor** and run
   [`supabase/migrations/0001_wishlist_applications.sql`](supabase/migrations/0001_wishlist_applications.sql).
   It is **idempotent** — re-running it drops and recreates the CHECK constraints,
   adds/removes survey columns, and upgrades tables created by earlier revisions.
   (With the Supabase CLI: `supabase db push`.)
   Existing deployments that already applied an earlier revision can run
   [`0002_survey_updates.sql`](supabase/migrations/0002_survey_updates.sql)
   instead; it applies the same survey schema update without touching RLS.
3. Copy the project URL, anon key and `service_role` key into your environment.

The migration creates `public.wishlist_applications` with:

- enum-style `CHECK` constraints for every coded answer (kept in sync with the
  survey config — a unit test asserts parity);
- multi-select storage for `gpu_workloads`, with a required free-text value when
  the **Other** workload is selected;
- required free-text checks for every **Other** / **Custom** choice, including
  custom GPU memory and usage frequency;
- a **branch-consistency** constraint: when `used_gpu_cloud = true` the
  `providers_used` and `previous_service_problems` arrays must be non-empty and
  `adoption_barriers` must be empty, and vice versa;
- an email normalisation constraint (`email = lower(btrim(email))`);
- a **unique email index** — one application per address; the API returns `409`
  with a field-level message instead of creating a duplicate;
- indexes for administrative analysis (including a GIN index on `gpu_workloads`);
- an `updated_at` trigger;
- **RLS enabled with no policies for `anon`/`authenticated`** (default-deny), and
  `REVOKE ALL` from `public`/`anon`/`authenticated`. Only the `service_role`
  (which has `BYPASSRLS`) can read or write.

All writes go through the server route handler using the service-role key.

> **Existing project?** Re-run the migration after pulling this change to add the
> unique email index and apply the survey schema update. If the table already
> contains duplicate addresses, the migration stops with a clear message instead
> of deleting applicant data; resolve those rows first, then re-run it. The survey
> update removes the retired budget and early-access-intent columns, so export
> those answers first if you need them for historical reporting.

---

## Scripts

```bash
npm run dev        # start the dev server
npm run build      # production build
npm run start      # serve the production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest (run once)
npm run test:watch # Vitest (watch)
npm run verify     # lint + typecheck + tests
```

`npm run verify` is the quick gate; run `npm run build` before shipping.

---

## API contract

### `POST /api/wishlist`

Request: `Content-Type: application/json`, body ≤ 16 KB.

```jsonc
{
  "fullName": "Hanna Bekele",
  "email": "hanna@example.com",
  "userType": "ai_startup",              // stable enum id
  "userTypeOther": "…",                  // required when userType = "other"
  "gpuWorkloads": ["llm_inference", "image_generation"],
  "gpuWorkloadOther": "…",               // required when "other" is selected
  "vramRequirement": "24_48gb",
  "vramRequirementOther": "…",           // required when vramRequirement = "custom"
  "usageFrequency": "daily",
  "usageFrequencyOther": "…",            // required when usageFrequency = "other"
  "usedGpuCloud": true,
  "providersUsed": ["runpod", "other"],  // when usedGpuCloud = true
  "providersOther": "…",                 // required when "other" is selected
  "previousServiceProblems": ["price"],
  "previousServiceProblemsOther": "…",
  "adoptionBarriers": [],                // when usedGpuCloud = false
  "adoptionBarriersOther": "…",
  "currentComputeSolution": "own_computer",
  "currentComputeSolutionOther": "…",
  "etbPaymentPreference": "yes",
  "honeypot": "",                        // abuse signal, never persisted
  "elapsedMs": 42000                     // abuse signal, never persisted
}
```

Success — **only after the row is written**:

```json
{ "ok": true, "application": { "id": "8f1c…" } }
```

Failure shape:

```json
{
  "ok": false,
  "error": {
    "code": "validation_failed",
    "message": "Please check the highlighted answers and try again.",
    "fieldErrors": { "email": "Enter a valid email address" },
    "requestId": "3b2a…"
  }
}
```

| Status | `code`                   | Meaning                                                              |
| -----: | ------------------------ | -------------------------------------------------------------------- |
|    201 | —                        | Insert confirmed.                                                    |
|    400 | `rejected`               | Honeypot filled or the form was completed implausibly fast.          |
|    400 | `invalid_json` / `invalid_body` | Body was not readable JSON.                                   |
|    405 | `method_not_allowed`     | Anything other than `POST`.                                          |
|    413 | `payload_too_large`      | Body exceeded 16 KB.                                                 |
|    415 | `unsupported_media_type` | Missing/incorrect `Content-Type`.                                    |
|    409 | `duplicate_email`        | That email address already has an application (`fieldErrors.email`). |
|    422 | `validation_failed`      | Zod validation or conditional-logic check failed (`fieldErrors` map).|
|    429 | `rate_limited`           | Too many submissions from this connection (`Retry-After` set).       |
|    500 | `storage_error`          | The database rejected or failed the insert.                          |
|    503 | `service_unconfigured`   | Supabase env vars are missing on the deployment.                     |

Every response carries a `requestId` for support and a `Cache-Control: no-store`.

---

## How the survey works

The survey is **fully config-driven**; components contain no question copy.

- [`lib/survey/questions.ts`](lib/survey/questions.ts) — the question registry
  (prompt, options, single/multi select, optional free-text escape hatch). Option
  ids are **persisted to the database and must stay stable**; labels are display-only.
- [`lib/survey/flow.ts`](lib/survey/flow.ts) — the declarative step sequence,
  including conditional `branch` nodes, plus `nextStepId` / `previousStepId` /
  `stepForField`.
- [`lib/survey/engine.ts`](lib/survey/engine.ts) — `buildProgress`,
  `isStepAnswered`, answer pruning and the review rows.
- [`lib/validation/wishlist.ts`](lib/validation/wishlist.ts) — one Zod schema that
  both validates the payload **and** transforms it into the database row shape
  (camelCase → snake_case). The same schema runs on the client and the server.

Key behaviours:

- **One question per screen** with real radio/checkbox inputs (native keyboard
  semantics: arrows within a group, space to toggle, one tab stop per group).
- **Multi-select workloads.** The first compute question accepts more than one
  workload, and the SQL column is a text array with a GIN index.
- **Required free-text details.** Selecting **Other** or **Custom** reveals a
  text field that must be filled before continuing; the server re-checks it.
- **Conditional branching.** `usedGpuCloud = yes` routes to
  *providers used* → *problems experienced*; `no` routes to *adoption barriers*.
  Inapplicable answers are pruned on submit, and the server re-checks the same
  conditional logic.
- **Honest progress.** The rail counts only *applicable* steps. While a branch
  answer is unknown the resolver expands the **longest** path, so the percentage
  never moves backwards and never credits an unanswered question as complete.
- **Back navigation preserves answers**, including answers on a branch you later
  abandoned.
- **Review screen** lists every answer with inline edit links. Nothing is
  persisted until the applicant submits.

---

## Project structure

```
app/
  layout.tsx            Root layout, fonts, metadata wiring
  page.tsx              Landing page composition
  globals.css           Tailwind v4 @theme tokens + component classes
  privacy/page.tsx      Privacy notice
  robots.ts, sitemap.ts SEO route handlers
  opengraph-image.tsx, twitter-image.tsx, icon.svg
  api/wishlist/route.ts Thin adapter over the framework-agnostic handler
components/
  navigation/Navbar.tsx
  sections/             Hero, Workloads, HowItWorks, LocalAccess,
                        SurveySection, FinalCta, Footer
  survey/               SurveyApp + step components (Identity, Question,
                        Interstitial, Review, SuccessDialog, ProgressRail)
  ui/                   Button, Reveal, Primitives, TrackedCtaLink, DrawRule
  visuals/              GpuVisual (lazy 3D), GpuSchematic (SVG base/fallback),
                        GpuScene (interactive card), WorkloadGlyph
lib/
  config/               brand, theme, metadata, navigation, workloads
  survey/               types, questions, flow, engine, payload
  validation/           wishlist schema, env helpers
  api/                  wishlist-handler (server), wishlist-client (browser)
  supabase/admin.ts     Server-only service-role client
  rate-limit.ts         In-memory + optional Upstash limiter
  analytics/index.ts    Typed, PII-scrubbing product events
supabase/migrations/    SQL migration
tests/                  Vitest suites (flow, validation, endpoint, schema parity)
```

---

## Editing content

- **Questions / options:** edit `lib/survey/questions.ts`. Keep option ids stable
  once you have data; update the matching `CHECK` constraints in the migration if
  you add or remove values. The browser/Node parity test
  (`tests/schema-parity.test.ts`) fails if the SQL enum lists drift from the config.
- **Step order / branching:** edit `stepSequence` in `lib/survey/flow.ts`.
- **Workload marketing copy:** edit `lib/config/workloads.ts`.
- **Brand name, tagline, nav:** edit `lib/config/brand.ts` and
  `lib/config/navigation.ts`.
- **Palette / tokens:** edit the `@theme` block in `app/globals.css`.

---

## Security & privacy posture

- **No anonymous database access.** RLS is enabled with zero policies; the anon
  key cannot read or write the table even if it leaks.
- **Service-role key stays on the server** and is only used inside the route
  handler. It is not present in client bundles.
- **Strict server validation.** Every field is validated server-side against the
  same Zod schema the client uses (types, lengths, enum membership, conditional
  logic). No unvalidated value reaches the database.
- **Abuse controls:** 16 KB request cap, JSON content-type check, honeypot field,
  a minimum completion time, and rate limiting.
- **Privacy notice** at `/privacy`, linked from the footer. Identity (name/email)
  is never stored on its own — only as part of a complete application. Each email
  address can submit once; duplicates are rejected by the API and blocked by a
  unique database index.

---

## Rate limiting

The default limiter is a **per-instance in-memory fixed window** (5 requests /
10 minutes). It is a partial defence in production because serverless platforms
run many instances — it is intentionally *not* presented as production-safe.

For a real limit, set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
(free tier is sufficient). The endpoint then uses a distributed counter with the
same window; if Redis is unreachable it logs a warning and **fails open** to the
in-memory limit so a Redis outage cannot take wishlist registration down.
Caller IPs are never logged or stored — only a truncated SHA-256 hash is used as
the limiter key.

---

## Analytics

`lib/analytics` is a tiny, typed abstraction with no third-party dependency.
Events (`hero_cta_clicked`, `survey_started`, `survey_completed`,
`wishlist_submitted`, `survey_abandoned`) are pushed to a bounded in-memory buffer
(`window.__redfoxgpuAnalytics`) and — if `NEXT_PUBLIC_ANALYTICS_ENDPOINT` is set —
forwarded with `navigator.sendBeacon`. Props are restricted to non-identifying
values and scrubbed before leaving the browser; abandon events report only the
*shape* of progress (last step, counts, percent) and never answers.

---

## Deployment

Any Node host works; Vercel is the path of least resistance.

1. Push the repository and import it into Vercel.
2. Set the environment variables from the table above (Production **and**
   Preview). `SUPABASE_SERVICE_ROLE_KEY` must be a server-side value.
3. Set `NEXT_PUBLIC_SITE_URL` to the HTTPS production URL so canonical links,
   `sitemap.xml` and OG metadata are absolute.
4. Deploy. Serve over **HTTPS** — the app assumes a secure origin.
5. Run the SQL migration against the production database.

There is no admin dashboard in this project by design; applications are reviewed
in the Supabase dashboard / SQL editor.

---

## Accessibility, motion & performance

- Semantic landmarks, a skip link, visible focus styles, labelled controls, and
  `aria-live` regions for step errors and submission status.
- Real `tablist`/`tab`/`tabpanel` semantics for the workload selector with roving
  arrow-key navigation and a single focusable tab.
- Motion respects `prefers-reduced-motion`: transitions collapse to opacity-only
  and the 3D scene is not mounted at all.
- The **3D GPU** is a procedurally-built twin-fan accelerator card (no model
  downloads): the shroud, PCB and backplate are extruded from rounded profiles,
  and the model carries pitched fan blades, machined edge trim, corner fasteners,
  memory packages, VRM chokes, individual PCIe gold fingers, display outputs,
  a pinned 12V connector, copper heat pipes/cold plate and a vented backplate. It is
  lazy-loaded with `next/dynamic` (`ssr: false`), only mounted
  on ≥1024px viewports without reduced motion, started after idle, and paused when
  off-screen or when the tab is hidden. Visitors can **drag to rotate** and
  **click to explode** it into its shroud, fans, heatsink, PCB and backplate, then
  click again to reassemble. A hand-built SVG schematic (`GpuSchematic`) is always
  the base layer and the fallback, so the section is complete without WebGL.
- Brand check: the Three.js chunk is loaded lazily and is **not** referenced by
  the rendered HTML of the landing page.

---

## What has been verified

**Verified locally (no credentials required):**

- `npm run lint`, `npm run typecheck`, `npm test` (74 tests across survey flow,
  validation, the API endpoint, the submission client, and SQL↔config schema
  parity) all pass.
- `npm run build` succeeds. Routes produced: `/` (static), `/privacy`,
  `/api/wishlist` (dynamic), `/icon.svg`, `/opengraph-image`, `/twitter-image`,
  `/robots.txt`, `/sitemap.xml`.
- The running production server was exercised in a browser: the full survey was
  completed end-to-end on **both** branches (progress climbs monotonically,
  12→11 steps for the "yes" branch and 12→10 for "no"), multiple workloads and
  **Other** / **Custom** details are kept, Back/Edit preserve answers, and the
  review screen lists every answer.
- API behaviour confirmed against the live server: `201`-shaped success path is
  gated on storage; `422` for a cross-branch conflict; `400` for a filled
  honeypot; `429` with `Retry-After` when the rate limit trips; `413` for an
  oversized body; `405` for `GET`; `404` for unknown routes; and an honest
  `503 service_unconfigured` when Supabase env vars are absent.
- Client-side validation blocks empty names and malformed emails, requires at
  least one workload, and requires the opened detail field for every
  **Other** / **Custom** choice; failures surface as field-level messages.
- The **interactive 3D card** was driven with real pointer events and frames were
  read back from the canvas: dragging rotates the board, a click explodes it into
  its layers, a second click reassembles it, and the exploded spread stays inside
  the frame. The static SVG schematic renders whenever 3D is unavailable.
- The transition-only steps were removed; the survey moves directly from one
  question to the next, and no question sub-notes or extra helper copy remain.
- Lighthouse on the landing page **and** `/privacy`: **Accessibility 1.00,
  Best Practices 1.00, SEO 1.00**, with zero failed audits.
- No console warnings or errors during navigation and interaction.
- The service-role key does not appear in any client bundle.

**Verified against a live Supabase project:**

- A real submission returned `201`, and the row was read back from
  `wishlist_applications`.
- Submitting the same address again (with different casing) returned
  `409 duplicate_email` with a field-level message, and exactly one row existed.
- The test row was removed after verification.
- The service-role key is server-only; it is absent from `.next/static`.

---

## Known limitations

- The default rate limiter is per-instance only (see [Rate limiting](#rate-limiting)).
- `NEXT_PUBLIC_CONTACT_EMAIL` ships with a placeholder and must be set by the
  founder before launch.
- There is no admin UI; analysis happens in Supabase.
- There is no self-service way to change the email on an existing application;
  contact the founder if an applicant needs that.
