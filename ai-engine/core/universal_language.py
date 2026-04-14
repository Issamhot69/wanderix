import os
import anthropic
from typing import Optional


# ─────────────────────────────────────────
# 50+ Langues supportées par Wanderix
# ─────────────────────────────────────────

SUPPORTED_LANGUAGES = {
    # Europe
    "en": "English",
    "fr": "French",
    "es": "Spanish",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "nl": "Dutch",
    "pl": "Polish",
    "ru": "Russian",
    "sv": "Swedish",
    "no": "Norwegian",
    "da": "Danish",
    "fi": "Finnish",
    "cs": "Czech",
    "ro": "Romanian",
    "hu": "Hungarian",
    "el": "Greek",
    "bg": "Bulgarian",
    "hr": "Croatian",
    "sk": "Slovak",
    "sl": "Slovenian",
    "uk": "Ukrainian",
    "ca": "Catalan",
    "eu": "Basque",

    # Moyen-Orient & Afrique du Nord
    "ar": "Arabic",
    "he": "Hebrew",
    "fa": "Persian (Farsi)",
    "tr": "Turkish",
    "ur": "Urdu",

    # Asie
    "zh": "Chinese (Simplified)",
    "zh-tw": "Chinese (Traditional)",
    "ja": "Japanese",
    "ko": "Korean",
    "hi": "Hindi",
    "bn": "Bengali",
    "ta": "Tamil",
    "te": "Telugu",
    "mr": "Marathi",
    "gu": "Gujarati",
    "pa": "Punjabi",
    "th": "Thai",
    "vi": "Vietnamese",
    "id": "Indonesian",
    "ms": "Malay",
    "tl": "Filipino",
    "my": "Burmese",
    "km": "Khmer",
    "lo": "Lao",
    "si": "Sinhala",
    "ne": "Nepali",
    "ka": "Georgian",
    "az": "Azerbaijani",
    "kk": "Kazakh",
    "uz": "Uzbek",

    # Afrique
    "sw": "Swahili",
    "am": "Amharic",
    "ha": "Hausa",
    "yo": "Yoruba",
    "ig": "Igbo",
    "zu": "Zulu",
    "af": "Afrikaans",
    "so": "Somali",

    # Amérique
    "qu": "Quechua",
    "ht": "Haitian Creole",
    "gn": "Guarani",
}

# Langues RTL (droite à gauche)
RTL_LANGUAGES = {"ar", "he", "fa", "ur"}

# ─────────────────────────────────────────
# Service Universel de Langue
# ─────────────────────────────────────────

class UniversalLanguageService:
    """
    Service de traduction universel utilisant Claude.
    Supporte 50+ langues sans fichiers statiques.
    """

    def __init__(self):
        self.client = anthropic.Anthropic(
            api_key=os.environ.get("ANTHROPIC_API_KEY")
        )

    # ─────────────────────────────────────
    # Détecter la langue automatiquement
    # ─────────────────────────────────────

    def detect_language(self, text: str) -> dict:
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=100,
                system="You are a language detector. Respond ONLY with a JSON object: {\"code\": \"language_code\", \"name\": \"language_name\", \"confidence\": 0.99}. Use ISO 639-1 codes.",
                messages=[{"role": "user", "content": f"Detect the language of: {text}"}],
            )
            import json
            result = json.loads(response.content[0].text.strip())
            result["rtl"] = result.get("code") in RTL_LANGUAGES
            return result
        except Exception as e:
            return {"code": "en", "name": "English", "confidence": 0.5, "rtl": False}

    # ─────────────────────────────────────
    # Traduire un texte
    # ─────────────────────────────────────

    def translate(
        self,
        text: str,
        target_language: str,
        context: Optional[str] = None,
        source_language: Optional[str] = None,
    ) -> dict:
        try:
            lang_name = SUPPORTED_LANGUAGES.get(target_language, target_language)

            system = f"""You are Wanderix's expert travel translator.
Translate to {lang_name} with:
- Natural, culturally appropriate expressions
- Travel/tourism industry terminology
- Warm, inspiring tone
{f"Context: {context}" if context else ""}
Return ONLY the translated text. Nothing else."""

            source_info = f" from {SUPPORTED_LANGUAGES.get(source_language, 'auto-detected language')}" if source_language else ""
            user = f"Translate{source_info} to {lang_name}:\n\n{text}"

            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1000,
                system=system,
                messages=[{"role": "user", "content": user}],
            )

            translated = response.content[0].text.strip()
            return {
                "original": text,
                "translated": translated,
                "source_language": source_language or "auto",
                "target_language": target_language,
                "target_language_name": lang_name,
                "rtl": target_language in RTL_LANGUAGES,
            }

        except Exception as e:
            return {
                "original": text,
                "translated": text,
                "error": str(e),
                "target_language": target_language,
                "rtl": target_language in RTL_LANGUAGES,
            }

    # ─────────────────────────────────────
    # Répondre dans la langue du user
    # ─────────────────────────────────────

    def respond_in_language(
        self,
        user_message: str,
        system_prompt: str,
        detected_language: Optional[str] = None,
    ) -> dict:
        try:
            # Détecter la langue si pas fournie
            if not detected_language:
                detection = self.detect_language(user_message)
                detected_language = detection.get("code", "en")

            lang_name = SUPPORTED_LANGUAGES.get(detected_language, detected_language)

            # Ajouter instruction de langue au system prompt
            enhanced_system = f"""{system_prompt}

CRITICAL LANGUAGE RULE:
- The user is writing in {lang_name}
- You MUST respond ONLY in {lang_name}
- Never switch to another language
- Use natural, culturally appropriate {lang_name} expressions
{"- This is a RTL language, structure content accordingly" if detected_language in RTL_LANGUAGES else ""}"""

            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1000,
                system=enhanced_system,
                messages=[{"role": "user", "content": user_message}],
            )

            return {
                "reply": response.content[0].text.strip(),
                "detected_language": detected_language,
                "language_name": lang_name,
                "rtl": detected_language in RTL_LANGUAGES,
            }

        except Exception as e:
            return {
                "reply": user_message,
                "detected_language": detected_language or "en",
                "error": str(e),
                "rtl": False,
            }

    # ─────────────────────────────────────
    # Traduire un objet entier
    # ─────────────────────────────────────

    def translate_object(
        self,
        obj: dict,
        target_language: str,
        fields_to_translate: list,
        context: Optional[str] = None,
    ) -> dict:
        result = dict(obj)
        for field in fields_to_translate:
            if field in obj and isinstance(obj[field], str) and obj[field]:
                translation = self.translate(
                    obj[field],
                    target_language,
                    context=context,
                )
                result[field] = translation.get("translated", obj[field])
        return result

    # ─────────────────────────────────────
    # Lister les langues supportées
    # ─────────────────────────────────────

    def get_supported_languages(self) -> list:
        return [
            {
                "code": code,
                "name": name,
                "rtl": code in RTL_LANGUAGES,
            }
            for code, name in SUPPORTED_LANGUAGES.items()
        ]