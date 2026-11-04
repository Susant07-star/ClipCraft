# ClipCraft Studio

ClipCraft Studio helps a creator turn a short-form video idea into a reviewed story and a production-ready text package. The creator describes the story in a creative brief, starts with the best-market language setting, and can choose a genre and visual style or describe them in the brief. YouTube and public-web research runs by default (with an option to turn it off); the creator reviews and edits the story and explicitly approves it before downstream prompts are generated.

**Submission scope:** ClipCraft generates and organizes text assets. It does not render images or video, publish to social platforms, or promise reach or engagement. A story is not production-approved until the creator approves it.

**Model and roadmap:** A Meta API card-verification issue prevented direct use of Meta's API during this build. ClipCraft uses the hackathon-accessible Muse Spark Open model through Baseten for language tasks. No separate image- or video-generation model is integrated. The larger product vision is a complete creator studio that can take an approved story through generated visuals and finished short-form video when suitable generation models are available.

## What a reviewer can try

1. Optionally describe a story idea (up to 1,000 characters); leave it blank for AI to invent a story from the selected language, genre, visual style, and duration. Language defaults to Auto (Best Market).
2. Research is enabled by default and can be turned off; YouTube research requires its API key, while public-web research does not.
3. Generate a story draft and inspect reviewer feedback. Revise or edit the story until it matches the selected genre or the creator's brief.
4. Approve the story. The app then prepares character descriptions, sequential video-tool prompts, a thumbnail prompt, and platform-specific metadata.
5. Reopen saved work from the browser's private package history, copy the text assets, or export the package.

See [the user flow](docs/user-flow.md) for the complete interaction and boundaries, and [the three-minute demo guide](docs/demo-script.md) for a timed recording plan.

## Run locally

The frontend and API run in separate terminals. A Supabase project and a Baseten key with access to the hackathon model are needed for the full live flow. YouTube and public-web research is enabled by default and can be turned off in the story settings.

### 1. Configure the backend

From the repository root, create `backend/.env` using `backend/.env.example` as a template. Set:

- `MODEL_API_KEY` to the server-side Baseten key.
- `BASETEN_MODEL_ID` to `meta-models/muse-spark-open-1026` and `BASETEN_BASE_URL` to `https://inference.baseten.co/v1`.
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` for the same Supabase project used by the frontend.
- `FRONTEND_URL` to `http://localhost:3000` (the example already uses this local value).
- `YOUTUBE_API_KEY` is required for YouTube research. Public-web research uses DuckDuckGo and does not require credentials.

Keep real keys in local environment files; never put a Baseten key or Supabase service-role key in frontend variables or commit secrets.

In PowerShell:

```powershell
cd E:\ReelPilot\Oddly_Possible_Channel_Automation\backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe main.py
```

The API listens at `http://localhost:8000`.

### 2. Configure and run the frontend

Copy `frontend/.env.example` to `frontend/.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the same Supabase project, and keep `NEXT_PUBLIC_API_URL=http://localhost:8000` for local use. Then run:

```powershell
cd E:\ReelPilot\Oddly_Possible_Channel_Automation\frontend
npm ci
npm run dev
```

Open `http://localhost:3000`.

### 3. Prepare Supabase

The app uses Supabase Auth and Postgres for guest sessions and private saved packages. Enable anonymous sign-ins in the Supabase project and apply the repository migrations from the repo root:

```powershell
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Use the project ref for the same project configured in both `.env` files. These commands assume the Supabase CLI is available through `npx`; follow its prompts to authenticate and link the intended project. Review the migrations and project settings before applying them to a shared/production database.

Guest history is scoped to the current anonymous browser identity. It is private to that identity, but cannot be recovered in another browser/device or after that browser's site data is cleared.

## Architecture

- **Frontend:** Next.js and React (`frontend/`).
- **API and workflow:** FastAPI and LangGraph (`backend/`).
- **Language model:** Muse Spark Open through Baseten, using the hackathon model ID above; this build does not call Meta's direct API.
- **Persistence and guest identity:** Supabase Auth and Postgres with owner-scoped access policies (`supabase/`).
- **Optional research:** YouTube Data API and public-web search when configured. Research signals are context, not proof of trends or a performance guarantee.

## Submission boundaries

- Creator approval gates production-prompt generation.
- The app returns text prompts and metadata; actual image/video rendering must happen in an external tool.
- Social publishing and platform account integrations are outside this submission's implemented workflow.
- Live model, Supabase, YouTube, and public-web calls need valid credentials where applicable and network access. A local UI launch alone does not verify those third-party services.
- Do not use a Supabase service-role key in the browser. Keep local `.env` files private.
