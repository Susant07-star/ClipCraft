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
- [x] Aligned the review counter with the maximum of three actual AI review
  passes per story version; tests cover the cap and manual-review handoff.
- [x] Split story generation/review from production generation. The story
  graph now ends at creator review, and the production graph rejects
  unapproved state.
- [x] Added the creator story workshop with editable versions, natural-language
  rewrite requests, review feedback/counts, explicit approval, and asset
  invalidation after edits.
- [x] Added automatic Supabase guest sessions, verified bearer-token API
  access, owner-filtered history reads, and per-request RLS-scoped persistence.
- [x] Extended `supabase/schema.sql` with workflow/version storage and
  owner-scoped select/insert/update/delete policies; updates check ownership
  before and after the write.
- [x] Added backend tests for the approval boundary, asset invalidation,
  review-cycle reset, AI-versus-creator approval, restart recovery, and
  unauthenticated API rejection.

## Partial — finish or verify

- [~] **Supabase deployment:** the local frontend environment was populated
  from the existing backend Supabase configuration without printing values.
  The Next.js app now has its Supabase browser config and automatically opens
  a guest session instead of requiring a login. Created and pushed
  `supabase/migrations/20261102010708_auth_owner_scoped_workflow_state.sql`
  through the Supabase CLI to the active ClipCraft project. CLI migration
  history confirms the remote migration is current. A live catalog query
  confirms RLS is enabled and forced, `anon` has no SELECT privilege, and
  authenticated access is restricted by owner-scoped policies including both
  UPDATE `USING` and `WITH CHECK`. Existing rows without `user_id` remain
  inaccessible; assign ownership only if their owner is known.
- [x] **Guest access:** the frontend now creates anonymous sessions without a
  login screen. The linked project setting was enabled through Supabase CLI
  after reviewing a diff limited to `auth.enable_anonymous_sign_ins`; a
  follow-up config diff reports no remaining changes, and the local browser
  opened the app with its guest session and history UI.
- [~] **Guest signup abuse controls:** the current project uses Supabase's
  anonymous sign-in rate limit. Configure a CAPTCHA provider before a public
  production launch and monitor Auth usage.
- [~] **Durable history live verification:** API code stores and reloads the
  complete pending workflow state through Supabase. Migration application and
  policy definitions are verified remotely; persistence across a real backend
  restart and cross-user behavior using two anonymous user sessions remain to
  be tested.

- [~] **YouTube research:** the existing YouTube Data API researcher and local
  key are present. Verify a real query, source evidence/attribution, quota or
  API failure handling, and the no-research path. Do not treat public counts
  as proof of trends or likely performance.
- [~] **SEO:** the SEO agent and package output exist. Verify platform-specific
  metadata is grounded in the approved story and does not promise performance.
- [~] **Production kit:** character, clip, thumbnail-prompt, and SEO generators
  now run only after creator approval. Duration-aware generation, per-stage
  retry controls, image-provider states, and live provider verification remain.

## Remaining — required before the MVP demo

### P0 — Creator-controlled story workflow

- [x] Add a story workshop that shows the draft, review feedback, and review
  count.
- [x] Let the creator directly edit the story or send a natural-language
  change request, then start a fresh bounded review cycle.
- [x] Add explicit **Approve story** and **Request changes** actions. Do not
  generate downstream assets just because the AI reviewer approves.
- [~] Persist and resume the pending creator decision across reloads or backend
  restarts using the authenticated Supabase record. Mocked API tests cover
  reopening a saved decision; live restart verification is blocked on applying
  the schema.
- [x] Preserve story versions and invalidate assets whenever their source
  story changes.

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

- [x] Replace the permissive `"Allow all"` policy in `supabase/schema.sql`.
- [x] Add automatic Supabase guest sessions and an ownership field for
  user-owned packages.
- [x] Add owner-scoped RLS policies for select, insert, update, and delete.
  Update checks prevent changing the owner ID.
- [x] Pass the authenticated user session through backend persistence and
  history operations.
- [x] Push the reviewed migration through the Supabase CLI; verify remote
  migration history, RLS enforcement, grants, and owner policy expressions.
- [ ] Verify users cannot read or modify another user's packages using two
  authenticated sessions.
- [x] Add project history, reopen/resume, and truthful save failures. The
  backend rejects a package save that returns no row.

### P0 — Mobile-first workflow UI

- [~] Build the story workshop and approval actions as a responsive flow;
  the creative brief and final phone/tablet/desktop layout checks remain.
- [ ] Verify layouts at 320 CSS px and common phone widths; fix horizontal
  overflow, touch targets, keyboard obstruction, and safe-area behavior.
- [ ] Keep project history and primary actions reachable on small screens;
  verify tablet and desktop layouts after the phone layout works.

### P1 — Integration, quality, and demo readiness

- [x] Run focused backend and frontend checks after workflow changes. All 17
  backend tests pass in the configured project virtualenv; TypeScript, lint on
  changed frontend files, and the production build pass.
- [~] The system Python's test run is blocked by Windows Application Control
  blocking the installed `xxhash` extension; the configured project virtualenv
  avoids that environment issue and passes the suite.
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
- [ ] Commit the remaining authenticated story workflow, Supabase migration,
  frontend configuration handling, and verification documentation using the
  user's configured Git identity without a co-author trailer.
- [ ] Push the new commit to `https://github.com/Susant07-star/ClipCraft`
  with a normal fast-forward push; do not rewrite remote history.
- [ ] Verify GitHub `main` contains the new commit and the worktree is clean.

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
