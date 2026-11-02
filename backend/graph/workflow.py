"""
LangGraph Workflow Orchestrator
Connects all agents into a complete pipeline with a cyclic
Writer <-> Reviewer loop until the story is approved.

Flow:
  researcher → story_writer → duplication_checker → reviewer ──(rejected)──→ story_writer (loop)
                                                        ↓ (approved)
                                            character_designer → prompt_engineer → seo_specialist → END
"""

from langgraph.graph import StateGraph, END
from typing import TypedDict, Optional

from agents.researcher import run_research
from agents.story_writer import run_story_writer
from agents.duplication_checker import run_duplication_checker
from agents.reviewer import run_reviewer
from agents.character_designer import run_character_designer
from agents.prompt_engineer import run_prompt_engineer
from agents.seo_specialist import run_seo_specialist


# ─────────────────────────────────────────────
# State Schema (shared between all agents)
# ─────────────────────────────────────────────
class VideoPackageState(TypedDict):
    # Research outputs
    trending_videos: list
    my_top_videos: list
    best_topic: str
    trend_scores: dict
    web_context: list
    meta_evidence: dict
    research_brief: dict
    research_trace: list
    research_errors: list

    # Story generation
    genre: str
    language: str
    video_style: str
    story: str
    revision_count: int
    story_approved: bool
    manual_review_required: bool
    is_duplicate: bool
    duplication_feedback: Optional[str]
    virality_score: int
    reviewer_feedback: Optional[str]

    # Character design
    characters: list

    # Video prompts
    video_clips: list
    thumbnail_prompt: str

    # SEO metadata
    seo_metadata: dict


# ─────────────────────────────────────────────
# Conditional Edge: Approve or Revise?
# ─────────────────────────────────────────────
def should_revise_or_continue(state: VideoPackageState) -> str:
    """
    Router: If story is approved, move to character design.
    If rejected, send back to the story writer for revision.
    """
    if state.get("story_approved", False):
        return "approved"
    if state.get("manual_review_required", False):
        return "manual_review"
    return "needs_revision"


# ─────────────────────────────────────────────
# Build the LangGraph Workflow
# ─────────────────────────────────────────────
def build_workflow() -> StateGraph:
    workflow = StateGraph(VideoPackageState)

    # Add all agent nodes
    workflow.add_node("researcher", run_research)
    workflow.add_node("story_writer", run_story_writer)
    workflow.add_node("duplication_checker", run_duplication_checker)
    workflow.add_node("reviewer", run_reviewer)
    workflow.add_node("character_designer", run_character_designer)
    workflow.add_node("prompt_engineer", run_prompt_engineer)
    workflow.add_node("seo_specialist", run_seo_specialist)

    # Set the entry point
    workflow.set_entry_point("researcher")

    # Define the linear flow
    workflow.add_edge("researcher", "story_writer")
    workflow.add_edge("story_writer", "duplication_checker")
    workflow.add_edge("duplication_checker", "reviewer")

    # Conditional edge: revision loop OR proceed
    workflow.add_conditional_edges(
        "reviewer",
        should_revise_or_continue,
        {
            "needs_revision": "story_writer",  # Loop back for revision
            "approved": "character_designer",  # Proceed to next stage
            "manual_review": END,
        },
    )

    # After story approval, continue linearly
    workflow.add_edge("character_designer", "prompt_engineer")
    workflow.add_edge("prompt_engineer", "seo_specialist")
    workflow.add_edge("seo_specialist", END)

    return workflow.compile()


# Compiled workflow (singleton)
app = build_workflow()


def run_full_pipeline(language: str = "English", video_style: str = "Hyper-Realistic", genre: str = "Funny") -> dict:
    """
    Runs the complete video package generation pipeline.
    Returns the full state with all generated assets.
    """
    print("\n🚀 Starting AI Video Generation Pipeline...\n")

    initial_state: VideoPackageState = {
        "trending_videos": [],
        "my_top_videos": [],
        "best_topic": "",
        "trend_scores": {},
        "web_context": [],
        "meta_evidence": {},
        "research_brief": {},
        "research_trace": [],
        "research_errors": [],
        "genre": genre,
        "language": language,
        "video_style": video_style,
        "story": "",
        "revision_count": 0,
        "story_approved": False,
        "manual_review_required": False,
        "is_duplicate": False,
        "duplication_feedback": None,
        "virality_score": 0,
        "reviewer_feedback": None,
        "characters": [],
        "video_clips": [],
        "thumbnail_prompt": "",
        "seo_metadata": {},
    }

    final_state = app.invoke(initial_state)
    print("\n🎉 Pipeline Complete! Video package is ready.\n")
    return final_state


def run_pipeline_stream(language: str = "English", video_style: str = "Hyper-Realistic", genre: str = "Funny"):
    """
    Runs the pipeline and yields intermediate state updates.
    """
    initial_state: VideoPackageState = {
        "trending_videos": [],
        "my_top_videos": [],
        "best_topic": "",
        "trend_scores": {},
        "web_context": [],
        "meta_evidence": {},
        "research_brief": {},
        "research_trace": [],
        "research_errors": [],
        "genre": genre,
        "language": language,
        "video_style": video_style,
        "story": "",
        "revision_count": 0,
        "story_approved": False,
        "manual_review_required": False,
        "is_duplicate": False,
        "duplication_feedback": None,
        "virality_score": 0,
        "reviewer_feedback": None,
        "characters": [],
        "video_clips": [],
        "thumbnail_prompt": "",
        "seo_metadata": {},
    }

    for output in app.stream(initial_state):
        yield output
