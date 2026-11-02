# ClipCraft Studio

ClipCraft Studio drafts short-form stories, shows AI review feedback, and waits
for an explicit creator approval before generating character, video-tool,
thumbnail, or SEO prompts. It produces text prompts, not rendered images or
videos.

## Setup

1. Copy `frontend/.env.example` to `frontend/.env.local` and set the Supabase
   project URL, publishable/anon key, and backend API URL. Restart Next.js
   after changing this file.
2. Configure `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `backend/.env`, along
   with the server-side model and research variables from
   `backend/.env.example`. Never put a service-role key in the browser.
3. Install frontend dependencies with `npm ci` in `frontend/`; install backend
   dependencies from `backend/requirements.txt`.
4. Start FastAPI from `backend/` with `uvicorn main:app --reload`, then start
   the Next.js app from `frontend/` with `npm run dev`.
5. From the repository root, authenticate the Supabase CLI with
   `npx supabase login`, then link the intended project with
   `npx supabase link --project-ref <project-ref>`. Review
   `npx supabase config diff` before `npx supabase config push` to enable
   anonymous sign-ins; only confirm expected Auth changes. Then apply pending
   migrations with `npx supabase db push`. The CLI login opens a browser; enter
   any database password only into the CLI prompt if requested.

The linked Supabase project has Anonymous Sign-Ins enabled. The app
automatically creates a guest session without asking for an email or password.
Each browser gets its own private owner-scoped history and draft storage. The
session cannot be recovered on another device or after browser data is cleared;
do not clear site data if drafts need to be retained. The app no longer shows
login or sign-out controls. For a public production deployment, configure a
CAPTCHA provider for anonymous sign-ups and monitor Auth rate limits to reduce
automated account abuse.

API requests carry the current Supabase access token; the backend validates it
and uses it for owner-scoped database operations. Pending story state and story
versions are stored in `video_packages.workflow_state` and
`video_packages.story_versions`. Saved decisions awaiting the creator can be
reopened after a reload or backend restart. An in-progress generation
interrupted by a backend restart is marked failed instead of appearing to run
indefinitely.

Existing package rows have no inferred owner and remain hidden by RLS. Do not
assign them to a user unless their ownership is known. Apply the migration
before package history and durable drafts will work.

## Verification

Run backend tests from `backend/` with `python -m unittest discover -v`.
Run frontend checks from `frontend/` with `npx tsc --noEmit`,
`npx eslint app/page.tsx app/layout.tsx components/Dashboard.tsx
components/Sidebar.tsx components/Chatbox.tsx lib/api.ts lib/supabase.ts
lib/types.ts`, and `npm run build`.