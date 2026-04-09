import os
import random
from typing import Optional
from enum import Enum


class AvatarGender(str, Enum):
    MALE = "male"
    FEMALE = "female"


class AvatarMood(str, Enum):
    WELCOME = "welcome"
    EXCITED = "excited"
    INFORMATIVE = "informative"
    EMPATHETIC = "empathetic"
    PROFESSIONAL = "professional"


class AvatarLanguage(str, Enum):
    EN = "en"
    FR = "fr"
    AR = "ar"
    ES = "es"
    DE = "de"
    IT = "it"
    ZH = "zh"
    JA = "ja"


MOCK_RESPONSES = {
    "en": [
        "What a fantastic choice! {destination} is absolutely breathtaking!",
        "Let me guide you through the best of {destination}!",
        "Wanderix is here to make your journey unforgettable!",
    ],
    "fr": [
        "Quel choix fantastique! {destination} est absolument magnifique!",
        "Laissez-moi vous guider vers les meilleures experiences de {destination}!",
        "Wanderix est la pour rendre votre voyage inoubliable!",
    ],
    "ar": [
        "يا لها من اختيار رائع! {destination} رائعة تماما!",
        "دعني ارشدك الى افضل التجارب في {destination}!",
        "Wanderix هنا لجعل رحلتك لا تنسى!",
    ],
    "es": [
        "Que eleccion fantastica! {destination} es impresionante!",
        "Dejame guiarte por {destination}!",
        "Wanderix esta aqui para tu viaje inolvidable!",
    ],
    "de": [
        "Was eine fantastische Wahl! {destination} ist atemberaubend!",
        "Lassen Sie mich Sie durch {destination} fuhren!",
        "Wanderix macht Ihre Reise unvergesslich!",
    ],
    "it": [
        "Che scelta fantastica! {destination} e mozzafiato!",
        "Lasciami guidarti a {destination}!",
        "Wanderix rende il tuo viaggio indimenticabile!",
    ],
    "zh": [
        "{destination}绝对令人叹为观止！",
        "让我带您体验{destination}最好的经历！",
        "Wanderix让您的旅程难忘！",
    ],
    "ja": [
        "{destination}は本当に素晴らしいです！",
        "{destination}での最高の体験にご案内します！",
        "Wanderixがあなたの旅を忘れられないものにします！",
    ],
}


class AvatarBrain:

    def __init__(self):
        pass

    def respond(
        self,
        message: str,
        gender: AvatarGender,
        language: AvatarLanguage,
        destination: Optional[str] = None,
        conversation_history: Optional[list] = None,
    ) -> dict:
        try:
            dest = destination or "this destination"
            lang = language.value
            responses = MOCK_RESPONSES.get(lang, MOCK_RESPONSES["en"])
            reply = random.choice(responses).format(destination=dest)
            mood = self._detect_mood(reply)
            animation = self._calculate_animation(mood)
            return {
                "text": reply,
                "mood": mood.value,
                "animation": animation,
                "language": lang,
                "gender": gender.value,
            }
        except Exception as e:
            return {
                "text": "I am here to help you discover amazing destinations!",
                "mood": AvatarMood.INFORMATIVE.value,
                "animation": {"type": "idle", "position": "center", "duration": 2000},
                "language": language.value,
                "gender": gender.value,
            }

    def welcome(
        self,
        gender: AvatarGender,
        language: AvatarLanguage,
        destination: Optional[str] = None,
    ) -> dict:
        return self.respond(
            message="welcome",
            gender=gender,
            language=language,
            destination=destination,
        )

    def _detect_mood(self, text: str) -> AvatarMood:
        lower = text.lower()
        if any(w in lower for w in ['fantastic', 'fantastique', 'fantastica']):
            return AvatarMood.EXCITED
        if any(w in lower for w in ['guide', 'best', 'meilleures']):
            return AvatarMood.INFORMATIVE
        return AvatarMood.WELCOME

    def _calculate_animation(self, mood: AvatarMood) -> dict:
        animations = {
            AvatarMood.WELCOME: {"type": "welcoming", "position": "center", "duration": 3000},
            AvatarMood.EXCITED: {"type": "talking", "position": "center", "duration": 2000},
            AvatarMood.INFORMATIVE: {"type": "pointing", "position": "right", "duration": 2500},
            AvatarMood.EMPATHETIC: {"type": "idle", "position": "left", "duration": 2000},
            AvatarMood.PROFESSIONAL: {"type": "talking", "position": "center", "duration": 2000},
        }
        return animations[mood]