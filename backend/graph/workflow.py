"""LangGraph workflows for story review and explicitly approved production."""

from langgraph.graph import StateGraph, START, END
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
    review_pass_count: int
    ai_review_approved: bool
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
    if state.get("manual_review_required", False):
        return "manual_review"
    if state.get("ai_review_approved", False):
        return "finished"
    return "needs_revision"


def build_story_workflow():
    workflow = StateGraph(VideoPackageState)
    workflow.add_node("researcher", run_research)
    workflow.add_node("story_writer", run_story_writer)
    workflow.add_node("duplication_checker", run_duplication_checker)
    workflow.add_node("reviewer", run_reviewer)
    workflow.set_entry_point("researcher")
    workflow.add_edge("researcher", "story_writer")
    workflow.add_edge("story_writer", "duplication_checker")
    workflow.add_edge("duplication_checker", "reviewer")
    workflow.add_conditional_edges(
        "reviewer",
        should_revise_or_continue,
        {
            "needs_revision": "story_writer",
            "finished": END,
            "manual_review": END,
        },
    )
    return workflow.compile()


def build_review_workflow(rewrite: bool = False):
    workflow = StateGraph(VideoPackageState)
    if rewrite:
        workflow.add_node("story_writer", run_story_writer)
        workflow.add_edge(START, "story_writer")
        first_node = "story_writer"
    else:
        first_node = "duplication_checker"
        workflow.add_edge(START, first_node)
    workflow.add_node("duplication_checker", run_duplication_checker)
    workflow.add_node("reviewer", run_reviewer)
    workflow.add_edge(first_node, "duplication_checker")
    workflow.add_edge("duplication_checker", "reviewer")
    workflow.add_conditional_edges(
        "reviewer",
        should_revise_or_continue,
        {
            "needs_revision": "story_writer",
            "finished": END,
            "manual_review": END,
        },
    )
    if not rewrite:
        workflow.add_node("story_writer", run_story_writer)
        workflow.add_edge("story_writer", "duplication_checker")
    return workflow.compile()


def build_production_workflow():
    workflow = StateGraph(VideoPackageState)
    workflow.add_node("character_designer", run_character_designer)
    workflow.add_node("prompt_engineer", run_prompt_engineer)
    workflow.add_node("seo_specialist", run_seo_specialist)
    workflow.add_edge(START, "character_designer")
    workflow.add_edge("character_designer", "prompt_engineer")
    workflow.add_edge("prompt_engineer", "seo_specialist")
    workflow.add_edge("seo_specialist", END)
    return workflow.compile()


story_app = build_story_workflow()
review_app = build_review_workflow()
rewrite_app = build_review_workflow(rewrite=True)
production_app = build_production_workflow()


def create_initial_state(
    language: str = "English",
    video_style: str = "Hyper-Realistic",
    genre: str = "Funny",
) -> VideoPackageState:
    return {
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
        "review_pass_count": 0,
        "ai_review_approved": False,
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


def run_full_pipeline(language: str = "English", video_style: str = "Hyper-Realistic", genre: str = "Funny") -> dict:
    """Run story generation and review only; production requires creator approval."""
    final_state = create_initial_state(language, video_style, genre)
    for update in story_app.stream(final_state, stream_mode="updates"):
        for state_update in update.values():
            final_state.update(state_update)
    return final_state


def run_pipeline_stream(language: str = "English", video_style: str = "Hyper-Realistic", genre: str = "Funny"):
    """Run story generation and AI review, stopping before any production assets."""
    initial_state = create_initial_state(language, video_style, genre)
    yield from story_app.stream(initial_state, stream_mode="updates")


def run_story_review_stream(state: VideoPackageState, change_request: str | None = None):
    """Review a creator-submitted version, optionally applying a requested rewrite."""
    review_state = {
        **state,
        "story_approved": False,
        "ai_review_approved": False,
        "manual_review_required": False,
        "review_pass_count": 0,
        "revision_count": 0,
        "reviewer_feedback": change_request,
    }
    graph = rewrite_app if change_request else review_app
    yield from graph.stream(review_state, stream_mode="updates")


def run_production_stream(state: VideoPackageState):
    """Generate production assets from a creator-approved story state."""
    if not state.get("story_approved", False):
        raise ValueError("Production generation requires an explicitly approved story.")
    yield from production_app.stream(state, stream_mode="updates")
