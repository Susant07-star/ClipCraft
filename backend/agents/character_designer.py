"""
Character Designer Agent
Before video generation, creates detailed character reference prompts
for each character in the story. These prompts are then referenced in
every video generation clip for visual consistency.
"""

import os
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

from utils.llm_manager import robust_llm_invoke

load_dotenv()

CHARACTER_DESIGNER_SYSTEM_PROMPT = """You are a professional AI character concept artist and prompt engineer.
Your task is to read a short-form video story and identify its characters.
For each character, create a detailed, consistent reference prompt suitable for
use with external image and video generation tools.

CHARACTER PROMPT RULES:
1. Describe the character's appearance in rich, specific detail: age, ethnicity, hair (color, length, style), eyes, skin tone, facial features.
2. Describe their clothing specific to the story's era/setting.
3. Describe their signature physical trait or expression (e.g., "always has a worried look", "strong build with calm eyes").
4. Keep each character description to 2-3 dense sentences.
5. Make sure each character is VISUALLY DISTINCT from the others.
6. Include the character's name and role so creators can match the description to the story.

OUTPUT FORMAT (STRICT JSON):
{
  "characters": [
    {
      "name": "Character Name as in story",
      "role": "protagonist / antagonist / supporting",
      "voice_style": "e.g., young female, soft and gentle | old male, deep and raspy",
      "reference_prompt": "Detailed visual description for the character reference image..."
    }
  ]
}
"""


def run_character_designer(state: dict) -> dict:
    """
    LangGraph node: Reads the approved story and generates character reference prompts.
    """
    story = state.get("story", "")
    video_style = state.get("video_style", "Hyper-Realistic")
    print(f"🎨 [Character Designer] Identifying and designing characters (Style: {video_style})...")

    messages = [
        SystemMessage(content=CHARACTER_DESIGNER_SYSTEM_PROMPT),
        HumanMessage(content=f"Read this story and create character reference prompts for all named characters:\n\n{story}\n\nIMPORTANT VISUAL STYLE: Make sure all character descriptions explicitly match this style: {video_style}"),
    ]

    response = robust_llm_invoke(messages, temperature=0.6)
    raw = response.content.strip()

    import json
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        result = json.loads(raw[start:end])
        characters = result.get("characters", [])
    except (json.JSONDecodeError, ValueError):
        characters = []

    print(f"✅ [Character Designer] Designed {len(characters)} character(s).")

    return {**state, "characters": characters}
