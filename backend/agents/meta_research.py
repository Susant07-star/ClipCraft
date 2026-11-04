"""Collect permitted owned-account Facebook and Instagram evidence."""

import json
import os
from datetime import datetime, timezone
from urllib.parse import urlencode
from urllib.request import Request, urlopen


GRAPH_API_VERSION = os.environ.get("META_GRAPH_API_VERSION", "v25.0")
GRAPH_BASE_URL = f"https://graph.facebook.com/{GRAPH_API_VERSION}"
PLACEHOLDER_VALUES = {
    "",
    "your_meta_graph_api_token",
    "your_page_access_token_optional",
    "your_facebook_page_id",
    "your_instagram_business_account_id",
}


def _graph_get(path: str, params: dict[str, str]) -> dict:
    query = urlencode(params)
    request = Request(f"{GRAPH_BASE_URL}/{path}?{query}", headers={"Accept": "application/json"})
    with urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def _configured() -> bool:
    access_token = os.environ.get("META_ACCESS_TOKEN", "").strip()
    page_access_token = os.environ.get("META_PAGE_ACCESS_TOKEN", "").strip()
    page_id = os.environ.get("FACEBOOK_PAGE_ID", "").strip()
    instagram_id = os.environ.get("INSTAGRAM_BUSINESS_ACCOUNT_ID", "").strip()
    return bool(
        access_token.lower() not in PLACEHOLDER_VALUES
        and (
            not page_access_token
            or page_access_token.lower() not in PLACEHOLDER_VALUES
        )
        and (
            page_id.lower() not in PLACEHOLDER_VALUES
            or instagram_id.lower() not in PLACEHOLDER_VALUES
        )
    )


def collect_owned_meta_evidence() -> dict:
    """Return raw owned Page/Instagram media, or an explicit disabled result."""
    collected_at = datetime.now(timezone.utc).isoformat()
    result = {
        "source": "meta_graph_api",
        "collected_at": collected_at,
        "facebook_page_posts": [],
        "instagram_media": [],
        "errors": [],
    }
    if not _configured():
        result["status"] = "disabled"
        result["message"] = "Meta credentials and an owned Page or Instagram account ID are not configured."
        return result

    access_token = os.environ["META_ACCESS_TOKEN"]
    page_access_token = os.environ.get("META_PAGE_ACCESS_TOKEN", access_token)
    page_common = {"access_token": page_access_token, "limit": "25"}
    instagram_common = {"access_token": access_token, "limit": "25"}

    page_id = os.environ.get("FACEBOOK_PAGE_ID")
    if page_id:
        try:
            page_data = _graph_get(
                f"{page_id}/posts",
                {
                    **page_common,
                    "fields": "id,message,created_time,permalink_url,shares,comments.summary(true),reactions.summary(true)",
                },
            )
            result["facebook_page_posts"] = page_data.get("data", [])
            result["facebook_page_paging"] = page_data.get("paging", {})
        except Exception as exc:
            result["errors"].append({"platform": "facebook", "type": type(exc).__name__, "message": str(exc)})

    instagram_id = os.environ.get("INSTAGRAM_BUSINESS_ACCOUNT_ID")
    if instagram_id:
        try:
            instagram_data = _graph_get(
                f"{instagram_id}/media",
                {
                    **instagram_common,
                    "fields": "id,caption,media_type,media_product_type,media_url,permalink,timestamp,like_count,comments_count",
                },
            )
            result["instagram_media"] = instagram_data.get("data", [])
            result["instagram_paging"] = instagram_data.get("paging", {})
        except Exception as exc:
            result["errors"].append({"platform": "instagram", "type": type(exc).__name__, "message": str(exc)})

    result["status"] = "partial" if result["errors"] else "ok"
    return result