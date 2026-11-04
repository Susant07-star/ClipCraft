# ClipCraft Studio hackathon demo script

## Purpose

This video is designed to make the product easy to judge in approximately three minutes. It demonstrates the working loop, not a slideshow:

1. A creator starts with uncertainty.
2. ClipCraft researches and creates a short-form video story.
3. AI reviews the result and the creator can intervene—or enable auto-approval.
4. The approved story becomes a structured production package.
5. The package is the foundation for future image/video generation and publishing integrations.

The demo should feel like a creator using a real tool, not like a feature tour. Keep the app full-screen, zoom the browser to 100%, and cut waiting time only between clearly visible workflow states.

## Before recording

- Use the deployed Vercel URL and confirm the Render backend is awake.
- Run one complete generation before recording so you know the live path works.
- Use a fresh browser session so the project history looks clean.
- Select:
  - Language: `Auto (Best Market)`
  - Genre: `Cute Kid Funny`
  - Visual style: `3D Pixar Animation`
  - Duration: `60 seconds`
  - Platforms: YouTube Shorts, TikTok, Instagram Reels
- Use this creative brief so the output is specific and visually demonstrable:

  > A shy girl leaves a sandwich for a stray dog every day. One morning, the dog brings her a bright red balloon it found, and they become best friends. Keep it simple, warm, and hopeful.

- Keep research enabled.
- For the strongest “hands-off” proof, enable **Auto-approve the AI story before clicking Generate story**. For a stronger human-control proof, leave it off and use the manual approval button after review.
- Never show API keys, Supabase settings, Render environment variables, or personal account data.
- If live generation fails, use the app's clearly labeled sample package. Say that it is a sample; do not present it as a live model result.

## ElevenLabs voiceover script

The paragraphs below are the narration. Keep the delivery confident and conversational. The bracketed headings are editing markers, not spoken words.

### 0:00–0:18 — The problem

“Short-form video creation does not usually fail because creators have no ideas. It fails in the gap between an idea and a video that is actually ready to produce. Research is scattered, scripts are hard to review, and visual prompts live in another tool. ClipCraft Studio brings that workflow together.”

### 0:18–0:38 — What ClipCraft is

“ClipCraft is an AI-powered short-form video content generation studio. It turns a brief—or even a blank brief—into a researched story, a reviewed script, characters, scene prompts, a thumbnail prompt, and platform-ready metadata.”

### 0:38–1:00 — Set up the creator intent

“I’ll create a sixty-second wholesome short about a shy girl and a stray dog. I’m choosing a warm 3D animated style, and I’m leaving the language on Auto so the research layer can select the strongest market. I’ll also turn on Auto-approve, so after a successful review the production package starts without another approval click.”

### 1:00–1:12 — Research

“Research is enabled by default. ClipCraft compares market signals and adds YouTube and public-web context to the workflow. These signals inform the story; they are not presented as a guarantee of reach.”

### 1:12–1:38 — Generate and review

“Now the system is doing the creative work: researching, writing, and reviewing the story. Notice that the output is not just a generic paragraph. It is shaped around a hook, a conflict, a visual direction, and a short-form payoff.”

### 1:38–1:55 — Creator control and auto-approval

“The default path keeps the creator in control: they can edit the script, request a revision, and approve the exact version they want. In this run, Auto-approve is enabled, so after the review passes ClipCraft skips the extra click and immediately builds the production package. If the review requires creator attention, auto-approval does not bypass that safeguard.”

### 1:55–2:25 — Production package

“The approved story is now converted into production assets: consistent character references, numbered scene-by-scene prompts, voice and sound direction, a thumbnail prompt, and metadata for the selected platforms. This is the bridge from creative intent to a repeatable video-production workflow.”

### 2:25–2:43 — Save, export, and reuse

“The package is saved to the creator's private guest history. I can reopen it, copy individual assets, download the complete package, or fix a prompt without losing the story context.”

### 2:43–3:00 — Honest boundary and vision

“This submission focuses on the highest-value foundation: research, story quality, creator approval, and production structure. Because Meta model credits required payment-card verification that was unavailable during development, the live language workflow uses the hackathon-accessible Muse Spark Open model through Baseten. The next phase is to connect image and video models, assemble the approved scenes, and hand the finished short directly to supported platforms. ClipCraft is built for that end-to-end future.”

## Exact screen actions by timestamp

Follow these actions in order. The cursor should pause on each control as it is mentioned. Do not click controls that are not listed.

| Time | What to show | Exact click / cursor action | Recording result |
|---|---|---|---|
| 0:00–0:18 | Empty ClipCraft workspace with app title visible | Move the cursor from the title to the Creative brief heading. Do not click yet. | Judges immediately understand this is a working creator studio. |
| 0:18–0:38 | Creative brief, settings row, and publishing platforms | Scroll only enough to keep the brief and controls visible. Point to Language, Genre, Visual style, duration, and platform labels. | Establish the creator inputs before generation. |
| 0:38–0:48 | Story idea textarea | Click inside the textarea and paste the tea-stall brief. Pause so the text is readable. | Show that the story starts from creator intent. |
| 0:48–0:53 | Language selector | Click `Language`, choose `Auto (Best Market)`, then move the cursor away. | Show market-aware generation. |
| 0:53–0:58 | Genre and visual style selectors | Click `Genre` → `Funny`; click `Visual style` → `3D Pixar Animation`. | Make tone and visual direction explicit. |
| 0:58–1:03 | Research and auto-approval controls | Confirm research is checked. Click `Auto-approve the AI story`; pause on its helper text. | Show the speed option and its safety explanation before generation. |
| 1:03–1:12 | Generate story button | Click `Generate story` once. Do not click again while it is disabled/loading. | Start the real workflow and prevent duplicate jobs. |
| 1:12–1:28 | Generation progress card | Keep the cursor still. Show `Researching`, `Writing`, and `Reviewing` progress states. | Prove the app is running a multi-stage workflow. |
| 1:28–1:38 | Story workshop with generated story and feedback | When the result appears, move to the story title, then the reviewer feedback. Do not edit in the auto-approval run. | Show the generated story is reviewed, not just returned. |
| 1:38–1:55 | Transition from reviewed story to production generation | Point to the approval/status message, then the `Building your approved production kit…` progress state. Do not click Approve; auto-approval already handled it. | Make the automatic approval behavior unmistakable. |
| 1:55–2:05 | Characters tab | Click the `Characters` tab. Scroll through two character cards slowly. | Show visual continuity inputs. |
| 2:05–2:17 | Clips tab | Click the `Clips` tab. Scroll from Clip 1 to a later numbered clip. | Show sequential scene prompts and production structure. |
| 2:17–2:25 | Thumbnail and SEO tabs | Click `Thumbnail`, pause on the prompt, then click `SEO` and show one platform's metadata. | Show packaging for publishing destinations. |
| 2:25–2:33 | Download package button | Scroll to the package header and click `Download package` once. | Prove the output is portable and reusable. |
| 2:33–2:43 | Projects sidebar | Click the hamburger/sidebar control if needed, then click the current project entry. Do not delete it. | Prove saved history and resume capability. |
| 2:43–3:00 | Final package overview | Move the cursor across the story, scene prompts, and metadata without clicking. End with the app title visible. | Close on the product value and roadmap. |

### Optional manual-approval variant

If you want to emphasize human control instead of speed:

1. Leave **Auto-approve the AI story** unchecked at 0:58–1:03.
2. Click **Generate story** as normal.
3. When the Story workshop appears, click **Approve story and generate prompts** at 1:38–1:55.
4. Say: “The creator remains the final gate. ClipCraft only prepares production assets after the selected story version is approved.”
5. Continue from the `Characters` tab at 1:55.

## On-screen callouts

Use short captions, one at a time:

- `From brief to production-ready short`
- `Research-informed`
- `AI review + creator control`
- `Auto-approve after successful review`
- `Characters · scenes · thumbnail · metadata`
- `Prompts today → generated video next`

## Recording and editing rules

- Show the actual click that starts generation and the actual generated result.
- Do not use a long loading screen. Cut from a visible progress state to the completed state.
- Keep the story and package text large enough to read in a compressed video.
- Use one subtle background music bed below the narration; lower it during important UI explanation.
- Avoid rapid cursor movement. Move the cursor deliberately to the control being discussed.
- Do not claim that ClipCraft currently renders final images/video or uploads to social platforms.
- Do not claim that research predicts virality. Call it context or market signal.
- If a research source is unavailable, keep the warning visible briefly and explain that generation continues with the creator brief; do not hide the warning.

## Short fallback if the live model is slow

“The backend is waking from its hosted service, so I’m showing the visible workflow state while it starts. In the completed run, the same flow produces the story and production package you’ll see next.”

Then cut to the completed result only if it was generated live in the same recording session. Otherwise use the labeled sample package and say:

“This is a labeled sample package used to show the output layout; it is not being presented as a live generation.”

## Why this demo is judge-friendly

- It starts with a concrete creator problem instead of implementation details.
- It proves the full working loop with live UI evidence.
- It shows a meaningful product decision: human approval by default, optional auto-approval for speed.
- It makes the output tangible through scenes, characters, thumbnail direction, and metadata.
- It is transparent about current model and rendering limitations.
- It ends with a credible, technically aligned roadmap rather than an unsupported promise.
