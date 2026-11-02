"""
Prompt Engineer Agent
Splits the finalized story into sequential 10-second video generation prompts
for compatible external video-generation tools.

Each prompt is a complete production package:
  [VISUAL]          - Camera shot, scene, lighting, character actions
  [CHARACTER VOICE] - Character name, voice style, exact dialogue
  [BACKGROUND MUSIC]- Genre, mood, intensity
  [SOUND EFFECTS]   - Specific sounds for the scene

Also generates:
  - Character attachment guide (which characters to attach to which clip)
  - Thumbnail prompt (9:16 aspect ratio)
"""

import json
import re
from langchain_core.messages import SystemMessage, HumanMessage

from utils.llm_manager import robust_llm_invoke

PROMPT_ENGINEER_SYSTEM_PROMPT = """You are a professional short-form video prompt engineer.
Write self-contained prompts that can be adapted to common external video-generation tools.

=== VIDEO PROMPT GUIDELINES ===
1. USE RICH, SPECIFIC DESCRIPTIVE LANGUAGE — Never say "a person walks". Say "A young woman in a torn red saree stumbles through a foggy midnight forest, her bare feet stepping over glowing embers."
2. SPECIFY CAMERA SHOT TYPE AND MOTION — Always include one of: close-up shot, extreme close-up, wide establishing shot, over-the-shoulder shot, slow dolly-in, aerial pan, tracking shot, bird's-eye view.
3. KEEP EACH CLIP SELF-CONTAINED — Each 10-second prompt must fully describe the scene context without assuming the viewer has seen the previous clip.
4. CONSISTENT CHARACTER DESCRIPTIONS — Use the EXACT same physical description for characters across ALL clips. No switching from "young man" to "teenage boy" for the same character.
5. ONE SCENE PER CLIP — Never try to pack two different locations into a single 10-second prompt.
6. DESCRIBE LIGHTING — Always specify: "golden hour light", "dim candlelight", "neon-lit room", "harsh fluorescent lighting", "moonlit forest".
7. SPECIFY AUDIO CAREFULLY — For character voices, always state: character name, voice type, and the EXACT words they say. This prevents voice mixing.

=== OUTPUT FORMAT (STRICT JSON) ===
Return a JSON object with this exact structure:
{
  "clips": [
    {
      "clip_number": 1,
      "time_range": "0-10s",
      "characters_to_attach": ["Character Name A", "Character Name B"],
      "visual": "Full rich visual description following the video prompt guidelines...",
      "character_voice": "[CHARACTER NAME - VOICE STYLE]: 'Exact dialogue here.' OR 'No dialogue in this clip.'",
      "background_music": "Specific music description...",
      "sound_effects": "Specific sound effects..."
    }
  ],
  "thumbnail_prompt": "A cinematic 9:16 vertical thumbnail image prompt for a compatible image-generation tool..."
}

For the thumbnail_prompt:
- It must be for a 9:16 vertical aspect ratio (short-form content)
- It should capture the most dramatic/curious moment of the story
- Include bold colors, dramatic lighting, and a strong focal point
- Make it visually click-worthy
"""


def run_prompt_engineer(state: dict) -> dict:
    """
    LangGraph node: Converts the approved story into video and thumbnail prompts.
    """
    story = state.get("story", "")
    characters = state.get("characters", [])
    language = state.get("language", "English")
    video_style = state.get("video_style", "Hyper-Realistic")

    print(f"🎬 [Prompt Engineer] Building cinematic video prompts (Style: {video_style})...")

    # Format character context for the LLM
    char_context = ""
    if characters:
        char_context = "\n\nCHARACTER REFERENCE GUIDE (maintain consistency across all clips):\n"
        for char in characters:
            char_context += f"- {char['name']} ({char['role']}): {char['reference_prompt']}\n"
            char_context += f"  Voice: {char.get('voice_style', 'neutral')}\n"

    messages = [
        SystemMessage(content=PROMPT_ENGINEER_SYSTEM_PROMPT),
        HumanMessage(
            content=f"""Convert this story into sequential 10-second video-generation prompts.

STORY (in {language}):
{story}
{char_context}

Instructions:
- Calculate total clips needed: divide the story length by 10 seconds (70-90s story = 7-9 clips).
- Make sure the clips tell the story in sequence.
- For each clip, specify which character reference images the creator should attach if their chosen video tool supports them.
- The thumbnail should capture the most viral/dramatic moment.
- IMPORTANT ART STYLE: Ensure all visual descriptions consistently describe a "{video_style}" visual style.
"""
        ),
    ]

    response = robust_llm_invoke(messages, temperature=0.7)
    raw = response.content.strip()

    # Strip markdown code fences (```json ... ```) if present
    raw_clean = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
    raw_clean = re.sub(r"```\s*$", "", raw_clean, flags=re.MULTILINE).strip()
    
    clips = []
    thumbnail_prompt = ""
    
    try:
        start = raw_clean.find("{")
        end = raw_clean.rfind("}") + 1
        if start == -1 or end == 0:
            raise ValueError("No JSON object found in response")
        result = json.loads(raw_clean[start:end])
        # Accept both 'clips' and 'video_clips' keys
        clips = result.get("clips", result.get("video_clips", []))
        thumbnail_prompt = result.get("thumbnail_prompt", "")
    except (json.JSONDecodeError, ValueError) as e:
        print(f"⚠️ [Prompt Engineer] JSON parse error: {e}")
        print(f"⚠️ [Prompt Engineer] Raw response was:\n{raw[:1000]}")
        clips = []
        thumbnail_prompt = ""

    print(f"✅ [Prompt Engineer] Generated {len(clips)} video clips + thumbnail prompt.")

    return {
        **state,
        "video_clips": clips,
        "thumbnail_prompt": thumbnail_prompt,
    }


def run_prompt_fix(story: str, characters: list, clip_number: int, error_description: str) -> dict:
    """
    Standalone function for the chatbox: Regenerates a SINGLE specific clip
    when the user reports an error from an external video-generation tool.
    """
    print(f"🔧 [Prompt Engineer] Fixing clip #{clip_number} due to: {error_description}")

    char_context = ""
    if characters:
        char_context = "\n\nCHARACTER REFERENCE GUIDE:\n"
        for char in characters:
            char_context += f"- {char['name']}: {char['reference_prompt']}\n"

    fix_prompt = f"""A specific clip from a video generation workflow returned an error.
The user reported this error: "{error_description}"

Please regenerate ONLY clip #{clip_number} from this story:
{story}
{char_context}

Fix the issue described in the error. Return ONLY the regenerated clip in this JSON format:
{{
  "clip_number": {clip_number},
  "time_range": "Xs-Ys",
  "characters_to_attach": ["..."],
  "visual": "...",
  "character_voice": "...",
  "background_music": "...",
  "sound_effects": "..."
}}
"""

    messages = [
        SystemMessage(content=PROMPT_ENGINEER_SYSTEM_PROMPT),
        HumanMessage(content=fix_prompt),
    ]

    response = robust_llm_invoke(messages, temperature=0.7)
    raw = response.content.strip()

    import json
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        return json.loads(raw[start:end])
    except (json.JSONDecodeError, ValueError):
        return {"error": "Could not regenerate the clip. Please try again."}
