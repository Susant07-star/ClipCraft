import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from dotenv import load_dotenv
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

load_dotenv()

from utils.llm_manager import LLMManager


class LLMManagerTests(unittest.TestCase):
    @patch.dict(os.environ, {"MODEL_API_KEY": "test-key"}, clear=False)
    @patch("utils.llm_manager.OpenAI")
    def test_invoke_uses_baseten_muse_spark_open(self, openai_client):
        response = SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(content="A short story.", refusal=None)
                )
            ]
        )
        openai_client.return_value.chat.completions.create.return_value = response

        result = LLMManager().invoke(
            [
                SystemMessage(content="Write a story."),
                HumanMessage(content="A lost lighthouse."),
            ],
            temperature=0.4,
        )

        self.assertIsInstance(result, AIMessage)
        self.assertEqual(result.content, "A short story.")
        openai_client.return_value.chat.completions.create.assert_called_once_with(
            model="meta-models/muse-spark-open",
            messages=[
                {"role": "developer", "content": "Write a story."},
                {"role": "user", "content": "A lost lighthouse."},
            ],
            temperature=0.4,
        )

    @patch.dict(os.environ, {"MODEL_API_KEY": ""}, clear=False)
    @patch("utils.llm_manager.OpenAI")
    def test_missing_api_key_fails_before_request(self, openai_client):
        with self.assertRaisesRegex(RuntimeError, "MODEL_API_KEY"):
            LLMManager().invoke([HumanMessage(content="hello")])
        openai_client.assert_not_called()


if __name__ == "__main__":
    unittest.main()
