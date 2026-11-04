# ClipCraft Studio deployment

## Architecture

- **Vercel:** Next.js frontend.
- **Render:** FastAPI and LangGraph backend.
- **Supabase:** Anonymous authentication and owner-scoped Postgres persistence.
- **Baseten:** Server-side Muse Spark Open language model access.

The deployed release is the text-and-creative-direction foundation of an AI short-form video generation studio. Meta model credits could not be activated because payment-card verification was unavailable during development, so Baseten credits provide the live language workflow for this submission. Image/video rendering and direct platform upload are planned integration stages, not claims about the current deployment.

## Render backend

Create a Render Web Service connected to the repository:

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

Configure these environment variables in Render:

```text
MODEL_API_KEY=<server-side Baseten key>
BASETEN_MODEL_ID=meta-models/muse-spark-open-1026
BASETEN_BASE_URL=https://inference.baseten.co/v1
SUPABASE_URL=<Supabase project URL>
SUPABASE_ANON_KEY=<Supabase anonymous key>
YOUTUBE_API_KEY=<YouTube Data API key>
YOUR_CHANNEL_ID=<optional YouTube channel ID>
FRONTEND_URL=https://<your-vercel-domain>
```

Do not add placeholder Meta credentials. Meta-owned-account research remains disabled unless valid credentials and account IDs are intentionally configured. Public-web research does not require Meta credentials.

After deployment, verify the API at `https://<your-render-domain>/docs`.

## Vercel frontend

Create a Vercel project connected to the same repository:

| Setting | Value |
|---|---|
| Root directory | `frontend` |
| Framework | Next.js |
| Build command | `npm run build` |
| Install command | `npm install` |

Configure these Vercel environment variables:

```text
NEXT_PUBLIC_API_URL=https://<your-render-domain>
NEXT_PUBLIC_SUPABASE_URL=<Supabase project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase anonymous key>
```

The `NEXT_PUBLIC_` variables are browser-visible by design. Never place `MODEL_API_KEY`, a service-role key, or other server credentials in Vercel frontend variables.

## Supabase production settings

1. Apply the repository migrations to the intended Supabase project.
2. Enable anonymous sign-ins.
3. Set the Vercel URL as the Site URL.
4. Add `https://<your-vercel-domain>/**` to the allowed Redirect URLs.

## Smoke test

Open the Vercel URL and verify:

- A guest session is created.
- A story can be generated with an empty or completed brief.
- Research can be enabled or disabled.
- A package can be saved, reopened, and deleted.
- A story can be approved before production text is generated.
- No browser CORS errors appear.

Render's free service can sleep after inactivity. The first request after sleep may take up to a minute.
