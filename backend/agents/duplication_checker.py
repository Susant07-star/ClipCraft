"""
Duplication Checker Agent
Checks the newly generated story against past stories stored in Supabase.
Uses a low-tier, fast model to evaluate whether the core plot is too similar to
recent uploads, preventing repetitive content.
"""

import json

from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

from database.supabase_client import get_all_packages
from utils.llm_manager import robust_llm_invoke

load_dotenv()

DUPLICATION_SYSTEM_PROMPT = """You are a strictly analytical content duplication checker.
Your job is to compare a NEW STORY against a list of PAST STORIES.

You must determine if the NEW STORY shares the EXACT SAME core plot, twist, or unique concept as any of the PAST STORIES.
(It is okay if they share a general theme like 'AI', but the specific events, characters, or twist must be different).

== OUTPUT FORMAT (STRICT JSON) ==
You MUST respond with ONLY a valid JSON object in this exact format:
{
  "is_duplicate": <true or false>,
  "feedback": "<if duplicate, explain exactly which past story it copied and why. If unique, output 'Story is unique.'>"
}
"""


def run_duplication_checker(state: dict) -> dict:
    """
    LangGraph node: Checks if the story is a duplicate of recent uploads.
    """
    story = state.get("story", "")

    print("🔍 [Duplication Checker] Checking against recent database uploads...")

    try:
        recent_packages = get_all_packages(limit=10)
        past_stories = [p.get("story", "") for p in recent_packages if p.get("story")]
    except Exception as e:
        print(f"⚠️ [Duplication Checker] Could not fetch past stories (db error). Passing story. Error: {e}")
        return {**state, "is_duplicate": False, "duplication_feedback": None}

    if not past_stories:
        print("✅ [Duplication Checker] No past stories found in database. Story is unique.")
        return {**state, "is_duplicate": False, "duplication_feedback": None}

    past_stories_text = ""
    for i, past_story in enumerate(past_stories, 1):
        past_stories_text += f"\n--- PAST STORY {i} ---\n{past_story}\n"

    messages = [
        SystemMessage(content=DUPLICATION_SYSTEM_PROMPT),
        HumanMessage(content=f"NEW STORY TO CHECK:\n{story}\n\n{past_stories_text}"),
    ]

    response = robust_llm_invoke(messages, temperature=0.1)
    raw = response.content.strip()

    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        result = json.loads(raw[start:end])
        is_duplicate = result.get("is_duplicate", False)
        feedback = result.get("feedback", "No feedback provided.")

        if not isinstance(is_duplicate, bool):
            raise ValueError("is_duplicate must be a boolean")
        if not isinstance(feedback, str) or not feedback.strip():
            raise ValueError("feedback must be a non-empty string")
    except (json.JSONDecodeError, ValueError):
        print("⚠️ [Duplication Checker] Invalid response; requiring manual review.")
        return {
            **state,
            "is_duplicate": False,
            "duplication_feedback": "Duplication check could not be validated.",
            "manual_review_required": True,
            "story_approved": False,
        }

    if is_duplicate:
        print(f"❌ [Duplication Checker] DUPLICATE DETECTED! Sending back for revision. Feedback: {feedback}")
        return {
            **state,
            "story_approved": False,
            "is_duplicate": True,
            "duplication_feedback": feedback,
            "reviewer_feedback": f"DUPLICATION ERROR: {feedback}. Please write a completely different story concept.",
        }

    print("✅ [Duplication Checker] Story is unique. Proceeding to Reviewer.")
    return {**state, "is_duplicate": False, "duplication_feedback": None}
