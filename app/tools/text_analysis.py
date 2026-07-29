"""
PayParity — Text Analysis Tools
Provides bias lexicon analysis, gendered language detection, and counterfactual text substitution.
"""
from __future__ import annotations

import re
from typing import List, Dict, Optional
import structlog

logger = structlog.get_logger(__name__)

# ── Bias Lexicon ──────────────────────────────────────────────────────────────
# Curated list of phrases associated with evaluative bias in performance reviews.
# Sources: Textio analysis, Kieran Snyder (2014), scholarly literature.

BIAS_LEXICON = {
    "personality_vs_performance": [
        "abrasive", "bossy", "aggressive", "difficult to work with",
        "too emotional", "overly emotional", "sensitive", "needs to be more confident",
        "needs to speak up more", "too quiet", "lacks executive presence",
        "too direct", "tone needs improvement", "communication style",
        "not a team player", "needs to manage up better",
    ],
    "attribution_bias": [
        "got lucky", "was in the right place", "had help from",
        "benefited from", "was supported by", "relied on the team",
        "happened to", "fortunate that",
    ],
    "double_standard": [
        "for a woman", "for someone of her background",
        "surprisingly strong", "exceeded expectations despite",
        "better than expected", "unexpectedly good",
    ],
    "stereotype": [
        "natural nurturer", "great with people skills", "emotional intelligence",
        "people person", "very organized", "detail-oriented as expected",
        "technically surprising", "strong for the role",
    ],
    "vague_praise": [
        "nice to have around", "pleasant", "easy to work with",
        "likable", "friendly", "good attitude",
    ],
    "hedging": [
        "sometimes", "occasionally", "can be", "tends to",
        "at times", "when motivated", "depending on",
    ],
}

GENDERED_TERMS = {
    # feminine-coded → masculine-coded mapping
    "collaborative": "decisive",
    "helpful": "impactful",
    "supportive": "strategic",
    "nurturing": "mentoring",
    "communal": "independent",
    "pleasant": "professional",
    "likable": "competent",
    "emotional": "passionate",
    "bossy": "assertive",
    "aggressive": "direct",
    "abrasive": "candid",
}

# Reverse map
GENDERED_TERMS_REVERSE = {v: k for k, v in GENDERED_TERMS.items()}


class BiasLexiconAnalyzer:
    """Scans review text against the bias lexicon."""

    def __init__(self):
        self._lexicon = BIAS_LEXICON
        self._all_phrases = [
            (phrase, category)
            for category, phrases in BIAS_LEXICON.items()
            for phrase in phrases
        ]

    @property
    def size(self) -> int:
        return len(self._all_phrases)

    def analyze(self, text: str) -> dict:
        """
        Scan text for bias phrases.
        Returns: {flagged_phrases, primary_category, severity_score}
        """
        text_lower = text.lower()
        flagged = []
        category_counts: Dict[str, int] = {}

        for phrase, category in self._all_phrases:
            if phrase.lower() in text_lower:
                flagged.append({
                    "phrase": phrase,
                    "category": category,
                    "span": self._find_span(text_lower, phrase.lower()),
                })
                category_counts[category] = category_counts.get(category, 0) + 1

        primary_category = (
            max(category_counts, key=category_counts.get)
            if category_counts else "none"
        )

        severity_score = min(1.0, len(flagged) * 0.1 + (0.3 if primary_category in [
            "personality_vs_performance", "double_standard"
        ] else 0.0))

        return {
            "flagged_phrases": flagged,
            "primary_category": primary_category,
            "severity_score": severity_score,
            "category_counts": category_counts,
        }

    def _find_span(self, text: str, phrase: str) -> Optional[list]:
        idx = text.find(phrase)
        return [idx, idx + len(phrase)] if idx >= 0 else None


class GenderedLanguageDetector:
    """Detects gendered language patterns in review text."""

    def __init__(self):
        self._gendered_terms = GENDERED_TERMS
        self._reverse_terms = GENDERED_TERMS_REVERSE

    def detect(self, text: str) -> dict:
        """
        Detect gendered terms in text.
        Returns: {gendered_terms, severity_score, direction}
        """
        text_lower = text.lower()
        found_terms = []

        for feminine_term in self._gendered_terms:
            if feminine_term in text_lower:
                found_terms.append({
                    "phrase": feminine_term,
                    "category": "feminine_coded",
                    "masculine_equivalent": self._gendered_terms[feminine_term],
                })

        severity = min(1.0, len(found_terms) * 0.15)

        return {
            "gendered_terms": found_terms,
            "severity_score": severity,
            "direction": "feminine_coded" if found_terms else "neutral",
        }


class CounterfactualTextSubstituter:
    """Performs systematic demographic-variable substitution in review text."""

    # Gender-coded term substitutions (feminine → masculine)
    GENDER_SUBSTITUTIONS = {k: v for k, v in GENDERED_TERMS.items()}
    GENDER_SUBSTITUTIONS_REVERSE = {v: k for k, v in GENDERED_TERMS.items()}

    # Pronoun substitutions (she/her → he/his)
    PRONOUN_MAP_F_TO_M = {
        " she ": " he ",
        " her ": " his ",
        " hers ": " his ",
        " herself ": " himself ",
        "she's": "he's",
        "she'd": "he'd",
        "she'll": "he'll",
    }

    PRONOUN_MAP_M_TO_F = {v: k for k, v in PRONOUN_MAP_F_TO_M.items()}

    def substitute(self, text: str, substitution_map: dict) -> str:
        """Apply a substitution map to text (case-insensitive, word-boundary aware)."""
        result = text
        for original, replacement in substitution_map.items():
            pattern = re.compile(r'\b' + re.escape(original) + r'\b', re.IGNORECASE)
            result = pattern.sub(replacement, result)
        return result

    def make_gender_neutral(self, text: str) -> str:
        """Attempt to make text gender-neutral."""
        result = text
        for female, male in self.PRONOUN_MAP_F_TO_M.items():
            result = result.replace(female, " they ")
        return result
