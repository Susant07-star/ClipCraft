import unittest
from unittest.mock import MagicMock, call, patch

from agents import researcher
from agents import meta_research
from graph.workflow import create_initial_state
from main import GenerateRequest


class ResearcherTests(unittest.TestCase):
    def test_new_workflow_state_enables_research_by_default(self):
        self.assertTrue(create_initial_state()["research_enabled"])
        self.assertTrue(GenerateRequest(topic="A lighthouse mystery").research_enabled)

    def test_enabled_research_collects_youtube_and_web_sources(self):
        topic = "A lighthouse mystery " + "with extra story details " * 12
        state = create_initial_state(
            language="English",
            topic=topic,
        )
        video = {
            "title": "A lighthouse mystery",
            "view_count": 1200,
            "video_id": "video-id",
            "views_per_day": 100,
        }
        web_result = {"title": "Story trends", "url": "https://example.com", "snippet": "Research source"}

        with (
            patch.object(researcher, "fetch_trending_for_queries", return_value=[video]) as youtube_search,
            patch.object(researcher, "fetch_my_channel_analytics", return_value=[]),
            patch.object(researcher, "check_google_trends", return_value={"A lighthouse mystery": 80}),
            patch.object(researcher, "search_web_context", side_effect=[[], [web_result]]) as web_search,
            patch.object(
                researcher,
                "collect_owned_meta_evidence",
                return_value={"status": "ok", "facebook_page_posts": [], "instagram_media": [], "errors": []},
            ),
            patch.object(researcher, "build_research_brief", return_value={"confidence": "high"}),
        ):
            result = researcher.run_research(state)

        youtube_search.assert_called_once()
        search_topic = " ".join(topic.split())[:120]
        self.assertEqual(youtube_search.call_args.args[0], [search_topic])
        self.assertEqual(
            web_search.call_args_list,
            [
                call(f"{search_topic} latest trends", max_results=5),
                call(f"{search_topic} story", max_results=5),
            ],
        )
        self.assertEqual(result["trending_videos"], [video])
        self.assertEqual(result["web_context"], [web_result])
        self.assertEqual(result["research_brief"]["confidence"], "high")

    def test_explicit_research_opt_out_skips_external_sources(self):
        with (
            patch.object(researcher, "fetch_trending_for_queries") as youtube_search,
            patch.object(researcher, "search_web_context") as web_search,
        ):
            result = researcher.run_research({
                "creator_topic": "A lighthouse mystery",
                "language": "English",
                "research_enabled": False,
            })

        youtube_search.assert_not_called()
        web_search.assert_not_called()
        self.assertEqual(result["research_brief"]["status"], "skipped")
        self.assertEqual(result["research_trace"][0]["message"], "Research disabled by creator.")

    def test_research_opt_out_without_story_idea_uses_a_generation_placeholder(self):
        result = researcher.run_research({
            "creator_topic": "",
            "genre": "Horror",
            "language": "Auto",
            "research_enabled": False,
        })

        self.assertEqual(result["best_topic"], "An original horror story")
        self.assertEqual(result["language"], "English")

    def test_public_web_search_uses_lite_backend(self):
        source = {"title": "Source", "href": "https://example.com", "body": "Research context"}
        search_client = MagicMock()
        search_client.__enter__.return_value.text.return_value = [source]

        with patch.object(researcher, "DDGS", return_value=search_client):
            results = researcher.search_web_context("story trends", max_results=3)

        search_client.__enter__.return_value.text.assert_called_once_with(
            "story trends",
            max_results=3,
            backend="lite",
        )
        self.assertEqual(results, [{
            "title": "Source",
            "url": "https://example.com",
            "snippet": "Research context",
            "raw_source_item": source,
        }])

    def test_placeholder_meta_credentials_are_treated_as_disabled(self):
        with patch.dict(
            meta_research.os.environ,
            {
                "META_ACCESS_TOKEN": "your_meta_graph_api_token",
                "FACEBOOK_PAGE_ID": "your_facebook_page_id",
                "INSTAGRAM_BUSINESS_ACCOUNT_ID": "your_instagram_business_account_id",
            },
            clear=False,
        ):
            result = meta_research.collect_owned_meta_evidence()

        self.assertEqual(result["status"], "disabled")
        self.assertEqual(result["errors"], [])


if __name__ == "__main__":
    unittest.main()
