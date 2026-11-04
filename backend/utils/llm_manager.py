"""Baseten client for Meta Muse Spark Open."""

import os
from pathlib import Path
from typing import Sequence, cast

from dotenv import load_dotenv
from langchain_core.messages import AIMessage, BaseMessage
from openai import OpenAI
from openai.types.chat import ChatCompletionMessageParam

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")

BASETEN_BASE_URL = os.environ.get(
    "BASETEN_BASE_URL",
    "https://inference.baseten.co/v1",
)
BASETEN_MODEL_ID = os.environ.get(
    "BASETEN_MODEL_ID",
    "meta-models/muse-spark-open-1026",
)
REQUEST_TIMEOUT_SECONDS = 120.0

_MESSAGE_ROLES = {
    "system": "developer",
    "human": "user",
    "ai": "assistant",
}


def _to_chat_messages(
    messages: Sequence[BaseMessage],
) -> list[ChatCompletionMessageParam]:
    """Convert LangChain messages to Baseten's OpenAI-compatible chat format."""
    converted = []
    for message in messages:
        role = _MESSAGE_ROLES.get(message.type)
        if role is None:
            raise ValueError(f"Unsupported message type for Muse Spark Open: {message.type}")
        if not isinstance(message.content, str):
            raise TypeError("Muse Spark Open prompts must contain text messages.")
        converted.append(
            cast(
                ChatCompletionMessageParam,
                {"role": role, "content": message.content},
            )
        )
    return converted


class LLMManager:
    """Calls one configured Meta model through Baseten; never falls back to another provider."""

    def invoke(
        self,
        messages: Sequence[BaseMessage],
        temperature: float = 0.7,
    ) -> AIMessage:
        api_key = os.environ.get("MODEL_API_KEY")
        if not api_key:
            raise RuntimeError(
                "MODEL_API_KEY is required for the Baseten Muse Spark Open provider."
            )

        client = OpenAI(
            base_url=BASETEN_BASE_URL,
            api_key=api_key,
            timeout=REQUEST_TIMEOUT_SECONDS,
            max_retries=2,
        )
        response = client.chat.completions.create(
            model=BASETEN_MODEL_ID,
            messages=_to_chat_messages(messages),
            temperature=temperature,
        )

        choice = response.choices[0]
        content = choice.message.content
        if choice.message.refusal:
            raise RuntimeError("Muse Spark Open refused the request.")
        if not isinstance(content, str) or not content.strip():
            raise RuntimeError(
                "Baseten Muse Spark Open returned an empty text response."
            )
        return AIMessage(content=content)


llm_manager = LLMManager()


def robust_llm_invoke(
    messages: Sequence[BaseMessage],
    temperature: float = 0.7,
) -> AIMessage:
    """Invoke Meta Muse Spark Open through Baseten."""
    return llm_manager.invoke(messages, temperature)
