import json
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import httpx

from backend.app.config import settings

logger = logging.getLogger(__name__)

class AIProvider(ABC):
    """
    Abstract base class for AI Model Providers.
    Supports OllamaProvider (default local Qwen3-8B) and potential cloud providers.
    """

    @abstractmethod
    def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
    ) -> str:
        pass

    @abstractmethod
    def extract_structured_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def is_available(self) -> bool:
        pass


class OllamaProvider(AIProvider):
    """
    Ollama LLM Provider running local model (Qwen3-8B).
    Communicates via Ollama HTTP REST API.
    """

    def __init__(self, model: str = None, base_url: str = None, timeout: float = 8.0):
        self.model = model or getattr(settings, "AI_MODEL", "qwen3:8b")
        self.base_url = (base_url or getattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434")).rstrip("/")
        self.timeout = timeout

    def is_available(self) -> bool:
        try:
            with httpx.Client(timeout=2.0) as client:
                res = client.get(f"{self.base_url}/api/tags")
                return res.status_code == 200
        except Exception:
            return False

    def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
    ) -> str:
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
            },
        }
        if system_prompt:
            payload["system"] = system_prompt

        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.post(url, json=payload)
                res.raise_for_status()
                data = res.json()
                return data.get("response", "").strip()
        except Exception as e:
            logger.warning(f"Ollama generation failed ({e}). Falling back.")
            raise RuntimeError(f"Ollama provider unavailable: {e}")

    def extract_structured_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        full_sys_prompt = (
            (system_prompt or "") + "\nRespond ONLY with valid, unformatted JSON. Do not include markdown codeblocks or extra text."
        ).strip()

        try:
            raw_text = self.generate_response(prompt=prompt, system_prompt=full_sys_prompt, temperature=0.0)
            cleaned = raw_text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
            return json.loads(cleaned)
        except Exception as e:
            logger.warning(f"Ollama structured JSON extraction failed: {e}")
            return None


class FallbackProvider(AIProvider):
    """
    Fallback deterministic provider when local LLM server (Ollama) is offline.
    Uses rule-based templating to ensure 100% system availability.
    """

    def is_available(self) -> bool:
        return True

    def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
    ) -> str:
        return "I am operating using rule-based retrieval while local AI mode is offline."

    def extract_structured_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        return None


def get_ai_provider() -> AIProvider:
    """
    Factory function returning OllamaProvider if accessible, otherwise FallbackProvider.
    """
    provider = OllamaProvider()
    if provider.is_available():
        return provider
    return FallbackProvider()
