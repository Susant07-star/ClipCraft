# ClipCraft Studio user flow

This guide describes the intended reviewer path through ClipCraft Studio, an AI short-form video content generation workflow. For the hosted setup, reviewers use the Vercel frontend URL; the FastAPI service runs privately on Render.

## Hosted reviewer notes

The first request after backend inactivity may take up to a minute because a free Render service can sleep. The frontend and backend must use the configured production URLs, and Supabase anonymous sign-ins must be enabled. Research failures are shown as non-blocking context warnings; story generation can continue with the creator brief.

## 1. Start a creative brief

The creator may describe a story idea in a brief of up to 1,000 characters, or leave it blank for AI to invent a premise and story. Genre and visual style start unselected; the creator may choose either, describe the desired tone or look in the brief, or let AI decide. Language defaults to Auto (Best Market), which uses research to choose the strongest market. A selected genre shapes the hook, conflict, and ending. Visual style guides how scenes are described and should not change the story's tone.

YouTube and public-web research is enabled by default and can be turned off. YouTube requires configured credentials; public-web research is supplementary and depends on source availability.

## 2. Draft and review the story

The backend drafts a short-form story and runs a bounded review loop. Reviewer feedback checks the brief, selected genre when provided, and story quality. If no genre is selected, the story follows the tone described in the brief. The workflow makes at most three automatic review passes for a submitted version; a review score is guidance, not a promise of audience response.

The creator can request a revision or edit the story directly. Revisions are saved as versions so the creator can inspect how the story changed. If the generated story misses the selected tone, revise it or edit it before approval.

## 3. Approve before production prompts

The creator explicitly approves the story. This is the gate for downstream production text. If the story is edited or revised after approval, approval and dependent assets must be refreshed for the new story version.

## 4. Review the production package

After approval, ClipCraft prepares a package that can include:

- A complete short-form video script shaped by research and review.
- Character descriptions and visual continuity guidance.
- Numbered, sequential prompts for external image/video-generation tools.
- A thumbnail prompt.
- Platform-specific title, description, tags, and related metadata for the selected destinations.

These are the production inputs for the video, not the rendered media itself. ClipCraft currently does not render images or videos, publish a post, or connect to the creator's social accounts.

## 5. Product direction

The current release proves the difficult creative workflow: turning an open-ended brief into a researched, reviewed, approved, and production-structured short-form video concept. The planned next phase is to connect image and video generation models, automatically assemble the approved scenes, and offer direct upload or handoff to supported video platforms. This keeps creator approval at the center while extending ClipCraft from a production planner into a complete video generation studio.

## 6. Save and resume

The app creates a Supabase anonymous guest identity and saves packages under that identity. A guest needs no email/password. Saved history is private to the browser identity, but clearing browser site data or switching devices loses access to that anonymous identity. The API validates the session token and applies owner-scoped database access.

## Reviewer checklist

- Confirm a selected genre affects the story itself; if no genre is selected, confirm the story follows the creator's brief.
- Confirm a creator can revise/edit before approval and that approval is explicit.
- Confirm downstream prompts are presented as prompts for other tools, not as rendered media.
- Confirm research is presented as context and not as guaranteed trend or performance data.
- Confirm package history belongs to the active guest session.
