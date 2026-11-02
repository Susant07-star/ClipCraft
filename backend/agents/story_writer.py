"""
Story Writer Agent
Drafts a highly engaging, 70-90 second viral short-form story
in Hindi, English, or Nepali using Meta Muse Spark Open through Baseten.
"""

import os
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

from utils.llm_manager import robust_llm_invoke

load_dotenv()

STORY_WRITER_SYSTEM_PROMPT = """You are a world-class viral short-form video scriptwriter specializing in AI-generated content for YouTube Shorts, TikTok, Instagram Reels, and Facebook Reels.

Your goal is to write HIGHLY ENGAGING, MONETIZABLE stories that are 70 to 90 seconds long when read at a natural speaking pace.

CRITICAL RULES:
1. The story MUST hook the viewer in the first 3 seconds with a shocking statement, question, or visual.
2. Use a clear 3-act structure: HOOK → RISING TENSION → SHOCKING REVEAL/ENDING.
3. The story MUST be original — no copyrighted material, no real named celebrities.
4. Avoid anything that violates YouTube/TikTok/Instagram community guidelines: No graphic violence, no hate speech, no sexual content, no misinformation presented as fact.
5. Keep sentences SHORT and punchy — this is a voiceover script, not an essay.
6. Adapt the EMOTIONAL TONE perfectly to the topic. If it's a comedy, make it hilarious. If horror, make it terrifying. If sad, make it emotional.
7. End with a cliffhanger or a twist that makes viewers want to share.
8. Target length: 150-200 words (reads as 70-90 seconds at a natural pace).

OUTPUT FORMAT:
- Return ONLY the story script, nothing else.
- No scene directions, no narrator labels, just the pure story text.
- Write in the requested language (Hindi, English, or Nepali).
"""


def run_story_writer(state: dict) -> dict:
    """
    LangGraph node: Generates a viral story based on the research data.
    If the reviewer has provided feedback, incorporates it into the revision.
    """
    best_topic = state.get("best_topic", "AI mystery story")
    language = state.get("language", "English")
    genre = state.get("genre", "Funny")
    video_style = state.get("video_style", "Hyper-Realistic")
    reviewer_feedback = state.get("reviewer_feedback", None)
    revision_count = state.get("revision_count", 0)

    print(f"✍️  [Story Writer] Writing story in {language} (revision #{revision_count})...")

    if reviewer_feedback:
        # Revision mode: incorporate feedback
        prompt = f"""The previous story was rejected. Here is the feedback:

FEEDBACK: {reviewer_feedback}

PREVIOUS STORY:
{state.get('story', '')}

Please rewrite the story addressing all the feedback points.
Topic: {best_topic}
Language: {language}
Genre: {genre}
Video Style/Theme: {video_style}
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
        if research_brief:
            context_block += f"\nFINAL STRUCTURED RESEARCH BRIEF (this is the analyst's cleaned conclusion; use it as evidence, do not copy wording):\n{research_brief}"
        elif web_context:
            context_block += f"\nWeb context about the topic: {' '.join(str(item) for item in web_context[:2])}"

        prompt = f"""Write a viral, engaging short-form video story about: {best_topic}

Language: {language}
Genre: {genre}
Visual Style: {video_style} (Please subtly match the story's descriptive tone to this visual style)
{context_block}

Remember: Hook in the first 3 seconds, build tension, end with a twist.
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
