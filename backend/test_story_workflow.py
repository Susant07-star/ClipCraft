import unittest
from unittest.mock import patch

from graph import workflow


class StoryWorkflowTests(unittest.TestCase):
    def test_story_review_ends_without_running_production_nodes(self):
        state = workflow.create_initial_state()
        with (
            patch("graph.workflow.run_research", return_value={"best_topic": "A lighthouse mystery"}),
            patch("graph.workflow.run_story_writer", return_value={"story": "A short story.", "revision_count": 1}),
            patch("graph.workflow.run_duplication_checker", return_value={"is_duplicate": False}),
            patch(
                "graph.workflow.run_reviewer",
                return_value={
                    "ai_review_approved": True,
                    "manual_review_required": False,
                    "review_pass_count": 1,
                    "virality_score": 8,
                    "reviewer_feedback": None,
                },
            ),
            patch("graph.workflow.run_character_designer", side_effect=AssertionError("production ran before approval")),
            patch("graph.workflow.run_prompt_engineer", side_effect=AssertionError("production ran before approval")),
            patch("graph.workflow.run_seo_specialist", side_effect=AssertionError("production ran before approval")),
        ):
            outputs = list(workflow.build_story_workflow().stream(state, stream_mode="updates"))

        completed_nodes = [next(iter(output)) for output in outputs]
        self.assertEqual(
            completed_nodes,
            ["researcher", "story_writer", "duplication_checker", "reviewer"],
        )

    def test_production_requires_explicit_approval(self):
        state = workflow.create_initial_state()
        with self.assertRaisesRegex(ValueError, "explicitly approved"):
            list(workflow.run_production_stream(state))

    def test_creator_revision_starts_a_fresh_review_pass_counter(self):
        class CapturingGraph:
            received_state = None

            def stream(self, state, stream_mode):
                self.received_state = state
                return iter([{"reviewer": {"review_pass_count": 1}}])

        graph = CapturingGraph()
        state = workflow.create_initial_state()
        state.update({
            "story": "Creator-edited story.",
            "review_pass_count": 3,
            "revision_count": 5,
            "ai_review_approved": True,
            "story_approved": True,
            "manual_review_required": True,
        })

        with patch.object(workflow, "review_app", graph):
            list(workflow.run_story_review_stream(state))

        self.assertEqual(graph.received_state["review_pass_count"], 0)
        self.assertEqual(graph.received_state["revision_count"], 0)
        self.assertFalse(graph.received_state["story_approved"])
        self.assertFalse(graph.received_state["ai_review_approved"])
        self.assertFalse(graph.received_state["manual_review_required"])
        self.assertEqual(graph.received_state["story"], "Creator-edited story.")


if __name__ == "__main__":
    unittest.main()
