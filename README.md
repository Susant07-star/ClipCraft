# ClipCraft Studio

> Built for the **Meta Global AI Hackathon**.

ClipCraft Studio is an AI-powered short-form video content generation studio. It turns a creator's idea—or a blank brief—into a researched, reviewed, and production-ready video package. The creator starts with the best-market language setting, can choose a genre and visual style or describe them in the brief, and explicitly approves the story before downstream video assets are generated.

**What it generates today:** ClipCraft creates the creative foundation for a short-form video: an original script, review feedback, character and continuity direction, numbered scene-by-scene video prompts, a thumbnail prompt, and platform-specific metadata for YouTube Shorts, TikTok, Instagram Reels, and Facebook Reels. It is designed to reduce the distance between an idea and a video that is ready to produce.

**Hackathon focus:** ClipCraft addresses the gap between a creator's initial idea and a production-ready short-form video workflow. It combines research, creative generation, review, creator approval, and structured downstream prompts in one accessible studio.

**Current boundary:** This submission generates and organizes the text and creative direction required to produce the video; it does not yet render the final image/video files, upload them to social platforms, or promise reach. Creator approval remains the quality gate before production prompts are generated.

**Model choice and roadmap:** Meta model credits could not be activated during development because the required payment-card verification was unavailable. To keep the product working and judgeable, ClipCraft uses the hackathon-accessible Muse Spark Open model through Baseten for its language workflow. The architecture keeps the story, character, scene, and metadata stages separated so future image and video models can be connected without redesigning the creator experience. When access to suitable Meta image/video models becomes available, the next phase is a complete video generation studio: generate visuals from the approved package, assemble the final short, and provide direct upload or handoff to supported video platforms.

## Demo and live app

- **Try ClipCraft live:** [clip-craft-chi.vercel.app](https://clip-craft-chi.vercel.app/)
- **Watch the demo video:** [ClipCraft Studio demo on YouTube](https://youtu.be/CoE6uJE0TTc)

## What a reviewer can try

1. Optionally describe a story idea (up to 1,000 characters). Genre and visual style can be selected or described in the brief; leave all of them open for AI to decide. Language defaults to Auto (Best Market).
2. Research is enabled by default and can be turned off; YouTube research requires its API key, while public-web research does not.
3. Generate a story draft and inspect reviewer feedback. Revise or edit the story until it matches the selected genre or the creator's brief.
4. Approve the story. The app then prepares character descriptions, sequential video-generation prompts, a thumbnail prompt, and platform-specific metadata.
5. Reopen saved work from the browser's private package history, copy the text assets, or export the package.

The creator can optionally enable **Auto-approve the AI story** to skip the manual approval click after a successful AI review and immediately start production-package generation. Manual approval remains the default.

See [the user flow](docs/user-flow.md) for the complete interaction and boundaries, [the deployment guide](docs/deployment.md) for hosting, and [the three-minute demo guide](docs/demo-script.md) for a timed recording plan.

## Highlights

- AI-assisted story and script generation from an optional creative brief.
- Research-informed topic development using YouTube and public web sources.
- Human approval before character, scene, thumbnail, and metadata assets are produced.
- Private guest project history backed by Supabase.
- Responsive Next.js interface with a FastAPI and LangGraph workflow.

## Why this matters

Short-form video creation is often fragmented across research, writing, review, visual planning, generation tools, and publishing. ClipCraft brings the high-value planning and quality-control steps into one workflow: research informs the brief, review improves the story, approval protects creator intent, and the final package is structured for downstream video generation. The current text-first implementation is the foundation for a model-agnostic end-to-end video studio.

## Public deployment

The recommended reviewer deployment uses Vercel for the Next.js frontend, Render for the FastAPI backend, and the same Supabase project for authentication and persistence.

1. Create a Render Web Service with `backend` as the root directory, `pip install -r requirements.txt` as the build command, and `uvicorn main:app --host 0.0.0.0 --port $PORT` as the start command.
2. Add the backend variables from `backend/.env.example` to Render. Set `FRONTEND_URL` to the final Vercel URL. Keep `MODEL_API_KEY`, `YOUTUBE_API_KEY`, and all other server credentials in Render only.
3. Create a Vercel project with `frontend` as the root directory. Set `NEXT_PUBLIC_API_URL` to the Render service URL, plus the public Supabase URL and anonymous/publishable key.
4. In Supabase Authentication URL Configuration, set the Vercel URL as the Site URL and add its wildcard URL to Redirect URLs. Anonymous sign-ins must be enabled.
5. Open the Vercel URL and test sign-in, story generation, research, save/resume, deletion, and story approval.

Render's free service may sleep when idle, so the first generation after inactivity can take up to a minute. Reviewers should use the Vercel URL; the Render URL is the private API endpoint.

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
- **Language model:** Muse Spark Open through Baseten, using the hackathon model ID above. Meta model credits were unavailable because payment-card verification could not be completed during development; the integration boundary is intentionally ready for future model providers.
- **Persistence and guest identity:** Supabase Auth and Postgres with owner-scoped access policies (`supabase/`).
- **Optional research:** YouTube Data API and public-web search when configured. Research signals are context, not proof of trends or a performance guarantee.

## Submission boundaries

- Creator approval gates production-prompt generation.
- The app returns the approved video's script, visual direction, scene prompts, thumbnail prompt, and metadata; actual image/video rendering must currently happen in an external tool.
- Direct rendering and upload integrations are the next roadmap phase once suitable image/video model access is available.
- Live model, Supabase, YouTube, and public-web calls need valid credentials where applicable and network access. A local UI launch alone does not verify those third-party services.
- Do not use a Supabase service-role key in the browser. Keep local `.env` files private.
