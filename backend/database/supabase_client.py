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

_client: Client | None = None


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


def get_client() -> Client:
    """Get or create the Supabase client (singleton)."""
    global _client
    if _client is None:
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
        _client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    return _client


def save_video_package(package: dict) -> dict:
    """
    Save a fully generated video package to the 'video_packages' table.
    A package includes: story, characters, video_prompts, thumbnail_prompt, seo_metadata.
    Returns the saved record with its ID.
    """
    client = get_client()
    response = (
        client.table("video_packages")
        .insert(package)
        .select("*")
        .execute()
    )
    return response.data[0] if response.data else {}


def get_all_packages(limit: int = 50) -> list:
    """Fetch the most recent video packages from the database."""
    client = get_client()
    response = (
        client.table("video_packages")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return response.data or []


def get_package_by_id(package_id: str) -> dict:
    """Fetch a single video package by its UUID."""
    client = get_client()
    response = (
        client.table("video_packages")
        .select("*")
        .eq("id", package_id)
        .execute()
    )
    if not response.data:
        return {}
    return response.data[0]
