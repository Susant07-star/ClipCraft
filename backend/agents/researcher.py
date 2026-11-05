"""
Researcher Agent
Fetches trending AI video topics using:
  1. YouTube Data API v3 - top viewed recent AI videos
  2. pytrends - Google Trends momentum check
  3. duckduckgo-search - web facts for context
  4. Your own channel analytics via YouTube API
"""

import os
import json
import re
import traceback
from datetime import datetime, timedelta, timezone
from typing import Any

from googleapiclient.discovery import build
from pytrends.request import TrendReq
from duckduckgo_search import DDGS
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from utils.llm_manager import robust_llm_invoke
from agents.meta_research import collect_owned_meta_evidence

load_dotenv()

YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
YOUR_CHANNEL_ID = os.environ.get("YOUR_CHANNEL_ID", "UCb_5KqvTJQEVoT-8wI17cDA")
MAX_RESEARCH_QUERY_WORDS = 12
MAX_RESEARCH_QUERY_CHARS = 80


def _compact_research_query(topic: str) -> str:
    """Reduce a creator brief to a focused search phrase without changing the brief."""
    normalized = " ".join(topic.split())
    if not normalized:
        return ""

    first_sentence = re.split(r"(?<=[.!?])\s+", normalized, maxsplit=1)[0]
    words = first_sentence.split()[:MAX_RESEARCH_QUERY_WORDS]
    query = " ".join(words)
    if len(query) <= MAX_RESEARCH_QUERY_CHARS:
        return query

    query = query[:MAX_RESEARCH_QUERY_CHARS].rsplit(" ", 1)[0]
    return query or normalized[:MAX_RESEARCH_QUERY_CHARS].rstrip()


# ─────────────────────────────────────────────
# YouTube: Fetch trending AI videos (global)
# ─────────────────────────────────────────────
def fetch_trending_ai_videos(query: str = "AI story short", max_results: int = 10) -> list[dict]:
    """
    Searches YouTube for recent high-view videos in AI niches.
    Returns a list of dicts with title, view_count, channel, published_at.
    """
    youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)

    published_after = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%SZ")

    search_response = youtube.search().list(
        q=query,
        part="snippet",
        type="video",
        order="viewCount",
        publishedAfter=published_after,
        maxResults=max_results,
        videoDuration="short",
    ).execute()

    video_ids = [item["id"]["videoId"] for item in search_response.get("items", [])]
    if not video_ids:
        return []

    # Get view counts for those video IDs
    stats_response = youtube.videos().list(
        part="statistics,snippet,contentDetails",
        id=",".join(video_ids),
    ).execute()

    results = []
    for item in stats_response.get("items", []):
        published_at = item["snippet"]["publishedAt"]
        age_days = max((datetime.now(timezone.utc) - datetime.fromisoformat(published_at.replace("Z", "+00:00"))).total_seconds() / 86400, 1)
        views = int(item["statistics"].get("viewCount", 0))
        likes = int(item["statistics"].get("likeCount", 0))
        comments = int(item["statistics"].get("commentCount", 0))
        results.append({
            "title": item["snippet"]["title"],
            "description": item["snippet"].get("description", "")[:500],
            "channel": item["snippet"]["channelTitle"],
            "view_count": views,
            "like_count": likes,
            "comment_count": comments,
            "published_at": published_at,
            "age_days": round(age_days, 1),
            "views_per_day": round(views / age_days),
            "like_rate": round(likes / views, 5) if views else 0,
            "comment_rate": round(comments / views, 5) if views else 0,
            "video_id": item["id"],
            "url": f"https://www.youtube.com/watch?v={item['id']}",
            "raw_source_item": item,
        })

    return sorted(results, key=lambda x: x["views_per_day"], reverse=True)


def fetch_trending_for_queries(queries: list[str], language_suffix: str = "", max_results: int = 10) -> list[dict]:
    """Search several related phrases and merge duplicate videos."""
    videos_by_id = {}
    for query in queries:
        for video in fetch_trending_ai_videos(
            query=f"{query}{language_suffix}".strip(),
            max_results=max_results,
        ):
            videos_by_id[video["video_id"]] = video
    return sorted(videos_by_id.values(), key=lambda item: item["views_per_day"], reverse=True)[:max_results]


# ─────────────────────────────────────────────
# YouTube: Fetch YOUR channel's analytics
# ─────────────────────────────────────────────
def fetch_my_channel_analytics() -> list[dict]:
    """
    Fetches your own channel's recent video stats to identify what works
    for YOUR specific audience.
    """
    youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)

    # Get your latest 20 videos
    channel_response = youtube.search().list(
        channelId=YOUR_CHANNEL_ID,
        part="snippet",
        type="video",
        order="date",
        maxResults=20,
    ).execute()

    video_ids = [item["id"]["videoId"] for item in channel_response.get("items", [])]
    if not video_ids:
        return []

    stats_response = youtube.videos().list(
        part="statistics,snippet",
        id=",".join(video_ids),
    ).execute()

    results = []
    for item in stats_response.get("items", []):
        results.append({
            "title": item["snippet"]["title"],
            "view_count": int(item["statistics"].get("viewCount", 0)),
            "like_count": int(item["statistics"].get("likeCount", 0)),
            "comment_count": int(item["statistics"].get("commentCount", 0)),
            "published_at": item["snippet"]["publishedAt"],
        })

    return sorted(results, key=lambda x: x["view_count"], reverse=True)


# ─────────────────────────────────────────────
# Google Trends: Check topic momentum
# ─────────────────────────────────────────────
def check_google_trends(keywords: list[str]) -> dict:
    """
    Checks if given keywords are trending upward on Google Trends.
    Returns a dict of keyword -> trend_score (0-100).
    """
    pytrends = TrendReq(hl="en-US", tz=360)
    pytrends.build_payload(keywords[:5], cat=0, timeframe="now 7-d")
    interest_df = pytrends.interest_over_time()
    if interest_df.empty:
        return {kw: 0 for kw in keywords}
    # Get average trend score for the last 7 days
    return {kw: int(interest_df[kw].mean()) for kw in keywords if kw in interest_df.columns}


# ─────────────────────────────────────────────
# DuckDuckGo: Gather web context
# ─────────────────────────────────────────────
def search_web_context(query: str, max_results: int = 5) -> list[dict]:
    """
    Searches DuckDuckGo for context, facts, or lore about a topic.
    Returns a list of result snippets.
    """
    with DDGS() as ddgs:
        results = ddgs.text(query, max_results=max_results, backend="lite")
        return [{
            "title": r.get("title", ""),
            "url": r.get("href", ""),
            "snippet": r.get("body", ""),
                "raw_source_item": r,
        } for r in results]


def _extract_json(text: str) -> dict:
    """Parse a JSON object even when a model wraps it in markdown fences."""
    cleaned = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    try:
        value = json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        value = json.loads(match.group(0)) if match else {}
    return value if isinstance(value, dict) else {}


def build_research_brief(
    genre: str,
    language: str,
    video_style: str,
    trending_videos: list[dict],
    my_top_videos: list[dict],
    trend_scores: dict,
    web_context: list[dict],
    meta_evidence: dict | None = None,
) -> dict:
    """Interpret collected evidence without allowing the LLM to invent sources."""
    evidence = {
        "request": {"genre": genre, "language": language, "video_style": video_style},
        "youtube_competitor_videos": trending_videos,
        "own_channel_top_videos": my_top_videos,
        "google_trends_7_day_average": trend_scores,
        "web_sources": web_context,
        "owned_meta_evidence": meta_evidence or {},
    }
    system_prompt = """You are a rigorous content research analyst. Analyze only the supplied evidence.
Do not invent statistics, sources, comments, or facts. Separate observed evidence from creative hypotheses.
Return valid JSON with exactly these keys:
{
  "executive_summary": "string",
  "audience_patterns": ["string"],
  "successful_hooks": ["string"],
  "overused_patterns": ["string"],
  "content_gaps": ["string"],
  "recommended_angles": [{"angle": "string", "reason": "string", "score": 0}],
  "factual_claims_to_verify": ["string"],
  "risks": ["string"],
  "confidence": "low|medium|high"
}
Scores must be integers from 0 to 100. If evidence is thin, say so and lower confidence."""
    prompt = f"Evidence collected from research tools:\n{json.dumps(evidence, ensure_ascii=True, indent=2)}"
    try:
        response = robust_llm_invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=prompt),
        ], temperature=0.2)
        brief = _extract_json(response.content)
    except Exception as exc:
        print(f"⚠️ [Researcher] Brief analysis failed: {type(exc).__name__}: {exc}")
        brief = {}

    return {
        "executive_summary": brief.get("executive_summary", "Evidence collected, but LLM analysis was unavailable."),
        "audience_patterns": brief.get("audience_patterns", []),
        "successful_hooks": brief.get("successful_hooks", []),
        "overused_patterns": brief.get("overused_patterns", []),
        "content_gaps": brief.get("content_gaps", []),
        "recommended_angles": brief.get("recommended_angles", []),
        "factual_claims_to_verify": brief.get("factual_claims_to_verify", []),
        "risks": brief.get("risks", []),
        "confidence": brief.get("confidence", "low"),
        "evidence": evidence,
    }


# ─────────────────────────────────────────────
# Main Research Function (used by LangGraph)
# ─────────────────────────────────────────────
def run_research(state: dict) -> dict:
    """
    LangGraph node: Runs the full research pipeline and returns
    a summary of trending topics and channel analytics.
    This output is passed to the story_writer agent.
    """
    if not state.get("research_enabled", True):
        topic = state.get("creator_topic", "").strip()
        language = state.get("language", "English")
        if language == "Auto":
            language = "English"
        genre = state.get("genre") or ""
        fallback_topic = topic or (
            f"An original {genre.lower()} story" if genre else "An original short-form story"
        )
        return {
            **state,
            "language": language,
            "best_topic": fallback_topic,
            "trending_videos": [],
            "trend_scores": {},
            "web_context": [],
            "research_brief": {"status": "skipped", "reason": "Creator chose to disable research."},
            "research_trace": [{"stage": "skipped", "message": "Research disabled by creator."}],
            "research_errors": [],
        }

    research_trace = []
    research_errors = []

    def trace(stage: str, message: str, data: dict[str, Any] | None = None):
        event: dict[str, Any] = {"stage": stage, "message": message, "timestamp": datetime.now(timezone.utc).isoformat()}
        if data is not None:
            event["data"] = data
        research_trace.append(event)
        print(f"🔍 [Researcher:{stage}] {message}")

    def record_error(stage: str, error: Exception):
        error_event = {
            "stage": stage,
            "type": type(error).__name__,
            "message": str(error),
            "traceback": traceback.format_exc(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        research_errors.append(error_event)
        print(f"❌ [Researcher:{stage}] {type(error).__name__}: {error}")

    def run_source(stage: str, operation, default):
        try:
            return operation()
        except Exception as exc:
            record_error(stage, exc)
            return default

    trace("start", "Research started", {
        "genre": state.get("genre") or "",
        "language_requested": state.get("language", "Auto"),
        "video_style": state.get("video_style", "Hyper-Realistic"),
    })
    language = state.get("language", "Auto")
    genre = state.get("genre") or ""
    video_style = state.get("video_style") or ""

    # Mapping genres to specific high-quality search terms
    genre_queries = {
        "Funny": ("ai funny video", ["ai funny video", "ai comedy short", "ai meme video"]),
        "Horror": ("ai scary story", ["ai scary story", "ai horror short", "creepy ai video"]),
        "Sci-Fi": ("ai sci fi story", ["ai sci fi story", "ai futuristic short", "ai robot video"]),
        "Mystery": ("ai mystery story", ["ai mystery story", "ai crime solving", "ai detective video"]),
        "Sad": ("ai sad story", ["ai sad story", "ai emotional short", "ai heartbreaking video"]),
        "Opposite World Funny": ("ulti duniya ai video", ["ulti duniya ai video", "opposite world ai funny", "weird ai comedy"]),
        "Cute Kid Funny": ("ai cute kid funny", ["ai cute kid funny", "ai baby comedy short", "funny kid story ai"]),
        "Fruits & Veggies Funny": ("ai talking fruits funny", ["ai talking fruits funny", "ai vegetable comedy", "funny fruit story ai"]),
        "Fruits & Veggies Emotion": ("ai sad fruits story", ["ai sad fruits story", "ai emotional vegetable", "touching fruit story ai"]),
    }
    
    youtube_base_query, trend_keywords = genre_queries.get(genre, genre_queries["Funny"])
    creator_topic = state.get("creator_topic", "").strip()
    if creator_topic:
        search_topic = _compact_research_query(creator_topic)
        youtube_base_query = search_topic
        trend_keywords = [search_topic]
    
    # Prepend style for targeted youtube searches
    style_keyword = video_style.split()[0] if video_style else ""
    youtube_full_query = youtube_base_query if creator_topic else f"{style_keyword} {youtube_base_query}".strip()

    # 1. Determine Language (if Auto) and Fetch global trending AI videos
    if language == "Auto":
        trace("language", "Language is Auto; testing English, Hindi, and Nepali markets")
        # Check all three languages to see which has the highest momentum right now
        en_trending = run_source("youtube_english", lambda: fetch_trending_for_queries(trend_keywords, max_results=5), [])
        hi_trending = run_source("youtube_hindi", lambda: fetch_trending_for_queries(trend_keywords, language_suffix=" Hindi", max_results=5), [])
        np_trending = run_source("youtube_nepali", lambda: fetch_trending_for_queries(trend_keywords, language_suffix=" Nepali", max_results=5), [])
        trace("youtube_search", "YouTube market searches completed", {
            "queries": trend_keywords,
            "english_results": len(en_trending),
            "hindi_results": len(hi_trending),
            "nepali_results": len(np_trending),
        })

        # Calculate total views from top 5 recent videos in each language
        en_views = sum(v["view_count"] for v in en_trending)
        hi_views = sum(v["view_count"] for v in hi_trending)
        np_views = sum(v["view_count"] for v in np_trending)

        trace("language", "Compared market totals", {"english_views": en_views, "hindi_views": hi_views, "nepali_views": np_views})

        # Pick the winner
        winner = max([("English", en_views, en_trending), 
                      ("Hindi", hi_views, hi_trending), 
                      ("Nepali", np_views, np_trending)], key=lambda x: x[1])
        
        language = winner[0]
        trending = winner[2]
        trace("language", f"Selected {language} as the strongest market")
    else:
        # User specified a language, search specifically for it
        query_modifier = "" if language == "English" else f" {language}"
        trending = run_source("youtube_search", lambda: fetch_trending_for_queries(trend_keywords, language_suffix=query_modifier, max_results=10), [])
        trace("youtube_search", "YouTube topic searches completed", {
            "queries": trend_keywords,
            "language_suffix": query_modifier,
            "result_count": len(trending),
        })

    # Pass the full video objects so the frontend can display links/stats
    trending_videos = trending[:5]

    # 2. Fetch your own channel analytics
    try:
        my_analytics = fetch_my_channel_analytics()
        trace("channel_analytics", f"Collected {len(my_analytics)} recent channel videos")
    except Exception as exc:
        record_error("channel_analytics", exc)
        my_analytics = []
    top_performing = my_analytics[:5] if my_analytics else []

    # 3. Check Google Trends for promising topics
    trend_scores = run_source("google_trends", lambda: check_google_trends(trend_keywords), {})
    trace("google_trends", "Collected Google Trends scores", {"scores": trend_scores})

    # 4. Find the most trending keyword
    researched_keyword = max(trend_scores, key=lambda keyword: trend_scores.get(keyword, 0), default=trend_keywords[0])
    best_keyword = state.get("creator_topic", "").strip() or researched_keyword

    # 5. Get web context for the best keyword
    # Localize the web search to the chosen language for better context
    web_query_topic = _compact_research_query(best_keyword)
    web_query = f"{web_query_topic} latest trends"
    web_search_error_count = len(research_errors)
    if language != "English":
        web_query += f" {language}"

    web_context = run_source("web_search", lambda: search_web_context(web_query, max_results=5), [])
    trace("web_search", f"Collected {len(web_context)} web results", {"query": web_query})
    if not web_context and len(research_errors) == web_search_error_count:
        fallback_query = f"{web_query_topic} story"
        if language != "English":
            fallback_query += f" {language}"
        web_context = run_source(
            "web_search_fallback",
            lambda: search_web_context(fallback_query, max_results=5),
            [],
        )
        trace("web_search_fallback", f"Collected {len(web_context)} web results", {"query": fallback_query})

    meta_evidence = run_source("meta_owned_accounts", collect_owned_meta_evidence, {})
    trace("meta_owned_accounts", "Collected owned Facebook and Instagram evidence", {
        "status": meta_evidence.get("status", "unknown"),
        "facebook_posts": len(meta_evidence.get("facebook_page_posts", [])),
        "instagram_media": len(meta_evidence.get("instagram_media", [])),
        "errors": len(meta_evidence.get("errors", [])),
    })
    for meta_error in meta_evidence.get("errors", []):
        research_errors.append({
            "stage": "meta_owned_accounts",
            "type": meta_error.get("type", "MetaApiError"),
            "message": f"{meta_error.get('platform', 'Meta')}: {meta_error.get('message', '')}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    try:
        research_brief = build_research_brief(
            genre=genre,
            language=language,
            video_style=video_style,
            trending_videos=trending_videos,
            my_top_videos=top_performing,
            trend_scores=trend_scores,
            web_context=web_context,
            meta_evidence=meta_evidence,
        )
        trace("brief", "Built the final structured research brief", {"confidence": research_brief.get("confidence", "low")})
    except Exception as exc:
        record_error("brief", exc)
        research_brief = {"executive_summary": "Research brief unavailable.", "confidence": "low"}

    trace("complete", f"Selected topic: {best_keyword}", {"video_count": len(trending_videos), "error_count": len(research_errors)})

    return {
        **state,
        "language": language,  # Overwrite state with actual language used
        "trending_videos": trending_videos,
        "my_top_videos": [v["title"] for v in top_performing],
        "best_topic": best_keyword,
        "trend_scores": trend_scores,
        "web_context": web_context,
        "meta_evidence": meta_evidence,
        "research_brief": research_brief,
        "research_trace": research_trace,
        "research_errors": research_errors,
    }
