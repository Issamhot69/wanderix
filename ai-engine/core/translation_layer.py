import os
import hashlib
import logging
import anthropic
import redis
from typing import Optional
from core.prompt_builder import Language, LANGUAGE_NAMES, UserContext

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────
# Traductions humaines vérifiées — AI Engine
# ─────────────────────────────────────────

VERIFIED_TRANSLATIONS = {
    "itinerary.day": {
        Language.EN: "Day",
        Language.FR: "Jour",
        Language.AR: "اليوم",
        Language.ES: "Día",
        Language.DE: "Tag",
        Language.IT: "Giorno",
        Language.ZH: "第",
        Language.JA: "日目",
    },
    "itinerary.morning": {
        Language.EN: "Morning",
        Language.FR: "Matin",
        Language.AR: "الصباح",
        Language.ES: "Mañana",
        Language.DE: "Morgen",
        Language.IT: "Mattina",
        Language.ZH: "上午",
        Language.JA: "午前",
    },
    "itinerary.afternoon": {
        Language.EN: "Afternoon",
        Language.FR: "Après-midi",
        Language.AR: "بعد الظهر",
        Language.ES: "Tarde",
        Language.DE: "Nachmittag",
        Language.IT: "Pomeriggio",
        Language.ZH: "下午",
        Language.JA: "午後",
    },
    "itinerary.evening": {
        Language.EN: "Evening",
        Language.FR: "Soirée",
        Language.AR: "المساء",
        Language.ES: "Noche",
        Language.DE: "Abend",
        Language.IT: "Sera",
        Language.ZH: "晚上",
        Language.JA: "夜",
    },
    "guide.recommended": {
        Language.EN: "Recommended Guide",
        Language.FR: "Guide Recommandé",
        Language.AR: "الدليل الموصى به",
        Language.ES: "Guía Recomendado",
        Language.DE: "Empfohlener Reiseführer",
        Language.IT: "Guida Consigliata",
        Language.ZH: "推荐导游",
        Language.JA: "おすすめガイド",
    },
    "hotel.recommended": {
        Language.EN: "Recommended Hotels",
        Language.FR: "Hôtels Recommandés",
        Language.AR: "الفنادق الموصى بها",
        Language.ES: "Hoteles Recomendados",
        Language.DE: "Empfohlene Hotels",
        Language.IT: "Hotel Consigliati",
        Language.ZH: "推荐酒店",
        Language.JA: "おすすめホテル",
    },
}


# ─────────────────────────────────────────
# Translation Layer principal
# ─────────────────────────────────────────

class TranslationLayer:
    """
    Couche de traduction centrale de l'AI Engine Wanderix.
    Stratégie : Traduction humaine → Cache Redis → Claude API
    """

    CACHE_TTL = 60 * 60 * 24 * 7  # 7 jours

    def __init__(self):
        self.client = anthropic.Anthropic(
            api_key=os.environ.get("ANTHROPIC_API_KEY")
        )
        self.redis = self._connect_redis()

    def _connect_redis(self) -> Optional[redis.Redis]:
        try:
            r = redis.Redis(
                host=os.environ.get("REDIS_HOST", "localhost"),
                port=int(os.environ.get("REDIS_PORT", 6379)),
                password=os.environ.get("REDIS_PASSWORD"),
                decode_responses=True,
            )
            r.ping()
            logger.info("✅ Redis connected")
            return r
        except Exception as e:
            logger.warning(f"⚠️ Redis unavailable: {e} — cache disabled")
            return None

    # ─────────────────────────────────────
    # Point d'entrée principal
    # ─────────────────────────────────────

    def translate(
        self,
        text: str,
        target_lang: Language,
        context: Optional[str] = None,
    ) -> str:
        """
        Traduit un texte vers la langue cible.
        Priorité : humain → cache → Claude
        """
        # 1. Traduction humaine vérifiée
        verified = self._get_verified(text, target_lang)
        if verified:
            return verified

        # 2. Cache Redis
        cache_key = self._build_key(text, target_lang, context)
        cached = self._get_cache(cache_key)
        if cached:
            return cached

        # 3. Claude API
        translated = self._translate_with_claude(text, target_lang, context)

        # 4. Sauvegarder en cache
        self._set_cache(cache_key, translated)

        return translated

    def translate_batch(
        self,
        texts: list[str],
        target_lang: Language,
        context: Optional[str] = None,
    ) -> list[str]:
        """
        Traduit une liste de textes en un seul appel Claude
        (optimise les coûts API)
        """
        # Séparer ce qui est déjà en cache
        results = {}
        to_translate = []

        for i, text in enumerate(texts):
            verified = self._get_verified(text, target_lang)
            if verified:
                results[i] = verified
                continue

            cache_key = self._build_key(text, target_lang, context)
            cached = self._get_cache(cache_key)
            if cached:
                results[i] = cached
                continue

            to_translate.append((i, text))

        # Traduire le reste en batch
        if to_translate:
            batch_text = "\n---\n".join([t for _, t in to_translate])
            batch_result = self._translate_with_claude(
                batch_text,
                target_lang,
                context,
                is_batch=True,
            )
            translations = batch_result.split("\n---\n")

            for idx, (i, original) in enumerate(to_translate):
                translated = translations[idx].strip() if idx < len(translations) else original
                results[i] = translated
                cache_key = self._build_key(original, target_lang, context)
                self._set_cache(cache_key, translated)

        return [results[i] for i in range(len(texts))]

    def translate_itinerary(
        self,
        itinerary: dict,
        target_lang: Language,
    ) -> dict:
        """
        Traduit un itinéraire complet intelligemment
        """
        translated = {}

        for key, value in itinerary.items():
            if isinstance(value, str):
                translated[key] = self.translate(
                    value,
                    target_lang,
                    context="travel itinerary",
                )
            elif isinstance(value, list):
                translated[key] = [
                    self.translate(item, target_lang, context="travel itinerary")
                    if isinstance(item, str) else item
                    for item in value
                ]
            elif isinstance(value, dict):
                translated[key] = self.translate_itinerary(value, target_lang)
            else:
                translated[key] = value

        return translated

    # ─────────────────────────────────────
    # Claude API
    # ─────────────────────────────────────

    def _translate_with_claude(
        self,
        text: str,
        target_lang: Language,
        context: Optional[str] = None,
        is_batch: bool = False,
    ) -> str:
        try:
            lang_name = LANGUAGE_NAMES[target_lang]

            system = f"""You are Wanderix's expert travel content translator.
Translate content to {lang_name} with:
- Natural, culturally appropriate expressions
- Travel/tourism industry terminology
- Wanderix brand tone: friendly, inspiring, professional
{"- Translate each section separated by '---' and keep the '---' separators in your response" if is_batch else ""}
- Return ONLY the translated text, nothing else"""

            user = f"""Translate to {lang_name}:
{f"Context: {context}" if context else ""}

{text}"""

            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1000,
                system=system,
                messages=[{"role": "user", "content": user}],
            )

            return response.content[0].text.strip()

        except Exception as e:
            logger.error(f"Claude translation error: {e}")
            return text  # Fallback : texte original

    # ─────────────────────────────────────
    # Helpers
    # ─────────────────────────────────────

    def _get_verified(
        self,
        key: str,
        lang: Language,
    ) -> Optional[str]:
        translations = VERIFIED_TRANSLATIONS.get(key)
        if not translations:
            return None
        return translations.get(lang) or translations.get(Language.EN)

    def _build_key(
        self,
        text: str,
        lang: Language,
        context: Optional[str],
    ) -> str:
        hash_val = hashlib.md5(text.encode()).hexdigest()[:16]
        return f"wanderix:ai:i18n:{lang.value}:{context or 'general'}:{hash_val}"

    def _get_cache(self, key: str) -> Optional[str]:
        if not self.redis:
            return None
        try:
            return self.redis.get(key)
        except Exception:
            return None

    def _set_cache(self, key: str, value: str) -> None:
        if not self.redis:
            return
        try:
            self.redis.setex(self.CACHE_TTL, self.CACHE_TTL, value)
        except Exception as e:
            logger.warning(f"Cache save failed: {e}")
