"""
Reviewer Agent
Acts as a dual-purpose quality gate:
  1. VIRALITY CHECK: Scores the story on engagement hooks, emotional impact, and shareability.
  2. POLICY CHECK: Ensures the story doesn't violate YouTube, TikTok, or Instagram guidelines
     to prevent copyright/community guideline strikes.

If the story fails either check, it sends it back to the Story Writer with specific feedback.
After three review passes, an unapproved story is handed off for manual review.
"""

import json

from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

from utils.llm_manager import robust_llm_invoke

load_dotenv()

MAX_REVIEW_PASSES = 3

REVIEWER_SYSTEM_PROMPT = """You are a strict video content quality reviewer and platform policy expert.
Your job is to evaluate a short-form video script for fit with the creator's brief, editorial quality, and policy compliance:

== GENRE AND BRIEF MATCH ==
If the creator selected a genre, treat it as the primary creative constraint. Check that the hook, main conflict, emotional tone, and ending consistently fit it. If the requested genre is Funny, a story whose main effect is sadness or melodrama does not match, even if it is well written.
If no genre was selected, check that the story follows the tone and direction in the creator's brief. Do not require a specific genre when none was chosen.

== VIRALITY SCORE (1-10) ==
Score the story on:
- Hook strength (does it grab attention in 3 seconds?)
- Emotional engagement (curiosity, suspense, surprise, inspiration)
- Shareability (would viewers share this?)
- Originality (is it a fresh angle?)
- Retention (does it keep viewers watching to the end?)

== POLICY CHECK ==
Flag ANY of these violations:
- Graphic violence or gore
- Hate speech or discrimination
- Sexual or suggestive content
- Real named celebrities presented negatively
- Dangerous misinformation presented as fact
- Copyright-infringing storylines or characters
- Content that could earn a YouTube strike

== OUTPUT FORMAT (STRICT JSON) ==
You MUST respond with ONLY a valid JSON object in this exact format:
{
  "virality_score": <number 1-10>,
  "approved": <true or false>,
  "feedback": "<specific improvement instructions if not approved, or 'Story approved.' if approved>"
}

Rules for approval:
- approved = true ONLY if virality_score >= 7 AND no policy violations found.
- If virality_score < 7 OR there are policy violations, approved = false.
- feedback must be SPECIFIC and actionable (e.g., "The hook is too weak. Start with a shocking question instead. Also, remove the reference to [X] as it could be seen as promoting violence.")
"""


def run_reviewer(state: dict) -> dict:
    """
    LangGraph node: Reviews the story for editorial quality and policy concerns.
    Counts review passes independently from story-writer runs.
    """
    story = state.get("story", "")
    genre = state.get("genre") or ""
    review_pass_count = state.get("review_pass_count", 0)

    if review_pass_count >= MAX_REVIEW_PASSES:
        print(f"⚠️  [Reviewer] Max review passes ({MAX_REVIEW_PASSES}) reached. Manual review required.")
        return {
            "ai_review_approved": False,
            "manual_review_required": True,
            "review_pass_count": review_pass_count,
            "reviewer_feedback": "Maximum AI review passes reached; manual review is required.",
        }

    review_pass_count += 1
    print(f"🔍 [Reviewer] Reviewing story (pass #{review_pass_count})...")

    genre_review_instruction = (
        f"Requested genre (must match): {genre}\n\nReview genre consistency as a required approval criterion, in addition to quality and policy. If it is off-genre, reject it and give specific feedback to bring the rewrite back to {genre}."
        if genre
        else f"No genre was selected. Review the story for quality and policy, and check that it follows the creator's story brief; do not require a specific genre.\n\nCreator's story brief:\n{state.get('creator_topic', '')}"
    )
    messages = [
        SystemMessage(content=REVIEWER_SYSTEM_PROMPT),
        HumanMessage(content=f"{genre_review_instruction}\n\nStory:\n{story}"),
    ]

    response = robust_llm_invoke(messages, temperature=0.1)
    raw = response.content.strip()

    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        result = json.loads(raw[start:end])
        approved = result.get("approved", False)
        feedback = result.get("feedback", "No feedback provided.")
        score = result.get("virality_score", 0)

        if not isinstance(approved, bool):
            raise ValueError("approved must be a boolean")
        if not isinstance(score, (int, float)) or isinstance(score, bool) or not 1 <= score <= 10:
            raise ValueError("virality_score must be between 1 and 10")
        if not isinstance(feedback, str) or not feedback.strip():
            raise ValueError("feedback must be a non-empty string")
    except (json.JSONDecodeError, ValueError):
        approved = False
        feedback = "Could not parse the story properly. Please rewrite with clearer structure."
        score = 0

    if state.get("is_duplicate", False):
        approved = False
        feedback = state.get("duplication_feedback") or "The story is too similar to a previous package."

    manual_review_required = not approved and review_pass_count >= MAX_REVIEW_PASSES

    if approved:
        print(f"✅ [Reviewer] Story APPROVED (Virality Score: {score}/10).")
        return {
            "ai_review_approved": True,
            "manual_review_required": False,
            "review_pass_count": review_pass_count,
            "virality_score": int(score),
            "reviewer_feedback": None,
        }

    print(f"❌ [Reviewer] Story REJECTED (Score: {score}/10). Feedback: {feedback}")
    return {
        "ai_review_approved": False,
        "manual_review_required": manual_review_required,
        "review_pass_count": review_pass_count,
        "virality_score": int(score) if isinstance(score, (int, float)) else 0,
        "reviewer_feedback": feedback,
    }
