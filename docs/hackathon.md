# Meta Global AI Developer Hackathon 2026

Research snapshot: October 29, 2026. This is a working developer brief, not the official rules. Event dates, eligibility, model access, and submission requirements can change; confirm them in the participant portal and on the official event pages before relying on them.

## At a glance

| Item | Published information |
| --- | --- |
| Organizer | Meta, with Cerebral Valley |
| Format | Virtual and worldwide; free to enter if selected |
| Duration | October 26–November 4, 2026 |
| Tracks | Indie developer (individual builders and students) and startup (teams and founders) |
| Themes | **Build for Your World** and **Push the Frontier** |
| Total prize pool | $1,000,000 across both tracks; the public event page does not specify the prize breakdown |
| Project deadline | November 4, 2026, 9:00 PM ET |
| Judging | November 4–8, 2026 |
| Winners announced | November 9, 2026 |

As of this research date, the event is underway and the application deadline (October 25 at 11:59 PM ET, or earlier if all 20,000 places were filled) has passed. Participation is by selection. The published submission deadline converts to **November 5 at 7:45 AM Nepal Time (NPT)**; the event page states the deadline in ET, so follow any updated deadline in the participant portal.

## What the organizers are asking builders to make

**Build for Your World** means applying Meta models to a real domain or workflow the builder knows firsthand: remove a concrete source of effort, make a task more accessible or productive, or enable something that was previously impractical.

**Push the Frontier** is the broader theme for using the models on harder technical or physical-world challenges, with examples including software, robotics, manufacturing, energy, and materials.

The official page describes the indie track as judged on **creativity, technical ambition, and whether the project works**. The startup track is described in terms of **technical execution and production readiness**. The application-selection criteria are separate: the proposed idea's clarity, feasibility, and theme fit, plus demonstrated technical skill; those two application criteria are weighted equally.

### Judging details to verify

The event page reviewed for this brief does **not** publish a weighted contest rubric. The 30% impact / 25% Meta tooling / 25% demo / 20% technical execution breakdown in the initial project notes is therefore **unverified**, not an official scoring promise. The same applies to the proposed 2–3 minute demo-video length. Check the current official rules and submission form for the actual scoring, required deliverables, and video format.

Until then, a sensible build target—based on the official theme and track descriptions, not an asserted official rubric—is a working end-to-end workflow that solves a specific problem, demonstrates why the Meta model(s) are needed, and makes the result legible in a short live demo.

## Meta tooling relevant to a prototype

The hackathon page explicitly calls out Muse Spark, Muse Image, SAM 3.1 through Meta Model API, Meta open-weight models, and Muse Code. Cerebral Valley's event page also names Muse Wonder. The current Meta developer documentation describes these capabilities:

| Tool/model | Documented role | What it could contribute to a real workflow |
| --- | --- | --- |
| Muse Spark (the current docs recommend `muse-spark-1.3` for new API work) | Agentic and multimodal model; the docs describe text, image, video, audio, and PDF inputs, tool calling, and structured output | Interpret user-provided material, extract or classify information, and coordinate a sequence of actions |
| SAM 3.1 | Text-prompted detection, segmentation, and tracking in images and video; returns geometric results such as masks and boxes | Turn visual input into selected objects or regions that another workflow can use |
| Muse Image | Image generation and editing | Generate or edit a visual asset as one step in a useful product, rather than as an isolated novelty |
| Muse Voice Transcribe | Streaming or file-based speech-to-text, with speaker attribution and turn detection | Convert spoken instructions, interviews, or field notes into usable workflow input |
| Meta open-weight models | Self-host or use a hosted inference provider, depending on model/provider | Trade managed API simplicity for more control over deployment and infrastructure |
| Muse Code | Meta's coding agent for terminal and CI workflows | Accelerate implementation; distinguish using a coding assistant to build the project from using Meta models as part of the project users experience |

Meta's current Model API documentation also lists Muse Wonder and describes Muse Glimmer and Muse Spark Open. Their presence in the general developer catalog does not by itself establish hackathon eligibility or participant access. Confirm the event's supported model list, credentials, quotas, and terms in the participant channel before designing around a model.

### API integration notes

- Meta's first-party Model API quickstart uses `https://api.meta.ai/v1`; that is a separate provider endpoint. ClipCraft Studio instead calls Meta Muse Spark Open hosted by Baseten at `https://inference.baseten.co/v1`, using the Baseten credential stored in `MODEL_API_KEY` and model slug `meta-models/muse-spark-open`. Do not point the ClipCraft client at Meta's first-party endpoint.
- The docs show OpenAI SDK and compatible-client examples. For a first proof of concept, use the quickstart and the model-specific guides rather than assuming an SDK-specific feature is supported.
- Keep API keys on a server or in local environment variables; never ship a secret in browser code or a public repository.
- Model API billing is pay-as-you-go outside any event-specific credits or access. The pricing docs describe per-token billing for text, per-image for image generation, per-audio-hour for transcription, and per-image/video-frame billing for SAM. They document per-team rate limits and recommend exponential backoff with jitter for `429` responses.
- The pricing docs describe a **Contributor mode** for some models where prompts, files, context, and model responses may be used to train future Meta models in exchange for different pricing/usage. Review the current mode and data-handling terms before sending sensitive or personal data.
- The event partner page lists limited offers for selected participants: Baseten advertises $100 in credits and 2M tokens-per-minute limits for open-weight models; Modal and Fireworks each advertise $100 in credits. These are partner-specific, selection-limited offers—not guaranteed credits for every entrant.

## Eligibility, participation, and event logistics

- The event is described as open worldwide, subject to local law, sanctions/export restrictions, and other exclusions. The event page identifies restrictions affecting certain countries and regions and excludes Meta/Cerebral Valley personnel, government-affiliated individuals, and certain family or household members. Read the official rules for the exact legal terms.
- Applications were reviewed on a rolling basis, with a stated maximum of 20,000 accepted participants. The organizers reserved the right to close applications once the cap was reached.
- The event page advertises live workshops and office hours from Meta and partners during October 27–November 4, with office hours on Discord. Use the participant Discord and portal for current schedules, access instructions, and announcements.
- The public page says official rules must be accepted by selected participants and would be published before the October 26 kickoff. The readable public rules/waiver content was not available during this research. Since the event has already started, get the current rules and submission instructions directly from the participant portal rather than assuming the public page is current.

## Practical guidance for the project discussion

This is research, not a project or stack recommendation. Before choosing an idea, use these questions to test whether it fits the event:

1. **Who has the problem?** Name a specific person or group and a workflow they actually perform.
2. **What is painful today?** Describe the current steps, friction, and consequence—not just a broad topic.
3. **What changes if the prototype works?** Pick an observable outcome such as time saved, fewer manual steps, improved access, or a more reliable result.
4. **Why use these models?** Assign each model a clear role and show how its output advances the workflow. Avoid adding model calls only to name-drop tooling.
5. **Can it be demonstrated end to end?** Prepare realistic sample input, show the model-generated result in context, and handle at least one failure or uncertain result cleanly.
6. **Can it be built and tested in the remaining time?** Prefer a narrow workflow with a clear stopping point over a broad assistant that promises many things.
7. **Is the data appropriate to send?** Avoid unnecessary personal or confidential data; check model-mode terms and participant rules.

For the eventual demo, show the user's problem, the before/after workflow, the model's concrete contribution, and the result. A polished interface helps, but should not hide whether the core workflow actually works.

## Open items before submission

- Confirm selected-participant status and event-specific API access/credits.
- Read the latest official rules and check whether any model, library, data, or deployment restrictions apply.
- Confirm submission fields, repository/demo requirements, video length, judging rubric, and any source-code or licensing requirements in the live submission portal.
- Test the exact demo path using the credentials and deployment environment that will be available at judging time.
- Recheck the deadline and time zone in the participant portal.

## Sources

Official and organizer-published pages reviewed on October 29, 2026:

- [Meta hackathon event page](https://dev.meta.ai/events/global-hackathon)
- [Cerebral Valley event page](https://cerebralvalley.ai/e/meta-ai-developer-hackathon)
- [Application overview and event waiver](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/waiver)
- [Meta Model API documentation overview](https://dev.meta.ai/docs/overview)
- [Meta Model API quickstart](https://dev.meta.ai/docs/quickstart)
- [Meta model catalog and capabilities](https://dev.meta.ai/docs/models)
- [Meta Model API reference](https://dev.meta.ai/docs/api-reference)
- [Meta Model API pricing and rate limits](https://dev.meta.ai/docs/pricing-rate-limits)
- [Muse Code documentation](https://dev.meta.ai/docs/muse-code)
