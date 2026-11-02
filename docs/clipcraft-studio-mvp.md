# ClipCraft Studio — MVP Product and System Spec

**Status:** Implementation brief for the remaining hackathon build
**MVP decision:** Short-form video packages only
**Primary model:** Meta Muse Spark Open, hosted through Baseten
**Human control:** The creator approves the story before production prompts are generated

## Implementation update — 2026-11-02

The story-review flow is implemented as two LangGraph boundaries: story
generation/review ends at creator review, while character, video-tool,
thumbnail, and SEO prompts run only in the separate production workflow after
the creator approves. Creators can edit a script or request an AI rewrite; each
submitted version starts a fresh three-pass review cycle, preserves prior
versions, and clears assets tied to the previous version.
An AI review pass is recorded separately from creator approval; an AI-approved
script still waits for the creator action.

Supabase guest sessions, bearer-token verification, owner-scoped API
reads/writes, and workflow/version columns and RLS policies are implemented in
the app and [`../supabase/schema.sql`](../supabase/schema.sql). The tracked
migration
[`../supabase/migrations/20261102010708_auth_owner_scoped_workflow_state.sql`](../supabase/migrations/20261102010708_auth_owner_scoped_workflow_state.sql)
has been pushed to the active ClipCraft project and its migration history,
grants, RLS flags, and owner policies were verified through the CLI. The linked
project's anonymous sign-in setting was enabled through a reviewed CLI config
push and verified with a clean follow-up diff. Guest sessions are tied to the
browser and cannot be recovered if browser data is cleared or on another
device. End-to-end cross-user isolation and durable restart behavior still
need session tests. Legacy rows with no known owner remain inaccessible rather
than being assigned speculatively.

**Interface direction:** Mobile-first responsive web app

## 1. Product summary

ClipCraft Studio turns a creator's idea and preferences into a reviewable short-form video production kit:

- A researched or creator-provided topic
- An original story/script, reviewed and revised by AI
- A creator approval and revision step
- Character descriptions and continuity guidance
- Sequential prompts for an external video-generation tool
- A thumbnail prompt and a clear image-generation availability state
- Platform-specific titles, descriptions, and tags
- A saved, user-owned history of drafts and completed packages

This product generates **text prompts and publishing metadata**. It does not claim to render videos or images unless a corresponding image or video provider is actually configured and succeeds.

## 2. Scope decision: short-form first

The MVP should support short-form only. The existing project already targets short scripts and short, sequential clips; keeping one bounded duration makes the story, clip timing, review loop, and demo consistent. It also avoids spending the remaining build time on long-form pacing and very large prompt packages.

For the first release:

- Target **60–90 seconds** by default.
- Let the creator choose a target duration within a small supported range (for example, 30–90 seconds).
- Make the number and timing of clip prompts derive from that selected duration and the configured downstream clip length.
- Label the output as a script and prompts for external video tools—not a finished video.

Long-form is a later phase. Add it only after the short-form path is reliable, and then define separate structures for chapters, scenes, pacing, and long-form metadata rather than simply multiplying the short-form clip count.

## 3. User flow

1. **Start a project.** The creator signs in, starts a new package, or opens a saved draft.
2. **Set creative inputs.** Choose a topic or idea, language, genre/tone, visual style, target duration, intended platform(s), and audience or channel context. Trend research can be enabled when its credentials and sources are available; the creator can also provide their own topic.
3. **Generate and review the story.** The system gathers available evidence, drafts a story, and sends it through a bounded AI review/revision loop. The UI shows the current script, review status, feedback, and attempt count.
4. **Creator makes the story decision.** The creator can:
   - Approve the story and continue.
   - Send a natural-language change request (for example, “make the ending more hopeful and shorten the setup”). The system revises the script, reviews it again, and returns it for approval.
   - Edit the script directly, then ask for another review or approve their edit.
   - Save and leave the draft for later.
5. **Generate the production kit only after approval.** Generate character reference descriptions/continuity guidance, clip-by-clip video prompts, a thumbnail prompt, and SEO metadata. Preserve the approved story version linked to these assets.
6. **Review each output.** The creator copies or edits prompts, inspects timing and character continuity, and sees honest image/video provider states. If no image provider is configured, show the prompt and a clear placeholder explaining that image generation is not available yet.
7. **Save and revisit.** Save the draft, revisions, approval state, and final package to the signed-in creator's Supabase history. The creator can reopen a package and continue editing it.
8. **Export.** Provide a simple copy/download path for the script, prompts, and metadata. No automatic publishing in the MVP.

### Story approval gate

The approval gate is a real workflow boundary, not just a button in the UI:

- Before creator approval, character, clip, thumbnail, and SEO generation must not run.
- A change request invalidates downstream assets if they already exist, because they were generated from a previous story version.
- The UI should show which story version produced the current assets.
- Approval is explicit and reversible by returning to story editing; the system must not silently approve or publish content.

## 4. AI review limits and LangGraph workflow

Use LangGraph to coordinate the steps and keep model roles separate at the prompt/workflow level, even though they use the same underlying model.

### Initial bounded review policy

- Generate one initial draft.
- Allow up to **three AI review passes per submitted story version**.
- Each pass returns structured feedback, an approval decision, and a revised script when appropriate.
- If the story is not approved within that cap, stop the automatic loop and return control to the creator with the latest feedback. Do not silently proceed.
- A creator change request starts a new review cycle for the changed story version. Keep prior versions and attempt counts for transparency.
- The creator remains the final approver even when the AI reviewer marks a story as ready.

The reviewer should assess clarity, hook, pacing for the selected duration, coherence, originality, and basic safety/copyright risk. Describe its score as an editorial heuristic, never as a prediction of virality or a guarantee of platform compliance.

### Suggested graph shape

```text
START
  -> validate_inputs
  -> optional_research
  -> draft_story
  -> review_story
       -> revise_story -> review_story (bounded; max 3 review passes)
       -> await_creator_decision
            -> request_changes -> revise_story -> review_story
            -> edit_story -> review_story or await_creator_decision
            -> approve_story
                 -> generate_character_guide
                 -> generate_clip_prompts
                 -> generate_thumbnail_prompt
                 -> generate_seo
                 -> save_package
                 -> END
```

Persist workflow state at the creator decision boundary. A process restart must not lose a paused draft or require the creator to repeat an expensive model call. Use a durable LangGraph checkpointer if compatible with the selected Supabase setup, or persist the explicit workflow state/version in Supabase and resume from that state. Do not rely on a process-local job dictionary as the durable source of truth.

## 5. Model and provider policy

### Meta-only language-model calls

- Use **Meta Muse Spark Open through Baseten** for story generation, story review, revisions, character descriptions, clip prompts, and SEO text.
- Remove Gemini as an active provider: no Gemini model IDs, `GEMINI_API_KEY(S)` fallback, Gemini-specific prompt claims, or silent provider switching.
- Centralize model calls behind one backend provider adapter. Keep model ID, API endpoint, timeouts, structured-output parsing, and error mapping in configuration/provider code rather than duplicating them in agents.
- Validate the actual Baseten endpoint, exact model ID, request format, access, latency, limits, and cost with the account before enabling production generation.
- Keep Baseten credentials server-side only. Never return them to the browser or store them in package records.
- Parse and validate structured model output. A malformed response is a visible failed step with a retry option, not an empty success.

Muse Spark Open is a text-output multimodal reasoning model. Its image/video input capability does **not** make it an image or video generator.

### Images and video

- Character and thumbnail **prompts** can be generated by Muse Spark Open.
- Character and thumbnail **image files** require a separate image-generation model/provider. Muse Image is a separate Meta model line; do not assume it is included in a Baseten Muse Spark Open deployment or available under the same key.
- The image-provider integration should be a separate adapter, with explicit states such as `not_configured`, `generating`, `ready`, and `failed`. The no-provider state should say that image generation is not configured; “model not found” is appropriate only when a configured provider actually returns that error.
- Clip outputs are prompts for an external video model. There is no generated video until a video-generation provider is integrated and verified.
- Keep the story/asset generation pipeline usable when image/video generation is unavailable.

### Configuration to settle before implementation

Use server-side environment variables with names matching the actual Baseten integration, for example:

```env
MODEL_API_KEY=
BASETEN_MODEL_ID=meta-models/muse-spark-open
BASETEN_BASE_URL=https://inference.baseten.co/v1
```

The existing setup uses `MODEL_API_KEY` for the Baseten credential. Keep that variable name when wiring the provider; do not print, expose, or persist its value. These settings use Baseten's hosted Muse Spark Open model slug and OpenAI-compatible Model API endpoint.

Supabase credentials will be added after the project is created. Keep placeholders in `.env.example`, never commit `.env`, and do not block UI/model work on Supabase credentials; show a clear persistence-disabled state in local development until configured.

## 6. User inputs and output requirements

### MVP inputs

- Topic/idea (required unless the user explicitly enables available topic research)
- Format: short-form (the only MVP option)
- Target duration: bounded short-form range
- Language: English, Hindi, or Nepali initially, subject to model-quality testing
- Genre/tone
- Visual style
- Target platform(s): YouTube Shorts, TikTok, Instagram Reels, Facebook Reels
- Optional audience/channel context and creator notes

Only offer input options that the current generation logic actually consumes. Do not show a selector for unsupported behavior.

### Story output

- Script text
- Word count and estimated spoken duration (clearly labeled as estimates)
- Version number and status
- AI review feedback/decision and review-pass count
- Creator approval timestamp/status

### Production kit

- Character list with roles, visual descriptions, voice guidance, and a reusable consistency description
- Sequential clip prompts with clip number, start/end time, visual prompt, dialogue/audio notes, and character references
- Thumbnail prompt and image-provider state
- Platform-specific metadata generated from the approved script and selected platforms
- Source/evidence references when research is enabled

Validate clip timings against the selected duration; ensure clips do not have gaps or overlap unless intentionally specified. Character/clip/SEO generation failures should be shown per step and retryable without discarding the approved story.

## 7. Research and SEO integrity

- Use the existing `YOUTUBE_API_KEY` and YouTube Data API v3 as the MVP's source for YouTube topic research, when configured. Search public YouTube videos for the creator's topic and selected niche; preserve each result's title, channel, URL/video ID, publish date, collected metrics, and collection timestamp.
- Treat YouTube search results and public engagement counts as research evidence, not proof of trends, view velocity, retention, or likely performance. The Data API does not provide private analytics for channels the user does not own.
- Keep YouTube research optional and clearly separate from story generation. A creator may enter a topic directly, and the story workflow should still work if YouTube credentials are missing, quota is exhausted, or the API is unavailable.
- Clearly show when research was skipped or failed; do not silently substitute stale, fabricated, or mock results. Label any demo fixtures as sample data.
- Use only configured and permitted sources; preserve source title, URL, timestamp, and collected evidence.
- Treat trend and performance observations as signals, not guarantees. Never imply that a generated title, tag, or script will go viral.
- Generate SEO metadata only for selected platforms. Use relevant tags and natural descriptions; do not invent trends, trending audio, claims, or facts.
- The MVP does not publish to YouTube/TikTok/Instagram/Facebook and does not access private channel analytics unless a future authorized integration is added.

## 8. Supabase, authentication, and privacy

Supabase is the authentication and persistence backend. The app starts a Supabase anonymous session automatically, so creators do not need to provide an email or password. Expected backend configuration is `SUPABASE_URL` and `SUPABASE_ANON_KEY`; the browser uses the project URL and publishable/anon key. Keep all keys out of source control, docs, logs, and screenshots; never expose a service-role key to the browser. Guest data is owner-scoped and private to the browser's anonymous user, but cannot be recovered on another device or after its browser data is cleared. Configure CAPTCHA and monitor Auth rate limits before a public production launch.

### Data to persist

- User-owned package/project record
- Input brief and selected options
- Story versions, review feedback, revision counts, and approval state
- Generated character/clip/thumbnail prompts and SEO metadata
- Generation status, step errors, and timestamps
- Optional research evidence and source references

### Required safeguards

- Keep Supabase Auth enabled and verify saved histories remain private to the
  anonymous user's owner ID under RLS.
- Add an owner field such as `user_id` to every user-owned record.
- Enable Row Level Security and policies that restrict select/insert/update/delete to `auth.uid() = user_id`.
- Remove the existing permissive “Allow all” policy before deployment.
- Never put a Supabase service-role key in the browser. Use server-side credentials only where needed; prefer the authenticated user session and least privilege.
- Add retention/deletion controls appropriate to saved drafts. Do not store uploaded media in the MVP unless that feature is explicitly added.
- Keep secrets out of logs, API responses, generated prompts, and database records.

## 9. Core screens and states

1. **Dashboard / project history:** New project, recent user-owned drafts, generation status, and errors.
2. **Creative brief:** Topic, duration, language, genre/tone, visual style, platforms, and optional research/context.
3. **Story workshop:** Script editor, AI feedback, review-pass indicator, natural-language change request, approve, save, and retry controls.
4. **Production kit:** Separate character, clip, thumbnail, and SEO sections with copy/export actions.
5. **Provider status:** Clear model/provider readiness and actionable failures. Distinguish prompt-ready from image/video-generated.

Every asynchronous stage needs loading, success, failure, and retry behavior. A backend or provider failure must not display success-shaped empty data.

### Mobile-first requirements

Design and implement the phone layout first, then enhance it for tablet and desktop:

- Start with a single-column flow, readable script cards, and vertically stacked form controls. Add wider multi-column layouts only when the viewport can support them.
- Keep primary actions (save, request changes, approve, retry) visible and easy to reach without covering content. Use a compact bottom action area where appropriate, respecting device safe areas.
- Replace desktop-only sidebars with a small-screen navigation pattern that keeps project history and the current workflow discoverable; do not make horizontal scrolling the only way to reach tabs or actions.
- Ensure buttons and interactive controls have at least 44×44 CSS-pixel touch targets, adequate spacing, visible focus states, and accessible names.
- Use responsive typography and content widths; code/prompts and long scripts must wrap or provide a deliberate copy/expand treatment without causing page-level horizontal overflow.
- Make the creative brief usable with a mobile keyboard: explicit labels, suitable input types, and no essential action hidden behind the keyboard.
- Keep generation status, review feedback, and errors close to the relevant content. Support loading, retry, and status changes without relying on hover.
- Test at narrow phone widths (including 320 CSS px), common phone widths, tablet, and desktop; check safe areas, orientation changes, keyboard behavior, and no horizontal page overflow.

## 10. Two-day implementation order

### Day 1 — reliable story loop

1. Confirm Baseten access, model ID/endpoint, and a successful small request.
2. Replace the Gemini-only model manager with the Meta-through-Baseten adapter; remove Gemini fallback paths.
3. Add validated short-form options and feed them into story and clip generation.
4. Implement bounded story review and creator approval/change-request states.
5. Make the frontend stop at the story gate and support edit/change/review/approve.

### Day 2 — approved package and persistence

1. Generate character, clip, thumbnail-prompt, and SEO assets only after approval.
2. Add explicit image-not-configured and video-prompt-only states.
3. Validate model JSON and add per-step error/retry behavior.
4. Configure Supabase guest sessions and apply owner-scoped schema/RLS before
   private history is exposed.
5. Test the complete short-form flow with mocked provider responses and one live Baseten smoke test.
6. Prepare one labeled demo package/sample in case live model access or rate limits fail.

If time is short, defer live trend integrations and database-backed user history until credentials/auth are ready. Do not defer the story approval gate or honest provider states.

## 11. Acceptance criteria

- The creator can set short-form duration, language, genre/tone, style, and topic.
- The selected duration changes the story target and clip count/timing.
- Meta Muse Spark Open through Baseten is the only language-model provider used; there is no Gemini fallback.
- The story is reviewed no more than three times per submitted version and the cap produces a clear handoff to the creator.
- No production assets are generated before creator approval.
- A natural-language change request or direct edit creates a new story version and returns to review/approval.
- Changing an approved story invalidates or regenerates its dependent assets.
- Character/thumbnail image cards accurately state that images are unavailable when no image model is configured.
- The UI never claims to generate video when it only produced video prompts.
- Invalid/missing model output and provider errors are visible and retryable.
- SEO copy is grounded in the selected topic/story and does not promise performance.
- YouTube topic research uses the configured YouTube Data API key and displays its source evidence; research failures remain explicit and do not block creator-provided topics.
- Supabase history is private to the authenticated owner (including anonymous
  guest users) under RLS before deployment.
- A sample/fallback demo is clearly labeled and never represented as live generated research.
- The core workflow is usable on a phone viewport without horizontal page scrolling; essential touch targets meet the 44×44 CSS-pixel minimum.

## 12. Later opportunities (not MVP blockers)

- Add Muse Image or another verified Meta image provider for character references and thumbnails, with stored image assets and retryable generation jobs.
- Add an actual video-generation provider if access, cost, and licensing are verified.
- Add long-form packages with chapter/scene planning and separate pacing rules.
- Add approved YouTube channel analytics and research integrations with consent and source attribution.
- Add collaboration, reusable channel voice settings, and export bundles.
- Add user comparison/feedback tools that help creators judge drafts without claiming to predict virality.

## 13. Repository and Git ownership

The user owns all repository publication:

- Do not create commits, push branches, open pull requests, or publish code unless the user explicitly asks.
- When the user explicitly asks to commit or push, only the user's GitHub identity may be the commit author/committer. Do not add an AI/model/agent/assistant as a co-author, do not add a `Co-authored-by` trailer, and do not publish under an AI identity.
- The user performs the final push from their own GitHub account. Do not push autonomously.
