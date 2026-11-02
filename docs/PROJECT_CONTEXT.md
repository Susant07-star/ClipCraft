# ClipCraft Studio project context

The current product requirements and acceptance criteria are in
[clipcraft-studio-mvp.md](./clipcraft-studio-mvp.md). Treat it as the source of
truth for product decisions.

## Product

ClipCraft Studio is a mobile-first, short-form story-to-video-prompt studio.
Creators provide a topic and creative preferences, review an AI-drafted story,
request changes or edit it, and explicitly approve it before the system makes
character descriptions, sequential prompts for external video tools, a
thumbnail prompt, and platform-specific SEO metadata.

The MVP generates text assets only. It does not generate image/video files or
publish to social platforms. Image/video generation requires separately
configured and verified providers.

## Stack and integrations

- **Workflow:** Python, FastAPI, and LangGraph.
- **Language model:** Meta Muse Spark Open, hosted through Baseten.
- **Baseten configuration:** `MODEL_API_KEY`,
  `BASETEN_MODEL_ID=meta-models/muse-spark-open`, and
  `BASETEN_BASE_URL=https://inference.baseten.co/v1`. Never use an alternate
  LLM provider or silent model fallback.
- **Research:** YouTube Data API v3 using `YOUTUBE_API_KEY`; public results are
  evidence, not proof of trends, retention, or likely performance.
- **Frontend:** Next.js and React, implemented mobile-first.
- **Persistence:** Supabase Auth and Postgres, with owner-scoped RLS policies.
  The local Supabase URL/key are environment-only and must never be committed.

## Workflow constraints

- Limit automatic story review to three passes per submitted story version.
- Pause for creator approval before generating any downstream assets.
- A story change invalidates assets produced from the previous version.
- Surface provider failures; never disguise empty or failed output as success.
- Clearly mark an image provider as unconfigured until image generation is
  actually integrated.
- Never describe SEO suggestions or review scores as guaranteed performance.
- Keep secrets out of logs, browser bundles, and saved package data.

## Git ownership

The user owns commits and GitHub pushes. Do not commit or push without an
explicit request, add an AI co-author trailer, or publish under an AI identity.
