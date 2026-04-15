import os
import httpx
from typing import Optional


# ─────────────────────────────────────────
# Configuration Voice AI
# ─────────────────────────────────────────

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_BASE_URL = "https://api.openai.com/v1"

OPENAI_HEADERS = {
    "Authorization": f"Bearer {OPENAI_API_KEY}",
}


# ─────────────────────────────────────────
# Service Voice AI
# ─────────────────────────────────────────

class VoiceAIService:
    """
    Service Voice AI — Speech to Text + Text to Speech
    Utilise Whisper (OpenAI) pour la reconnaissance vocale
    """

    # ─────────────────────────────────────
    # Speech to Text (Whisper)
    # ─────────────────────────────────────

    async def speech_to_text(
        self,
        audio_data: bytes,
        language: Optional[str] = None,
        filename: str = "audio.webm",
    ) -> dict:
        try:
            api_key = os.environ.get("OPENAI_API_KEY", "")
            headers = {"Authorization": f"Bearer {api_key}"}

            files = {
                "file": (filename, audio_data, "audio/webm"),
                "model": (None, "whisper-1"),
            }

            if language and language != "auto":
                files["language"] = (None, language[:2])

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{OPENAI_BASE_URL}/audio/transcriptions",
                    headers=headers,
                    files=files,
                    timeout=30,
                )
                data = response.json()

            text = data.get("text", "")
            if not text:
                return {"text": "", "language": language or "unknown", "error": "No text detected"}

            return {
                "text": text,
                "language": language or "auto",
                "success": True,
            }

        except Exception as e:
            return {"text": "", "error": str(e), "success": False}

    # ─────────────────────────────────────
    # Text to Speech (OpenAI TTS)
    # ─────────────────────────────────────

    async def text_to_speech(
        self,
        text: str,
        voice: str = "nova",
        language: str = "en",
        speed: float = 1.0,
    ) -> bytes:
        try:
            api_key = os.environ.get("OPENAI_API_KEY", "")
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }

            # Choisir la voix selon le genre et la langue
            voice_map = {
                "fr": "nova",
                "ar": "shimmer",
                "es": "nova",
                "de": "onyx",
                "zh": "shimmer",
                "ja": "shimmer",
                "en": "nova",
                "pt": "nova",
                "ru": "onyx",
                "it": "nova",
            }

            selected_voice = voice_map.get(language, "nova")

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{OPENAI_BASE_URL}/audio/speech",
                    headers=headers,
                    json={
                        "model": "tts-1",
                        "input": text,
                        "voice": selected_voice,
                        "speed": speed,
                        "response_format": "mp3",
                    },
                    timeout=30,
                )

                if response.status_code == 200:
                    return response.content
                else:
                    return b""

        except Exception as e:
            print(f"text_to_speech error: {e}")
            return b""

    # ─────────────────────────────────────
    # Voice Chat complet
    # ─────────────────────────────────────

    async def voice_chat(
        self,
        audio_data: bytes,
        gender: str = "female",
        language: Optional[str] = None,
        destination: Optional[str] = None,
        filename: str = "audio.webm",
    ) -> dict:
        try:
            # 1. Speech to Text
            stt_result = await self.speech_to_text(
                audio_data=audio_data,
                language=language,
                filename=filename,
            )

            if not stt_result.get("success"):
                return {
                    "success": False,
                    "error": stt_result.get("error", "Speech recognition failed"),
                }

            user_text = stt_result["text"]
            detected_language = stt_result.get("language", "en")

            return {
                "success": True,
                "user_text": user_text,
                "detected_language": detected_language,
                "gender": gender,
                "destination": destination,
            }

        except Exception as e:
            return {"success": False, "error": str(e)}