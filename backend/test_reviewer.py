import unittest
from types import SimpleNamespace
from unittest.mock import patch

from agents.reviewer import MAX_REVIEW_PASSES, run_reviewer


class ReviewerTests(unittest.TestCase):
    @patch("agents.reviewer.robust_llm_invoke")
    @patch("builtins.print")
    def test_rejected_story_hands_off_after_three_review_passes(self, _print, invoke):
        invoke.return_value = SimpleNamespace(
            content='{"virality_score": 5, "approved": false, "feedback": "Improve the ending."}'
        )
        state = {
            "story": "A story draft.",
            "revision_count": 1,
            "review_pass_count": 0,
        }

        for expected_pass in range(1, MAX_REVIEW_PASSES + 1):
            update = run_reviewer(state)
            self.assertEqual(update["review_pass_count"], expected_pass)
            self.assertFalse(update["ai_review_approved"])
            self.assertEqual(
                update["manual_review_required"],
                expected_pass == MAX_REVIEW_PASSES,
            )
            state.update(update)

        self.assertEqual(invoke.call_count, MAX_REVIEW_PASSES)
        self.assertEqual(state["reviewer_feedback"], "Improve the ending.")

    @patch("agents.reviewer.robust_llm_invoke")
    @patch("builtins.print")
    def test_third_pass_can_still_approve_story(self, _print, invoke):
        invoke.return_value = SimpleNamespace(
            content='{"virality_score": 8, "approved": true, "feedback": "Story approved."}'
        )

        update = run_reviewer(
            {
                "story": "A story draft.",
                "review_pass_count": MAX_REVIEW_PASSES - 1,
            }
        )

        self.assertEqual(update["review_pass_count"], MAX_REVIEW_PASSES)
        self.assertTrue(update["ai_review_approved"])
        self.assertFalse(update["manual_review_required"])
        invoke.assert_called_once()

    @patch("agents.reviewer.robust_llm_invoke")
    @patch("builtins.print")
    def test_review_at_cap_hands_off_without_another_model_call(self, _print, invoke):
        update = run_reviewer(
            {
                "story": "A story draft.",
                "review_pass_count": MAX_REVIEW_PASSES,
            }
        )

        self.assertEqual(update["review_pass_count"], MAX_REVIEW_PASSES)
        self.assertFalse(update["ai_review_approved"])
        self.assertTrue(update["manual_review_required"])
        invoke.assert_not_called()


if __name__ == "__main__":
    unittest.main()
