cd E:\ReelPilot\Oddly_Possible_Channel_Automation\recording-agent
npm install# ClipCraft recording agent

This is a deterministic browser runner for recording the ClipCraft hackathon demo. It controls only a visible ClipCraft browser window. Start and stop OBS yourself, then add the ElevenLabs voiceover during editing.

It does not use an AI API, read API keys, control OBS, or control other applications. Playwright moves the visible cursor and clicks the app's accessible controls.

## Requirements

- Node.js 20 or newer.
- A deployed ClipCraft frontend URL, or the local frontend URL.
- A working backend and Supabase guest sign-in.
- Google Chrome installed.
- OBS started manually.

No Baseten, YouTube, Supabase service-role, OpenAI, Anthropic, or ElevenLabs API key is needed by this runner. The app itself still needs its normal Render, Vercel, Supabase, Baseten, and YouTube configuration.

## Install

From this directory:

```powershell
npm install
npx playwright install chromium
```

## Record the demo

1. Start OBS and prepare a browser-window capture.
2. From this directory, run:

```powershell
$env:CLIPCRAFT_URL="https://your-vercel-domain.vercel.app"
npm run demo
```

The runner opens a visible Chromium window, waits five seconds, and then performs the auto-approval demo. Start OBS during the five-second countdown.

Optional settings:

```powershell
$env:CLIPCRAFT_URL="http://localhost:3000"
$env:DEMO_START_DELAY_SECONDS="10"
$env:DEMO_MODE="manual"
npm run demo
```

`DEMO_MODE` can be `auto` (default) or `manual`. Manual mode leaves auto-approval off and clicks the creator approval button after review.

Press `Ctrl+C` in the runner terminal to stop the browser safely. Stop OBS manually.

## What the runner does

1. Opens a clean visible browser profile.
2. Enters the tea-stall creative brief.
3. Selects Auto language, Funny genre, and 3D Pixar Animation.
4. Confirms research and optionally enables auto-approval.
5. Clicks Generate story once.
6. Waits for the real workflow to reach the story review or completed package.
7. Opens Characters, Clips, Thumbnail, and SEO.
8. Downloads the package.
9. Leaves the final package visible for the end frame.

The runner uses text and ARIA labels rather than screen coordinates, so browser zoom and window size can change without breaking the flow. It intentionally does not delete projects or expose credentials.
