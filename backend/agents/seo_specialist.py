"""
SEO Specialist Agent
Generates optimized Titles, Descriptions, and Hashtags
specifically tailored for each platform's algorithm:
  - YouTube Shorts
  - TikTok
  - Instagram Reels
  - Facebook Reels
"""

import os
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

from utils.llm_manager import robust_llm_invoke

load_dotenv()

SEO_SYSTEM_PROMPT = """You are an expert social media SEO strategist specializing in short-form video content.
Create clear, platform-appropriate metadata grounded in the supplied story. Do not promise reach or performance, claim something is trending, or invent trending audio.

=== PLATFORM GUIDELINES ===

YOUTUBE SHORTS:
- Title: 40-70 characters, include a number or "POV:" or a question, add power words (Shocking, Secret, Revealed).
  Example: "This AI Revealed A Secret That Changed Everything 😱"
- Description: 150-300 characters. Include keywords naturally. Add a call to action ("Follow for more!"). MUST append the tags/hashtags at the very end of the description text.
- Tags: 3-8 specific tags grounded in the story. Do not describe tags as viral or trending.

TIKTOK:
- Caption: 100-150 characters MAX. Use a story-specific hook. Never invent a trending sound.
  Example: "POV: The AI predicted your future 😱 #AITikTok #fyp"
- Hashtags: 3-6 relevant hashtags. Do not add unrelated reach-bait tags.
- Note: No separate title on TikTok - caption IS the title.

INSTAGRAM REELS:
- Caption: 125-200 characters (more gets cut off). Include a hook in first line.
- Hashtags: 20-30 hashtags. Mix sizes (popular, medium, niche). Put hashtags in caption or first comment.
- Must include a CTA ("Save this!", "Tag someone!", "Follow for more!").

FACEBOOK REELS:
- Caption: 200-400 characters. Can be more conversational and story-like.
- Hashtags: 5-10 hashtags only. Facebook doesn't reward hashtag stuffing.
- Include a question to drive comments ("Have you ever experienced this? Tell me below!").

=== OUTPUT FORMAT (STRICT JSON) ===
{
  "youtube": {
    "title": "...",
    "description": "...",
    "tags": ["tag1", "tag2", "..."]
  },
  "tiktok": {
    "caption": "... #fyp #foryou #AITikTok",
    "hashtags": ["fyp", "foryou", "..."]
  },
  "instagram": {
    "caption": "...",
    "hashtags": ["tag1", "tag2", "..."]
  },
  "facebook": {
    "caption": "...",
    "hashtags": ["tag1", "tag2", "..."]
  }
}
"""


def run_seo_specialist(state: dict) -> dict:
    """
    LangGraph node: Generates platform-specific SEO metadata for all 4 platforms.
    """
    story = state.get("story", "")
    best_topic = state.get("best_topic", "AI story")
    language = state.get("language", "English")

    print("📈 [SEO Specialist] Generating platform-specific metadata...")

    messages = [
        SystemMessage(content=SEO_SYSTEM_PROMPT),
        HumanMessage(
            content=f"""Generate SEO-optimized titles, descriptions, and hashtags for this short-form video.

Story Topic: {best_topic}
Story Language: {language}
Story Summary:
{story[:500]}...

Generate metadata for: {', '.join(state.get('selected_platforms', ['youtube', 'tiktok', 'instagram', 'facebook']))}.
"""
        ),
    ]

    response = robust_llm_invoke(messages, temperature=0.75)
    raw = response.content.strip()

    import json
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        seo_metadata = json.loads(raw[start:end])
    except (json.JSONDecodeError, ValueError) as error:
        raise ValueError(f"Metadata generation returned invalid JSON: {error}") from error
    selected = set(state.get("selected_platforms", ["youtube", "tiktok", "instagram", "facebook"]))
    seo_metadata = {key: value for key, value in seo_metadata.items() if key in selected}
    if not seo_metadata or any(not isinstance(value, dict) or not value for value in seo_metadata.values()):
        raise ValueError("Metadata generation returned no usable platform metadata.")

    print(f"✅ [SEO Specialist] Metadata generated for {len(seo_metadata)} selected platform(s).")

    return {**state, "seo_metadata": seo_metadata}
