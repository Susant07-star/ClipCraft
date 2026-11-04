import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from main import PackageDeletedError, _package_from_state, _save_job_package, app
from graph.workflow import create_initial_state


class AuthenticatedApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_generation_requires_a_supabase_session(self):
        response = self.client.post("/generate", json={})
        self.assertEqual(response.status_code, 401)

    def test_package_history_requires_a_supabase_session(self):
        response = self.client.get("/packages")
        self.assertEqual(response.status_code, 401)

    @patch("main.delete_video_package", return_value=True)
    @patch("main.verify_access_token", return_value="user-123")
    def test_owner_can_delete_a_package(self, _verify_token, delete_package):
        with patch("main.deleted_package_ids", set()), patch("main.jobs", {}):
            response = self.client.delete(
                "/packages/package-123",
                headers={"Authorization": "Bearer test-token"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"deleted": True, "id": "package-123"})
        delete_package.assert_called_once()
        self.assertEqual(delete_package.call_args.args[:2], ("package-123", "user-123"))

    @patch("main.delete_video_package", return_value=False)
    @patch("main.verify_access_token", return_value="user-123")
    def test_delete_returns_not_found_for_a_package_not_owned_by_user(self, _verify_token, delete_package):
        with patch("main.deleted_package_ids", set()), patch("main.jobs", {}):
            response = self.client.delete(
                "/packages/package-123",
                headers={"Authorization": "Bearer test-token"},
            )

        self.assertEqual(response.status_code, 404)
        delete_package.assert_called_once()

    @patch("main.delete_video_package", return_value=True)
    @patch("main.verify_access_token", return_value="user-123")
    def test_deleting_a_running_package_cancels_its_job(self, _verify_token, _delete_package):
        jobs = {
            "package-123": {
                "owner_id": "user-123",
                "status": "running",
                "cancel_requested": False,
            }
        }
        with patch("main.deleted_package_ids", set()), patch("main.jobs", jobs):
            response = self.client.delete(
                "/packages/package-123",
                headers={"Authorization": "Bearer test-token"},
            )
            status_response = self.client.get(
                "/status/package-123",
                headers={"Authorization": "Bearer test-token"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(jobs["package-123"]["cancel_requested"])
        self.assertEqual(jobs["package-123"]["status"], "deleted")
        self.assertEqual(status_response.status_code, 404)

    def test_background_jobs_cannot_resave_a_deleted_package(self):
        package = {"id": "package-123", "user_id": "user-123"}
        with patch("main.deleted_package_ids", {"package-123"}), patch("main.save_video_package") as save_package:
            with self.assertRaises(PackageDeletedError):
                _save_job_package(package, "test-token", "user-123")

        save_package.assert_not_called()

    def test_ai_review_approval_is_not_creator_approval(self):
        state = create_initial_state()
        state.update({
            "story": "AI-reviewed script.",
            "ai_review_approved": True,
            "story_approved": False,
        })

        package = _package_from_state(
            "package-123",
            "user-123",
            state,
            "awaiting_approval",
            current_story_version=1,
        )

        self.assertTrue(package["ai_review_approved"])
        self.assertFalse(package["story_approved"])

    @patch("main.run_story_pipeline_job")
    @patch("main.save_video_package", side_effect=lambda package, _token: package)
    @patch("main.verify_access_token", return_value="user-123")
    def test_generation_persists_owned_story_draft_without_assets(
        self,
        _verify_token,
        save_package,
        _story_job,
    ):
        response = self.client.post(
            "/generate",
            json={"topic": ""},
            headers={"Authorization": "Bearer test-token"},
        )

        self.assertEqual(response.status_code, 200)
        payload = save_package.call_args.args[0]
        self.assertEqual(payload["user_id"], "user-123")
        self.assertEqual(payload["status"], "generating_story")
        self.assertFalse(payload["story_approved"])
        self.assertEqual(payload["characters"], [])
        self.assertEqual(payload["video_clips"], [])
        self.assertEqual(payload["seo_metadata"], {})
        self.assertTrue(payload["workflow_state"]["research_enabled"])
        self.assertEqual(payload["workflow_state"]["language"], "Auto")
        self.assertEqual(payload["workflow_state"]["genre"], "")
        self.assertEqual(payload["workflow_state"]["video_style"], "")
        self.assertEqual(payload["workflow_state"]["creator_topic"], "")

    @patch("main.verify_access_token", return_value="user-123")
    def test_generation_rejects_story_briefs_over_1000_characters(self, _verify_token):
        response = self.client.post(
            "/generate",
            json={"topic": "A" * 1001},
            headers={"Authorization": "Bearer test-token"},
        )

        self.assertEqual(response.status_code, 400)

    @patch("main.run_production_job")
    @patch("main.save_video_package", side_effect=lambda package, _token: package)
    @patch(
        "main.get_package_by_id",
        return_value={
            "id": "package-123",
            "user_id": "user-123",
            "status": "awaiting_approval",
            "story": "Creator-reviewed story.",
            "current_story_version": 1,
            "story_versions": [{"version": 1, "story": "Creator-reviewed story."}],
            "workflow_state": {
                "story": "Creator-reviewed story.",
                "story_approved": False,
                "characters": [],
                "video_clips": [],
                "thumbnail_prompt": "",
                "seo_metadata": {},
            },
        },
    )
    @patch("main.verify_access_token", return_value="user-123")
    def test_approval_is_persisted_before_production_is_queued(
        self,
        _verify_token,
        _get_package,
        save_package,
        production_job,
    ):
        response = self.client.post(
            "/packages/package-123/approve",
            headers={"Authorization": "Bearer test-token"},
        )

        self.assertEqual(response.status_code, 200)
        persisted = save_package.call_args.args[0]
        self.assertEqual(persisted["status"], "generating_assets")
        self.assertTrue(persisted["story_approved"])
        self.assertEqual(persisted["approved_story_version"], 1)
        self.assertEqual(persisted["story_versions"][-1]["status"], "approved")
        save_package.assert_called_once()
        production_job.assert_called_once()

    def test_pending_creator_decision_is_returned_after_backend_restart(self):
        package = {
            "id": "restart-package-123",
            "user_id": "user-123",
            "status": "awaiting_approval",
            "story": "Saved creator decision draft.",
        }
        with (
            patch("main.jobs", {}),
            patch("main.get_package_by_id", return_value=package),
            patch("main.verify_access_token", return_value="user-123"),
        ):
            response = self.client.get(
                "/status/restart-package-123",
                headers={"Authorization": "Bearer test-token"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "awaiting_approval")
        self.assertEqual(response.json()["result"]["story"], "Saved creator decision draft.")

    def test_orphaned_in_progress_job_is_reported_as_interrupted(self):
        package = {
            "id": "interrupted-package-123",
            "user_id": "user-123",
            "status": "generating_story",
            "story": "",
        }
        with (
            patch("main.jobs", {}),
            patch("main.get_package_by_id", return_value=package),
            patch("main.save_video_package", side_effect=lambda saved, _token: saved) as save_package,
            patch("main.verify_access_token", return_value="user-123"),
        ):
            response = self.client.get(
                "/status/interrupted-package-123",
                headers={"Authorization": "Bearer test-token"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "failed")
        self.assertIn("backend restarted", response.json()["error"])
        self.assertEqual(save_package.call_args.args[0]["status"], "failed")

    @patch(
        "main.get_package_by_id",
        return_value={
            "id": "package-123",
            "user_id": "user-123",
            "status": "generating_story",
            "story": "Draft.",
            "workflow_state": {"story": "Draft."},
        },
    )
    @patch("main.verify_access_token", return_value="user-123")
    def test_approval_rejects_a_package_not_waiting_for_creator(
        self,
        _verify_token,
        _get_package,
    ):
        response = self.client.post(
            "/packages/package-123/approve",
            headers={"Authorization": "Bearer test-token"},
        )
        self.assertEqual(response.status_code, 409)

    @patch("main.run_story_revision_job")
    @patch("main.save_video_package", side_effect=lambda package, _token: package)
    @patch(
        "main.get_package_by_id",
        return_value={
            "id": "package-123",
            "user_id": "user-123",
            "status": "completed",
            "story": "Old story.",
            "current_story_version": 1,
            "story_versions": [{"version": 1, "story": "Old story."}],
            "workflow_state": {
                "story": "Old story.",
                "story_approved": True,
                "characters": [{"name": "Old"}],
                "video_clips": [{"clip_number": 1}],
                "thumbnail_prompt": "Old thumbnail",
                "seo_metadata": {"youtube": {"title": "Old"}},
            },
        },
    )
    @patch("main.verify_access_token", return_value="user-123")
    def test_story_edit_invalidates_old_assets_and_approval(
        self,
        _verify_token,
        _get_package,
        save_package,
        _revision_job,
    ):
        response = self.client.post(
            "/packages/package-123/revise",
            json={"story": "A new creator-edited story."},
            headers={"Authorization": "Bearer test-token"},
        )

        self.assertEqual(response.status_code, 200)
        persisted = save_package.call_args.args[0]
        self.assertEqual(persisted["story"], "A new creator-edited story.")
        self.assertEqual(persisted["status"], "reviewing_story")
        self.assertFalse(persisted["story_approved"])
        self.assertEqual(persisted["characters"], [])
        self.assertEqual(persisted["video_clips"], [])
        self.assertEqual(persisted["thumbnail_prompt"], "")
        self.assertEqual(persisted["seo_metadata"], {})
        self.assertEqual(persisted["current_story_version"], 2)


if __name__ == "__main__":
    unittest.main()
