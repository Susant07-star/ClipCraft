"""
FastAPI Application — ClipCraft Studio
Exposes the LangGraph agent workflow as REST API endpoints
consumed by the Next.js frontend dashboard.
"""

import uuid
import traceback
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()

from graph.workflow import run_pipeline_stream
from agents.prompt_engineer import run_prompt_fix
from database.supabase_client import save_video_package, get_all_packages, get_package_by_id

app = FastAPI(
    title="ClipCraft Studio API",
    description="LangGraph workflow for drafting and reviewing short-form video prompt packages.",
    version="1.0.0",
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

# In-memory job store (for async job status tracking)
jobs: dict = {}


# ─────────────────────────────────────────────
# Request/Response Models
# ─────────────────────────────────────────────
class GenerateRequest(BaseModel):
    genre: str = "Funny"
    language: str = "Auto"  # "Auto", "English", "Hindi", or "Nepali"
    video_style: str = "Hyper-Realistic"


class FixPromptRequest(BaseModel):
    package_id: str
    clip_number: int
    error_description: str


class ChatRequest(BaseModel):
    package_id: str
    message: str


# ─────────────────────────────────────────────
# Background job runner
# ─────────────────────────────────────────────
def run_pipeline_job(job_id: str, language: str, video_style: str, genre: str):
    """Runs the pipeline in the background and updates job status."""
    def add_log(message: str, level: str = "info"):
        jobs[job_id].setdefault("logs", []).append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": level,
            "message": message,
        })

    def cancellation_requested() -> bool:
        if jobs[job_id].get("cancel_requested"):
            jobs[job_id]["status"] = "canceled"
            add_log("Generation canceled before the next workflow step", "warning")
            return True
        return False

    try:
        jobs[job_id]["status"] = "running"
        if cancellation_requested():
            return
        add_log(f"Pipeline started: language={language}, style={video_style}, genre={genre}")
        
        # Initialize an empty package structure for streaming
        package = {
            "id": job_id,
            "language": language,
            "topic": "",
            "story": "",
            "virality_score": 0,
            "characters": [],
            "video_clips": [],
            "thumbnail_prompt": "",
            "seo_metadata": {},
            "trending_videos": [],
            "trend_scores": {},
            "research_brief": {},
            "research_trace": [],
            "research_errors": [],
            "completed_steps": [],
        }
        jobs[job_id]["result"] = package
        add_log("Initial package state created")

        # Stream updates from the workflow
        for output in run_pipeline_stream(language=language, video_style=video_style, genre=genre):
            if cancellation_requested():
                return
            # output is a dict where keys are the names of the nodes that just completed
            # and values are the partial state updates.
            for node_name, state_update in output.items():
                add_log(f"Step completed: {node_name}")
                if node_name not in package["completed_steps"]:
                    package["completed_steps"].append(node_name)
                
                # Update our package dict with any new state keys
                if "best_topic" in state_update:
                    package["topic"] = state_update["best_topic"]
                if "language" in state_update:
                    package["language"] = state_update["language"]
                if "story" in state_update:
                    package["story"] = state_update["story"]
                if "virality_score" in state_update:
                    package["virality_score"] = state_update["virality_score"]
                if "characters" in state_update:
                    package["characters"] = state_update["characters"]
                if "video_clips" in state_update:
                    package["video_clips"] = state_update["video_clips"]
                if "thumbnail_prompt" in state_update:
                    package["thumbnail_prompt"] = state_update["thumbnail_prompt"]
                if "seo_metadata" in state_update:
                    package["seo_metadata"] = state_update["seo_metadata"]
                if "trending_videos" in state_update:
                    package["trending_videos"] = state_update["trending_videos"]
                if "trend_scores" in state_update:
                    package["trend_scores"] = state_update["trend_scores"]
                if "meta_evidence" in state_update:
                    package["research_brief"].setdefault("evidence", {})["owned_meta_evidence"] = state_update["meta_evidence"]
                if "research_brief" in state_update:
                    package["research_brief"] = state_update["research_brief"]
                if "research_trace" in state_update:
                    package["research_trace"] = state_update["research_trace"]
                    for event in state_update["research_trace"]:
                        add_log(
                            f"[research:{event.get('stage', 'unknown')}] {event.get('message', '')}",
                            "info",
                        )
                if "research_errors" in state_update:
                    package["research_errors"] = state_update["research_errors"]
                    for error in state_update["research_errors"]:
                        add_log(
                            f"[research:{error.get('stage', 'unknown')}] {error.get('type', 'Error')}: {error.get('message', '')}",
                            "error",
                        )
                
                # Assign back to jobs dictionary so polling endpoint picks it up
                jobs[job_id]["result"] = package
                add_log(f"Updated package fields from {node_name}: {', '.join(state_update.keys())}")

        # Finalize
        if cancellation_requested():
            return
        package_to_save = {k: v for k, v in package.items() if k != "completed_steps"}

        try:
            add_log("Saving completed package to Supabase")
            print(f"🗄️ [Supabase] Attempting to save package {job_id}...")
            print(f"🗄️ [Supabase] Payload keys: {list(package_to_save.keys())}")
            saved = save_video_package(package_to_save)
            if saved:
                print(f"✅ [Supabase] Successfully saved package {job_id}")
                jobs[job_id]["status"] = "completed"
                add_log("Package saved successfully", "success")
            else:
                print(f"⚠️ [Supabase] Save returned empty response - check table schema")
                jobs[job_id]["status"] = "completed_unsaved"
                jobs[job_id]["error"] = "Supabase save returned empty response."
                add_log("Package generated, but Supabase returned no saved record", "warning")
        except Exception as db_err:
            print(f"❌ [Supabase] FAILED to save: {type(db_err).__name__}: {db_err}")
            print(f"❌ [Supabase] Payload that failed: {list(package_to_save.keys())}")
            jobs[job_id]["status"] = "completed_unsaved"
            jobs[job_id]["error"] = str(db_err)
            add_log(f"Package generated, but Supabase save failed: {type(db_err).__name__}: {db_err}", "warning")
    except Exception as e:
        print(f"\n❌ [Pipeline ERROR] Job {job_id} failed: {e}")
        traceback.print_exc()
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)
        add_log(f"Pipeline failed: {type(e).__name__}: {e}", "error")


# ─────────────────────────────────────────────
# API Endpoints
# ─────────────────────────────────────────────
@app.get("/")
def health_check():
    return {"status": "online", "message": "ClipCraft Studio API is running"}


@app.post("/generate")
def generate_video_package(request: GenerateRequest, background_tasks: BackgroundTasks):
    """
    Triggers the full AI pipeline to generate a complete video package.
    Returns a job_id immediately. Poll /status/{job_id} to check progress.
    """
    if request.language not in ["Auto", "English", "Hindi", "Nepali"]:
        raise HTTPException(status_code=400, detail="Language must be 'Auto', 'English', 'Hindi', or 'Nepali'.")

    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "status": "queued",
        "result": None,
        "error": None,
        "cancel_requested": False,
        "logs": [{
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": "info",
            "message": "Generation request accepted and queued",
        }],
    }

    background_tasks.add_task(run_pipeline_job, job_id, request.language, request.video_style, request.genre)

    return {"job_id": job_id, "status": "queued", "message": "Pipeline started! Poll /status/{job_id} for updates."}


@app.post("/cancel/{job_id}")
def cancel_job(job_id: str):
    """Request cooperative cancellation of a queued or running generation job."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found.")

    job = jobs[job_id]
    if job["status"] not in ["queued", "running"]:
        raise HTTPException(status_code=409, detail=f"Job is already {job['status']}.")

    job["cancel_requested"] = True
    job.setdefault("logs", []).append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": "warning",
        "message": "Cancellation requested; stopping at the next workflow boundary",
    })
    return {"status": job["status"], "message": "Cancellation requested."}


@app.get("/status/{job_id}")
def get_job_status(job_id: str):
    """Poll this endpoint to check the status of a running pipeline job."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found.")
    return jobs[job_id]


@app.get("/packages")
def list_packages():
    """Fetch all previously generated video packages from Supabase."""
    try:
        return get_all_packages()
    except Exception as e:
        print(f"[WARNING] Could not fetch packages from Supabase: {e}")
        raise HTTPException(status_code=503, detail="Supabase is unavailable; package history could not be loaded.")


@app.get("/packages/{package_id}")
def get_package(package_id: str):
    """Fetch a single video package by its ID."""
    if package_id in jobs and jobs[package_id].get("result"):
        return jobs[package_id]["result"]
    
    package = get_package_by_id(package_id)
    if not package:
        raise HTTPException(status_code=404, detail="Package not found.")
    return package


@app.post("/fix-prompt")
def fix_prompt(request: FixPromptRequest):
    """
    Chatbox endpoint: Regenerate a single clip prompt that failed in an external video tool.
    """
    if request.package_id in jobs and jobs[request.package_id].get("result"):
        package = jobs[request.package_id]["result"]
    else:
        package = get_package_by_id(request.package_id)
        
    if not package:
        raise HTTPException(status_code=404, detail="Package not found.")

    fixed_clip = run_prompt_fix(
        story=package.get("story", ""),
        characters=package.get("characters", []),
        clip_number=request.clip_number,
        error_description=request.error_description,
    )
    return {"fixed_clip": fixed_clip}


# ─────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
