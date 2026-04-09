from dataclasses import dataclass
from typing import Optional
from enum import Enum


# ─────────────────────────────────────────
# Langues supportées
# ─────────────────────────────────────────

class Language(str, Enum):
    EN = "en"
    FR = "fr"
    AR = "ar"
    ES = "es"
    DE = "de"
    IT = "it"
    ZH = "zh"
    JA = "ja"


LANGUAGE_NAMES = {
    Language.EN: "English",
    Language.FR: "French",
    Language.AR: "Arabic",
    Language.ES: "Spanish",
    Language.DE: "German",
    Language.IT: "Italian",
    Language.ZH: "Chinese (Simplified)",
    Language.JA: "Japanese",
}

RTL_LANGUAGES = {Language.AR}


# ─────────────────────────────────────────
# Contexte utilisateur
# ─────────────────────────────────────────

@dataclass
class UserContext:
    language: Language
    nationality: Optional[str] = None
    travel_style: Optional[str] = None   # "luxury", "budget", "adventure", "cultural"
    interests: Optional[list[str]] = None  # ["food", "history", "beaches"]
    budget: Optional[str] = None         # "low", "medium", "high"
    trip_duration: Optional[int] = None  # en jours
    group_type: Optional[str] = None     # "solo", "couple", "family", "group"


# ─────────────────────────────────────────
# Builder principal
# ─────────────────────────────────────────

class PromptBuilder:
    """
    Construit des prompts multilingues et contextuels
    pour tous les modules AI de Wanderix.
    """

    def build_system_prompt(self, context: UserContext) -> str:
        """
        Système de base — injecté dans tous les appels Claude
        """
        lang_name = LANGUAGE_NAMES[context.language]
        is_rtl = context.language in RTL_LANGUAGES

        prompt = f"""You are Wanderix AI, an expert multilingual travel assistant.

LANGUAGE RULES:
- You MUST respond ONLY in {lang_name}
- Never switch languages mid-response
- Use natural, culturally appropriate expressions for {lang_name} speakers
{"- This language is RTL (Right-to-Left), structure content accordingly" if is_rtl else ""}

TONE & STYLE:
- Friendly, inspiring, and professional
- Travel and tourism industry expertise
- Culturally sensitive and inclusive

USER PROFILE:
- Language: {lang_name}
{f"- Nationality: {context.nationality}" if context.nationality else ""}
{f"- Travel style: {context.travel_style}" if context.travel_style else ""}
{f"- Interests: {', '.join(context.interests)}" if context.interests else ""}
{f"- Budget level: {context.budget}" if context.budget else ""}
{f"- Trip duration: {context.trip_duration} days" if context.trip_duration else ""}
{f"- Group type: {context.group_type}" if context.group_type else ""}

Always personalize responses based on the user profile above."""

        return prompt.strip()

    # ─────────────────────────────────────
    # ITINÉRAIRE
    # ─────────────────────────────────────

    def build_itinerary_prompt(
        self,
        destination: str,
        context: UserContext,
    ) -> str:
        """
        Génère un prompt pour créer un itinéraire personnalisé
        """
        lang_name = LANGUAGE_NAMES[context.language]

        return f"""Create a detailed {context.trip_duration or 7}-day travel itinerary for {destination}.

Requirements:
- Respond entirely in {lang_name}
- Tailor activities for: {context.travel_style or 'general'} travel style
- Budget level: {context.budget or 'medium'}
- Group: {context.group_type or 'solo traveler'}
{f"- Focus on: {', '.join(context.interests)}" if context.interests else ""}

Structure your response as:
1. Brief destination overview (2-3 sentences)
2. Day-by-day plan with:
   - Morning activity
   - Afternoon activity  
   - Evening recommendation
   - Local dining suggestion
3. Practical tips (transport, best time to visit, cultural notes)

Make it inspiring and practical."""

    # ─────────────────────────────────────
    # RECOMMANDATION HÔTEL
    # ─────────────────────────────────────

    def build_hotel_recommendation_prompt(
        self,
        destination: str,
        hotels: list[dict],
        context: UserContext,
    ) -> str:
        """
        Génère un prompt pour recommander les meilleurs hôtels
        """
        lang_name = LANGUAGE_NAMES[context.language]
        hotels_text = "\n".join([
            f"- {h['name']} | Stars: {h.get('stars', 'N/A')} | "
            f"Price: {h.get('price', 'N/A')}/night | "
            f"Rating: {h.get('rating', 'N/A')}"
            for h in hotels
        ])

        return f"""Based on the following hotels in {destination}, recommend the TOP 3 for this traveler.

AVAILABLE HOTELS:
{hotels_text}

TRAVELER PROFILE:
- Travel style: {context.travel_style or 'general'}
- Budget: {context.budget or 'medium'}
- Group: {context.group_type or 'solo'}

Respond in {lang_name}.
For each recommended hotel provide:
1. Hotel name
2. Why it matches this traveler (2 sentences)
3. Best feature
4. One honest consideration

Be specific and personalized."""

    # ─────────────────────────────────────
    # GUIDE LOCAL
    # ─────────────────────────────────────

    def build_guide_matching_prompt(
        self,
        destination: str,
        guides: list[dict],
        context: UserContext,
    ) -> str:
        """
        Génère un prompt pour matcher le meilleur guide local
        """
        lang_name = LANGUAGE_NAMES[context.language]
        guides_text = "\n".join([
            f"- {g['name']} | Languages: {', '.join(g.get('languages', []))} | "
            f"Specialty: {g.get('specialty', 'N/A')} | "
            f"Rating: {g.get('rating', 'N/A')}"
            for g in guides
        ])

        return f"""Match the best local guide in {destination} for this traveler.

AVAILABLE GUIDES:
{guides_text}

TRAVELER NEEDS:
- Speaks: {lang_name}
- Interests: {', '.join(context.interests) if context.interests else 'general tourism'}
- Style: {context.travel_style or 'general'}

Respond in {lang_name}.
Recommend ONE guide and explain:
1. Why this guide is the perfect match
2. What unique experience they will provide
3. Suggested tour focus based on traveler interests"""

    # ─────────────────────────────────────
    # ASSISTANT CHAT (Guide IA temps réel)
    # ─────────────────────────────────────

    def build_chat_prompt(
        self,
        user_message: str,
        destination: str,
        context: UserContext,
        conversation_history: Optional[list[dict]] = None,
    ) -> list[dict]:
        """
        Construit les messages pour le chat IA en temps réel
        """
        messages = []

        # Historique de conversation
        if conversation_history:
            messages.extend(conversation_history)

        # Message utilisateur enrichi
        enriched_message = f"""[Location: {destination}]
[Language: {LANGUAGE_NAMES[context.language]}]

{user_message}"""

        messages.append({
            "role": "user",
            "content": enriched_message,
        })

        return messages