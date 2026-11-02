"""
Supabase client and database operations.
All saved content for ClipCraft Studio is stored here.
"""

import os
import socket
from pathlib import Path
from urllib.parse import urlparse
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")

def _is_missing_or_placeholder(value: str | None) -> bool:
    """Return whether an environment value is absent or still a template value."""
    if not value:
        return True
    normalized = value.strip().lower()
    return normalized in {
        "******",
        "your_supabase_url_here",
        "your-project-id",
        "your-project-id.supabase.co",
        "your_supabase_anon_key_here",
    }


def get_user_client(access_token: str) -> Client:
    """Create a request-scoped client that applies the signed-in user's RLS claims."""
    if _is_missing_or_placeholder(SUPABASE_URL) or _is_missing_or_placeholder(SUPABASE_ANON_KEY):
        raise ValueError(
            "SUPABASE_URL and SUPABASE_ANON_KEY must contain real Supabase "
            "credentials in backend/.env; replace any masked or template values."
        )
    parsed_url = urlparse(SUPABASE_URL)
    if parsed_url.scheme != "https" or not parsed_url.hostname:
        raise ValueError(
            "SUPABASE_URL must be a complete HTTPS URL, for example "
            "https://your-project-id.supabase.co."
        )
    try:
        socket.getaddrinfo(parsed_url.hostname, 443)
    except socket.gaierror as error:
        raise ConnectionError(
            f"SUPABASE_URL hostname cannot be resolved: {parsed_url.hostname}. "
            "Verify the Project URL in Supabase Dashboard → Project Settings → API."
        ) from error
    client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    client.postgrest.auth(access_token)
    return client


def verify_access_token(access_token: str) -> str:
    """Ask Supabase Auth to validate the access token and return its user ID."""
    user_client = get_user_client(access_token)
    response = user_client.auth.get_user(access_token)
    if not response or not response.user:
        raise ValueError("The Supabase access token did not resolve to a user.")
    return str(response.user.id)


def save_video_package(package: dict, access_token: str) -> dict:
    """
    Save a fully generated video package to the 'video_packages' table.
    A package includes: story, characters, video_prompts, thumbnail_prompt, seo_metadata.
    Returns the saved record with its ID.
    """
    client = get_user_client(access_token)
    response = (
        client.table("video_packages")
        .upsert(package)
        .select("*")
        .execute()
    )
    if not response.data:
        raise RuntimeError("Supabase did not return the saved package.")
    return response.data[0]


def get_all_packages(user_id: str, access_token: str, limit: int = 50) -> list:
    """Fetch the most recent video packages from the database."""
    client = get_user_client(access_token)
    response = (
        client.table("video_packages")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return response.data or []


def get_package_by_id(package_id: str, user_id: str, access_token: str) -> dict:
    """Fetch a single video package by its UUID."""
    client = get_user_client(access_token)
    response = (
        client.table("video_packages")
        .select("*")
        .eq("id", package_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not response.data:
        return {}
    return response.data[0]
