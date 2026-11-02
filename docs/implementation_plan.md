# ClipCraft Studio — Project Task Tracker

Use this file as the single progress checklist for the hackathon MVP. Product
scope and acceptance criteria remain in
[clipcraft-studio-mvp.md](./clipcraft-studio-mvp.md).

**Last reviewed:** 2026-11-02

## Status key

- `[x]` Complete and verified
- `[~]` Implemented in part; work or verification remains
- `[ ]` Not complete

## Completed

- [x] Named and scoped the MVP as **ClipCraft Studio**, a mobile-first,
  short-form story-to-video-prompt product.
- [x] Documented the creator workflow, story approval requirements, model
  limits, privacy requirements, and hackathon scope in the product spec.
- [x] Replaced the Gemini LLM integration with Meta Muse Spark Open hosted by
  Baseten. The backend adapter reads `MODEL_API_KEY`, uses the configured
  Baseten endpoint/model, and has no alternate-model fallback.
- [x] Added mocked Baseten adapter tests. The last reported run passed both
  tests; no live Baseten request has been made.
- [x] Kept Google API dependencies for YouTube Data API research only; they
  are not a Gemini integration.
- [x] Rebranded the existing app surfaces and generalized image/video prompt
  wording. The current model creates text prompts, not image or video files.
- [x] Added `backend/.env.example` and a root `.gitignore` covering local
  environment files, dependencies, build output, and Python caches. The actual
  local `.env` files are ignored and must not be committed.
- [x] Created a parentless, single-commit project snapshot locally for the
  clean-history GitHub publish. It has not yet been pushed.

## Partial — finish or verify

- [~] **YouTube research:** the existing YouTube Data API researcher and local
  key are present. Verify a real query, source evidence/attribution, quota or
  API failure handling, and the no-research path. Do not treat public counts
  as proof of trends or likely performance.
- [~] **SEO:** the SEO agent and package output exist. Verify platform-specific
  metadata is grounded in the approved story and does not promise performance.
- [~] **AI review loop:** an automatic LangGraph reviewer/writer loop exists.
  Align its counters and configured limit with the documented maximum of
  three AI review passes per submitted story version, and add tests for the
  exact boundary and manual handoff.
- [~] **Production kit:** character, clip, thumbnail-prompt, and SEO generators
  exist in the current pipeline. They currently run after AI review rather
  than after explicit creator approval.

## Remaining — required before the MVP demo

### P0 — Creator-controlled story workflow

- [ ] Add a story workshop that shows the draft, review feedback, and review
  count.
- [ ] Let the creator directly edit the story or send a natural-language
  change request, then start a fresh bounded review cycle.
- [ ] Add explicit **Approve story** and **Request changes** actions. Do not
  generate downstream assets just because the AI reviewer approves.
- [ ] Persist and resume the pending creator decision across reloads or backend
  restarts; do not rely on process-local job state as durable storage.
- [ ] Preserve story versions and invalidate assets whenever their source story
  changes.

### P0 — Creative inputs and approved assets

- [ ] Add short-form target duration and pass it through story and clip
  generation so script length, clip count, and timing are consistent.
- [ ] Generate character descriptions, sequential clip prompts, thumbnail
  prompt, and SEO only from the creator-approved story version.
- [ ] Show character and thumbnail image cards with an honest
  **image generation unavailable/not configured** state. Do not imply Muse
  Spark Open generated images.
- [ ] Clearly label clip outputs as prompts for external video tools, not
  rendered video.
- [ ] Add visible loading, per-stage errors, and retry actions; malformed or
  failed model output must not appear as a successful empty result.

### P0 — Supabase authentication and private history

- [ ] Replace the permissive `"Allow all"` policy in `supabase/schema.sql`.
- [ ] Add Supabase Auth and an ownership field for every user-owned package.
- [ ] Add owner-scoped RLS policies for select, insert, update, and delete.
  Updates must prevent changing the owner ID.
- [ ] Pass the authenticated user session through backend persistence and
  history operations; the current anon-key client and open policy are not
  sufficient for private user data.
- [ ] Apply the reviewed schema/policies to the Supabase project and verify
  users cannot read or modify another user's packages.
- [ ] Add project history, reopen/resume, and truthful save failures. Never
  report a package as saved if Supabase persistence failed.

### P0 — Mobile-first workflow UI

- [ ] Build the brief, story workshop, approval actions, and production kit as
  one clear phone-first flow.
- [ ] Verify layouts at 320 CSS px and common phone widths; fix horizontal
  overflow, touch targets, keyboard obstruction, and safe-area behavior.
- [ ] Keep project history and primary actions reachable on small screens;
  verify tablet and desktop layouts after the phone layout works.

### P1 — Integration, quality, and demo readiness

- [ ] Run focused backend and frontend checks after workflow changes. The last
  reported frontend production build passed; lint had existing errors in
  `Chatbox.tsx` and `Dashboard.tsx`.
- [ ] With approval to consume API credits, make one small live Baseten request
  and record whether the configured model ID, endpoint, access, and response
  format work. Until then, treat provider access as mock-tested, not live
  verified.
- [ ] Exercise YouTube research success, missing-key, quota/error, and direct
  creator-topic paths.
- [ ] Add a clearly labeled sample package for a demo fallback; never present
  fixtures as live model output or research.
- [ ] Add copy/download export for the approved script, prompts, and metadata.
- [ ] Do a final end-to-end demo rehearsal and verify all provider and save
  states are truthful.

## GitHub publish checklist

- [x] Configure the project snapshot to exclude `.env`, dependency folders,
  build output, and caches.
- [x] Create one parentless snapshot commit authored with the user's configured
  Git identity and no co-author trailer.
- [ ] Push that snapshot to `https://github.com/Susant07-star/ClipCraft` using
  a lease-checked history replacement. The remote still contains its current
  initial commit until this push succeeds.
- [ ] Verify GitHub `main` contains only the intended snapshot history and
  that the worktree is clean. Do not force-push if the remote changed since
  the last lease check.

## Suggested execution order

1. Finish story review limits, creator edits/change requests, and the explicit
   approval gate.
2. Add duration-aware downstream generation and honest image/video states.
3. Implement Supabase Auth, owner-scoped RLS, and saved draft resume.
4. Finish mobile layout and per-stage error/retry behavior.
5. Verify research/SEO, run focused tests, and prepare the labeled demo.
6. Publish and verify the clean-history snapshot after all intended docs and
   code are included.

## Non-negotiable project rules

- Meta Muse Spark Open through Baseten is the only language-model provider;
  never restore Gemini or add silent provider fallback.
- Keep Baseten, YouTube, and Supabase secrets out of source control, browser
  bundles, logs, screenshots, and generated package records.
- Do not claim image/video generation or automatic social publishing unless
  those integrations are separately implemented and verified.
- The creator owns all commits and pushes. Do not add an AI/agent co-author or
  publish under an AI identity.
