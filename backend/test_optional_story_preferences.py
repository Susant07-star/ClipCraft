import unittest
from types import SimpleNamespace
from unittest.mock import patch

from agents import reviewer, story_writer


class OptionalStoryPreferenceTests(unittest.TestCase):
    def test_story_writer_invents_story_from_selected_settings_when_brief_is_empty(self):
        state = {
            "best_topic": "An original horror story",
            "creator_topic": "",
            "language": "Nepali",
            "genre": "Horror",
            "video_style": "Dark Cinematic",
            "target_duration": 40,
            "revision_count": 0,
        }

        with patch.object(
            story_writer,
            "robust_llm_invoke",
            return_value=SimpleNamespace(content="An original short story."),
        ) as invoke:
            result = story_writer.run_story_writer(state)

        prompt = invoke.call_args.args[0][1].content
        self.assertIn("Invent an original, engaging premise", prompt)
        self.assertIn("Horror", prompt)
        self.assertIn("Dark Cinematic", prompt)
        self.assertIn("Nepali", prompt)
        self.assertIn("40 seconds", prompt)
        self.assertEqual(result["story"], "An original short story.")

    def test_story_writer_uses_brief_when_genre_and_visual_style_are_unselected(self):
        state = {
            "best_topic": "A shop run by two kids; gentle humor and a colorful animated look.",
            "creator_topic": "A shop run by two kids; gentle humor and a colorful animated look.",
            "language": "English",
            "genre": "",
            "video_style": "",
            "target_duration": 60,
            "revision_count": 0,
        }

        with patch.object(
            story_writer,
            "robust_llm_invoke",
            return_value=SimpleNamespace(content="A short story."),
        ) as invoke:
            result = story_writer.run_story_writer(state)

        prompt = invoke.call_args.args[0][1].content
        self.assertIn("Not specified; infer a fitting tone from the creator's brief", prompt)
        self.assertIn("Not specified; follow any visual direction in the creator's brief", prompt)
        self.assertIn(state["creator_topic"], prompt)
        self.assertEqual(result["story"], "A short story.")

    def test_reviewer_does_not_require_a_genre_when_none_was_selected(self):
        state = {
            "story": "Two kids open a tiny shop.",
            "creator_topic": "A gentle comedy about two kids opening a tiny shop.",
            "genre": "",
            "review_pass_count": 0,
        }

        with patch.object(
            reviewer,
            "robust_llm_invoke",
            return_value=SimpleNamespace(
                content='{"virality_score": 8, "approved": true, "feedback": "Story approved."}'
            ),
        ) as invoke:
            result = reviewer.run_reviewer(state)

        prompt = invoke.call_args.args[0][1].content
        self.assertIn("No genre was selected", prompt)
        self.assertIn(state["creator_topic"], prompt)
        self.assertTrue(result["ai_review_approved"])


if __name__ == "__main__":
    unittest.main()
