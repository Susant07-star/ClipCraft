"""FastAPI endpoints for authenticated ClipCraft story and production workflows."""

import os
import traceback
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from supabase_auth.errors import AuthApiError

load_dotenv()

from agents.prompt_engineer import run_prompt_fix
from database.supabase_client import (
    get_all_packages,
    get_package_by_id,
    save_video_package,
    verify_access_token,
)
from graph.workflow import (
    create_initial_state,
    run_pipeline_stream,
    run_production_stream,
    run_story_review_stream,
)

app = FastAPI(
    title="ClipCraft Studio API",
    description="Authenticated story review and creator-approved production workflows.",
    version="1.1.0",
)

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")
ALLOWED_ORIGINS = list(dict.fromkeys([
    FRONTEND_URL,
    "http://localhost:3000",
    "https://oddly-possible.vercel.app",
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer_scheme = HTTPBearer(auto_error=False)
jobs: dict[str, dict[str, Any]] = {}


class GenerateRequest(BaseModel):
    genre: str = "Funny"
    language: str = "Auto"
    video_style: str = "Hyper-Realistic"


class StoryRevisionRequest(BaseModel):
    story: str | None = None
    change_request: str | None = None


class FixPromptRequest(BaseModel):
    package_id: str
    clip_number: int
    error_description: str


def _authenticated_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, str]:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="A signed-in Supabase session is required.")
    try:
        user_id = verify_access_token(credentials.credentials)
    except AuthApiError as error:
        raise HTTPException(status_code=401, detail="The Supabase session is invalid or expired.") from error
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Supabase Auth could not be reached.") from error
    except (ValueError, ConnectionError) as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    return {"id": user_id, "access_token": credentials.credentials}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _package_from_state(
    package_id: str,
    user_id: str,
    state: dict,
    status: str,
    story_versions: list[dict] | None = None,
    current_story_version: int = 0,
    approved_story_version: int | None = None,
    generation_error: str | None = None,
) -> dict:
    return {
        "id": package_id,
        "user_id": user_id,
        "status": status,
        "language": state.get("language", "English"),
        "topic": state.get("best_topic", ""),
        "virality_score": state.get("virality_score", 0),
        "trending_videos": state.get("trending_videos", []),
        "trend_scores": state.get("trend_scores", {}),
        "research_brief": state.get("research_brief", {}),
        "research_trace": state.get("research_trace", []),
        "research_errors": state.get("research_errors", []),
        "story": state.get("story", ""),
        "characters": state.get("characters", []),
        "video_clips": state.get("video_clips", []),
        "thumbnail_prompt": state.get("thumbnail_prompt", ""),
        "seo_metadata": state.get("seo_metadata", {}),
        "current_story_version": current_story_version,
        "approved_story_version": approved_story_version,
        "ai_review_approved": bool(state.get("ai_review_approved", False)),
        "story_approved": bool(state.get("story_approved", False)),
        "review_pass_count": state.get("review_pass_count", 0),
        "reviewer_feedback": state.get("reviewer_feedback"),
        "story_versions": story_versions or [],
        "workflow_state": state,
        "generation_error": generation_error,
    }


def _save_job_package(package: dict, access_token: str, user_id: str) -> dict:
    saved = save_video_package(package, access_token)
    if saved.get("user_id") != user_id:
        raise RuntimeError("Supabase returned a package that does not belong to the signed-in user.")
    job = jobs.get(package["id"])
    if job is not None:
        job["result"] = saved
    return saved


def _log(job_id: str, message: str, level: str = "info") -> None:
    job = jobs.get(job_id)
    if job is not None:
        job.setdefault("logs", []).append({
            "timestamp": _now(),
            "level": level,
            "message": message,
        })


def _cancel_requested(job_id: str) -> bool:
    job = jobs.get(job_id)
    return bool(job and job.get("cancel_requested"))


def _mark_cancelled(job_id: str, package: dict, user_id: str, access_token: str) -> None:
    package["status"] = "cancelled"
    package["generation_error"] = None
    _save_job_package(package, access_token, user_id)
    job = jobs.get(job_id)
    if job is not None:
        job["status"] = "cancelled"
    _log(job_id, "Generation cancelled at a workflow boundary", "warning")


def _set_failed(job_id: str, package: dict, user_id: str, access_token: str, error: Exception) -> None:
    message = f"{type(error).__name__}: {error}"
    job = jobs.get(job_id)
    if job is not None:
        job["status"] = "failed"
        job["error"] = message
    package["status"] = "failed"
    package["generation_error"] = message
    _log(job_id, message, "error")
    try:
        _save_job_package(package, access_token, user_id)
    except Exception:
        traceback.print_exc()


def _version_record(
    version: int,
    story: str,
    state: dict,
    status: str,
    submitted_at: str | None = None,
) -> dict:
    return {
        "version": version,
        "story": story,
        "status": status,
        "review_pass_count": state.get("review_pass_count", 0),
        "revision_count": state.get("revision_count", 0),
        "virality_score": state.get("virality_score", 0),
        "reviewer_feedback": state.get("reviewer_feedback"),
        "submitted_at": submitted_at or _now(),
    }


def run_story_pipeline_job(
    package_id: str,
    user_id: str,
    access_token: str,
    language: str,
    video_style: str,
    genre: str,
) -> None:
    """Generate and review a story, then persist it for the creator's decision."""
    job = jobs[package_id]
    job["status"] = "running"
    state = create_initial_state(language, video_style, genre)
    package = _package_from_state(package_id, user_id, state, "generating_story")
    _log(package_id, "Story generation started")
    try:
        for update in run_pipeline_stream(language, video_style, genre):
            if _cancel_requested(package_id):
                package["workflow_state"] = state
                _mark_cancelled(package_id, package, user_id, access_token)
                return
            for node_name, state_update in update.items():
                state.update(state_update)
                _log(package_id, f"Story stage completed: {node_name}")

        status = "needs_creator_review" if state.get("manual_review_required") else "awaiting_approval"
        version = _version_record(1, state.get("story", ""), state, status)
        package = _package_from_state(
            package_id,
            user_id,
            state,
            status,
            [version],
            current_story_version=1,
        )
        _save_job_package(package, access_token, user_id)
        job["status"] = status
        job["error"] = None
        _log(package_id, "Story saved and waiting for the creator's decision", "success")
    except Exception as error:
        traceback.print_exc()
        _set_failed(package_id, package, user_id, access_token, error)


def run_story_revision_job(
    package_id: str,
    user_id: str,
    access_token: str,
    package: dict,
    state: dict,
    change_request: str | None,
) -> None:
    job = jobs[package_id]
    job["status"] = "running"
    try:
        for update in run_story_review_stream(state, change_request):
            if _cancel_requested(package_id):
                package["workflow_state"] = state
                _mark_cancelled(package_id, package, user_id, access_token)
                return
            for node_name, state_update in update.items():
                state.update(state_update)
                _log(package_id, f"Story review stage completed: {node_name}")

        status = "needs_creator_review" if state.get("manual_review_required") else "awaiting_approval"
        versions = package["story_versions"]
        versions[-1] = _version_record(
            package["current_story_version"],
            state.get("story", ""),
            state,
            status,
            versions[-1].get("submitted_at"),
        )
        package = _package_from_state(
            package_id,
            user_id,
            state,
            status,
            versions,
            current_story_version=package["current_story_version"],
        )
        _save_job_package(package, access_token, user_id)
        job["status"] = status
        job["error"] = None
        _log(package_id, "Updated story version is ready for creator review", "success")
    except Exception as error:
        traceback.print_exc()
        _set_failed(package_id, package, user_id, access_token, error)


def run_production_job(
    package_id: str,
    user_id: str,
    access_token: str,
    package: dict,
    state: dict,
) -> None:
    job = jobs[package_id]
    job["status"] = "running"
    try:
        for update in run_production_stream(state):
            if _cancel_requested(package_id):
                package["workflow_state"] = state
                _mark_cancelled(package_id, package, user_id, access_token)
                return
            for node_name, state_update in update.items():
                state.update(state_update)
                package["workflow_state"] = state
                package.update({
                    "characters": state.get("characters", []),
                    "video_clips": state.get("video_clips", []),
                    "thumbnail_prompt": state.get("thumbnail_prompt", ""),
                    "seo_metadata": state.get("seo_metadata", {}),
                })
                _log(package_id, f"Production stage completed: {node_name}")
                _save_job_package(package, access_token, user_id)

        package["status"] = "completed"
        package["generation_error"] = None
        _save_job_package(package, access_token, user_id)
        job["status"] = "completed"
        job["error"] = None
        _log(package_id, "Approved-story production kit completed", "success")
    except Exception as error:
        traceback.print_exc()
        _set_failed(package_id, package, user_id, access_token, error)


@app.get("/")
def health_check():
    return {"status": "online", "message": "ClipCraft Studio API is running"}


@app.post("/generate")
def generate_video_package(
    request: GenerateRequest,
    background_tasks: BackgroundTasks,
    user: dict[str, str] = Depends(_authenticated_user),
):
    if request.language not in ["Auto", "English", "Hindi", "Nepali"]:
        raise HTTPException(status_code=400, detail="Language must be 'Auto', 'English', 'Hindi', or 'Nepali'.")

    package_id = str(uuid.uuid4())
    language = request.language
    initial_state = create_initial_state(language, request.video_style, request.genre)
    package = _package_from_state(package_id, user["id"], initial_state, "generating_story")
    try:
        saved = save_video_package(package, user["access_token"])
    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail=f"Could not save the story draft. Verify Supabase configuration and apply the authenticated schema: {type(error).__name__}.",
        ) from error
    if saved.get("user_id") != user["id"]:
        raise HTTPException(status_code=503, detail="Supabase did not confirm ownership of the saved draft.")

    jobs[package_id] = {
        "owner_id": user["id"],
        "status": "queued",
        "result": saved,
        "error": None,
        "cancel_requested": False,
        "logs": [],
    }
    background_tasks.add_task(
        run_story_pipeline_job,
        package_id,
        user["id"],
        user["access_token"],
        language,
        request.video_style,
        request.genre,
    )
    return {"job_id": package_id, "status": "queued"}


@app.post("/cancel/{job_id}")
def cancel_job(job_id: str, user: dict[str, str] = Depends(_authenticated_user)):
    job = jobs.get(job_id)
    if not job or job.get("owner_id") != user["id"]:
        raise HTTPException(status_code=404, detail="Job not found.")
    if job["status"] not in ["queued", "running"]:
        raise HTTPException(status_code=409, detail=f"Job is already {job['status']}.")
    job["cancel_requested"] = True
    _log(job_id, "Cancellation requested", "warning")
    return {"status": job["status"], "message": "Cancellation requested."}


@app.get("/status/{job_id}")
def get_job_status(job_id: str, user: dict[str, str] = Depends(_authenticated_user)):
    job = jobs.get(job_id)
    if job is not None:
        if job.get("owner_id") != user["id"]:
            raise HTTPException(status_code=404, detail="Job not found.")
        return job

    package = get_package_by_id(job_id, user["id"], user["access_token"])
    if not package:
        raise HTTPException(status_code=404, detail="Job not found.")
    if package.get("status") in ["generating_story", "reviewing_story", "generating_assets"]:
        package["status"] = "failed"
        package["generation_error"] = (
            "The backend restarted during generation. This incomplete run cannot resume; "
            "create a new story. Saved review drafts can still be reopened and resumed."
        )
        try:
            package = save_video_package(package, user["access_token"])
        except Exception as error:
            raise HTTPException(status_code=503, detail="Could not record the interrupted generation.") from error
    return {
        "status": package.get("status", "failed"),
        "result": package,
        "error": package.get("generation_error"),
        "logs": [],
    }


@app.get("/packages")
def list_packages(user: dict[str, str] = Depends(_authenticated_user)):
    try:
        return get_all_packages(user["id"], user["access_token"])
    except Exception as error:
        raise HTTPException(status_code=503, detail="Supabase is unavailable; package history could not be loaded.") from error


@app.get("/packages/{package_id}")
def get_package(package_id: str, user: dict[str, str] = Depends(_authenticated_user)):
    package = get_package_by_id(package_id, user["id"], user["access_token"])
    if not package:
        raise HTTPException(status_code=404, detail="Package not found.")
    return package


@app.post("/packages/{package_id}/revise")
def revise_story(
    package_id: str,
    request: StoryRevisionRequest,
    background_tasks: BackgroundTasks,
    user: dict[str, str] = Depends(_authenticated_user),
):
    story = request.story.strip() if request.story else ""
    change_request = request.change_request.strip() if request.change_request else ""
    if not story and not change_request:
        raise HTTPException(status_code=400, detail="Provide an edited story or a change request.")
    if request.story is not None and not story:
        raise HTTPException(status_code=400, detail="Story cannot be blank.")

    package = get_package_by_id(package_id, user["id"], user["access_token"])
    if not package:
        raise HTTPException(status_code=404, detail="Package not found.")
    state = package.get("workflow_state")
    if not isinstance(state, dict) or not state.get("story"):
        raise HTTPException(status_code=409, detail="This package has no resumable story workflow state.")
    if package.get("status") in ["generating_story", "reviewing_story", "generating_assets"]:
        raise HTTPException(status_code=409, detail="Wait for the current generation stage to finish.")

    state = dict(state)
    submitted_story = story or state["story"]
    state.update({
        "story": submitted_story,
        "story_approved": False,
        "manual_review_required": False,
        "review_pass_count": 0,
        "revision_count": 0,
        "virality_score": 0,
        "reviewer_feedback": change_request or None,
        "ai_review_approved": False,
        "is_duplicate": False,
        "duplication_feedback": None,
        "characters": [],
        "video_clips": [],
        "thumbnail_prompt": "",
        "seo_metadata": {},
    })
    version = int(package.get("current_story_version", 0)) + 1
    version_record = _version_record(version, submitted_story, state, "reviewing_story")
    versions = list(package.get("story_versions") or [])
    versions.append(version_record)
    package = _package_from_state(
        package_id,
        user["id"],
        state,
        "reviewing_story",
        versions,
        current_story_version=version,
    )
    try:
        _save_job_package(package, user["access_token"], user["id"])
    except Exception as error:
        raise HTTPException(status_code=503, detail="Could not save the new story version.") from error

    jobs[package_id] = {
        "owner_id": user["id"],
        "status": "queued",
        "result": package,
        "error": None,
        "cancel_requested": False,
        "logs": [],
    }
    background_tasks.add_task(
        run_story_revision_job,
        package_id,
        user["id"],
        user["access_token"],
        package,
        state,
        change_request or None,
    )
    return {"job_id": package_id, "status": "queued", "story_version": version}


@app.post("/packages/{package_id}/approve")
def approve_story(
    package_id: str,
    background_tasks: BackgroundTasks,
    user: dict[str, str] = Depends(_authenticated_user),
):
    package = get_package_by_id(package_id, user["id"], user["access_token"])
    if not package:
        raise HTTPException(status_code=404, detail="Package not found.")
    if package.get("status") not in ["awaiting_approval", "needs_creator_review"]:
        raise HTTPException(status_code=409, detail="This story is not waiting for creator approval.")
    if not package.get("story") or not package.get("workflow_state"):
        raise HTTPException(status_code=409, detail="The story workflow state is incomplete.")

    state = dict(package["workflow_state"])
    state["story_approved"] = True
    approved_version = package.get("current_story_version")
    package.update({
        "status": "generating_assets",
        "story_approved": True,
        "approved_story_version": approved_version,
        "workflow_state": state,
        "generation_error": None,
    })
    versions = list(package.get("story_versions") or [])
    if versions:
        versions[-1] = {**versions[-1], "status": "approved", "approved_at": _now()}
        package["story_versions"] = versions
    try:
        saved = _save_job_package(package, user["access_token"], user["id"])
    except Exception as error:
        raise HTTPException(status_code=503, detail="Could not persist story approval.") from error

    jobs[package_id] = {
        "owner_id": user["id"],
        "status": "queued",
        "result": saved,
        "error": None,
        "cancel_requested": False,
        "logs": [],
    }
    background_tasks.add_task(
        run_production_job,
        package_id,
        user["id"],
        user["access_token"],
        saved,
        state,
    )
    return {"job_id": package_id, "status": "queued"}


@app.post("/fix-prompt")
def fix_prompt(request: FixPromptRequest, user: dict[str, str] = Depends(_authenticated_user)):
    package = get_package_by_id(request.package_id, user["id"], user["access_token"])
    if not package:
        raise HTTPException(status_code=404, detail="Package not found.")
    if not package.get("story_approved"):
        raise HTTPException(status_code=409, detail="Approve the story before revising production prompts.")
    fixed_clip = run_prompt_fix(
        story=package.get("story", ""),
        characters=package.get("characters", []),
        clip_number=request.clip_number,
        error_description=request.error_description,
    )
    return {"fixed_clip": fixed_clip}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
