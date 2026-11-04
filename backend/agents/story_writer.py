"""
Story Writer Agent
Drafts an original, genre-consistent short-form story in Hindi, English, or
Nepali using Meta Muse Spark Open through Baseten.
"""

import os
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

from utils.llm_manager import robust_llm_invoke

load_dotenv()

STORY_WRITER_SYSTEM_PROMPT = """You are a short-form video scriptwriter specializing in original stories for YouTube Shorts, TikTok, Instagram Reels, and Facebook Reels.

Write an original short-form script that fits the exact target duration supplied in the brief.
When the creator selects a genre, it is the primary creative constraint. Keep the hook, conflict, character behavior, dialogue, emotional arc, and ending consistent with that genre from beginning to end. If no genre is selected, infer the tone from the creator's story brief; if the brief does not specify a tone, choose one that fits the idea. Research is supporting context only and must never change the requested tone.

CRITICAL RULES:
1. Hook the viewer in the first 3 seconds with an opening beat that fits the selected genre or the tone inferred from the brief (for comedy, start with something funny; for mystery, start with a question or clue; for horror, start with unease).
2. Give the story a clear beginning, development, and payoff that fit the selected genre or inferred tone. Do not force a shocking reveal, tragic turn, cliffhanger, or joke when it conflicts with the requested tone.
3. The story MUST be original — no copyrighted material, no real named celebrities.
4. Avoid anything that violates YouTube/TikTok/Instagram community guidelines: No graphic violence, no hate speech, no sexual content, no misinformation presented as fact.
5. Keep sentences SHORT and punchy — this is a voiceover script, not an essay.
6. Treat the selected genre or the tone described in the brief as the dominant tone throughout. For comedy, use clear comic situations, playful escalation, and a humorous payoff; do not end in sadness or melodrama unless explicitly requested. For sad or emotional stories, build a sincere emotional arc without inserting jokes. For other genres, use their matching conventions consistently.
7. End with a satisfying payoff appropriate to the selected genre or inferred tone. A twist or cliffhanger is optional and must not undermine the requested tone.
8. Target length should fit the requested duration at roughly 150 spoken words per minute (about 2.5 words per second).

OUTPUT FORMAT:
- Return ONLY the story script, nothing else.
- No scene directions, no narrator labels, just the pure story text.
- Write in the requested language (Hindi, English, or Nepali).
"""

GENRE_GUIDANCE = {
    "Funny": "Comedy is the main experience: use a playful setup, comic misunderstanding or absurdity, escalating funny beats, and a humorous payoff. Avoid a sad reveal, loss, death, or sentimental turn unless the creator explicitly asks for that blend.",
    "Horror": "Build unease and suspense with eerie details and a frightening but non-graphic payoff. Do not turn the ending into a joke.",
    "Sci-Fi": "Center a speculative science or technology idea, keep its rules coherent, and create wonder, tension, or discovery rather than unrelated melodrama.",
    "Mystery": "Present a clear question, plant clues, and resolve the central mystery with a logical reveal. Avoid unrelated emotional twists.",
    "Sad": "Build a sincere, emotionally moving arc around loss, longing, or resilience. Do not add jokes or a comic ending unless requested.",
    "Opposite World Funny": "Use one clear rule that reverses everyday expectations, apply it consistently, and build comedy from the consequences through a funny payoff.",
    "Cute Kid Funny": "Keep the humor gentle, innocent, and child-friendly, with a playful situation and warm comic payoff. Avoid adult themes or a sad reveal.",
    "Fruits & Veggies Funny": "Use expressive fruit or vegetable characters and a playful comic situation, escalating to a humorous payoff. Keep the tone light throughout.",
    "Fruits & Veggies Emotion": "Use fruit or vegetable characters in a sincere, touching emotional story. Do not turn the emotional payoff into a joke unless requested.",
}


def _genre_guidance(genre: str) -> str:
    if not genre:
        return "Infer a fitting genre from the creator's story brief. Follow any tone they describe; otherwise choose a cohesive tone that fits the idea."
    return GENRE_GUIDANCE.get(
        genre,
        f"Keep the story's hook, conflict, character behavior, and ending consistent with the requested {genre!r} tone.",
    )


def run_story_writer(state: dict) -> dict:
    """
    LangGraph node: Generates a viral story based on the research data.
    If the reviewer has provided feedback, incorporates it into the revision.
    """
    best_topic = state.get("best_topic") or "an original short-form story"
    language = state.get("language", "English")
    genre = state.get("genre") or ""
    video_style = state.get("video_style") or ""
    target_duration = state.get("target_duration", 60)
    reviewer_feedback = state.get("reviewer_feedback", None)
    revision_count = state.get("revision_count", 0)

    genre_guidance = _genre_guidance(genre)
    print(f"✍️  [Story Writer] Writing {genre or 'brief-guided'} story in {language} (revision #{revision_count})...")
    creator_brief = state.get("creator_topic", "").strip()
    genre_description = genre or "Not specified; infer a fitting tone from the creator's brief, or invent one that fits the story."
    visual_style_description = video_style or "Not specified; follow any visual direction in the creator's brief, or choose a fitting style."
    story_idea_instruction = (
        f"Use this creator-provided story idea as the premise: {creator_brief}"
        if creator_brief
        else "The creator did not provide a story idea. Invent an original, engaging premise and write the complete story from scratch, guided by the selected genre, visual style, language, and duration."
    )

    if reviewer_feedback:
        # Revision mode: incorporate feedback
        prompt = f"""The previous story was rejected. Here is the feedback:

FEEDBACK: {reviewer_feedback}

PREVIOUS STORY:
{state.get('story', '')}

Please rewrite the story addressing all the feedback points.
{story_idea_instruction}
Target duration: {target_duration} seconds (aim for about {round(target_duration * 2.5)} spoken words).
Language: {language}
Selected genre (must control the emotional tone): {genre_description}
Genre guidance: {genre_guidance}
Visual style: {visual_style_description} (visuals only; do not change the genre's tone)
Keep every part of the rewrite consistent with the selected genre or the tone inferred from the creator's brief, including its ending. Address the review feedback without introducing a conflicting tone.
"""
    else:
        # First draft mode
        trending = state.get("trending_videos", [])
        my_top = state.get("my_top_videos", [])
        web_context = state.get("web_context", [])

        context_block = ""
        if trending:
            trending_titles = [v.get("title", "") if isinstance(v, dict) else str(v) for v in trending[:3]]
            context_block += f"\nCurrently trending titles for inspiration (DON'T COPY): {', '.join(trending_titles)}"
        if my_top:
            context_block += f"\nYour past top-performing videos (audience loves these styles): {', '.join(my_top[:3])}"
        research_brief = state.get("research_brief", {})
        if research_brief and research_brief.get("status") != "skipped":
            context_block += f"\nFINAL STRUCTURED RESEARCH BRIEF (this is the analyst's cleaned conclusion; use it as evidence, do not copy wording):\n{research_brief}"
        elif web_context:
            context_block += f"\nWeb context about the topic: {' '.join(str(item) for item in web_context[:2])}"

        prompt = f"""Write a clear, engaging short-form video story.

Language: {language}
Selected genre (primary creative constraint): {genre_description}
Genre guidance: {genre_guidance}
Visual style: {visual_style_description} (visuals only; do not change the genre's tone)
Target duration: {target_duration} seconds (aim for about {round(target_duration * 2.5)} spoken words).
{story_idea_instruction}
{context_block}

Keep the hook, development, and payoff in the selected genre or the tone inferred from the creator's brief. Use research only as supporting context; do not let it override the requested tone.
"""

    messages = [
        SystemMessage(content=STORY_WRITER_SYSTEM_PROMPT),
        HumanMessage(content=prompt),
    ]

    response = robust_llm_invoke(messages, temperature=0.85)
    story = response.content.strip()

    print(f"✅ [Story Writer] Story generated ({len(story.split())} words).")

    return {
        **state,
        "story": story,
        "revision_count": revision_count + 1,
        "reviewer_feedback": None,  # Clear feedback after revision
    }
