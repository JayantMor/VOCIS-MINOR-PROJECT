"""Deterministic sentiment + severity. No LLM used for scoring (facts stay factual)."""
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

_analyzer = SentimentIntensityAnalyzer()

# Severity signal lexicon — indicates high-impact experiences, not just negativity.
_SEVERE = [
    "fraud", "scam", "stolen", "charged twice", "double charged", "unauthorized",
    "refund", "money back", "cancel", "cancelled", "lawsuit", "legal", "dangerous",
    "unsafe", "broken", "unusable", "crash", "crashes", "crashing", "data loss",
    "lost data", "hacked", "breach", "security", "never received", "still waiting",
    "worst", "terrible", "awful", "disgusting", "furious", "unacceptable",
    "failed", "failure", "not working", "doesn't work", "does not work", "error",
    "overcharged", "locked out", "account locked", "cannot login", "can't log in",
]


def score_record(text: str, rating=None, rating_range=None) -> dict:
    vs = _analyzer.polarity_scores(text or "")
    compound = vs["compound"]  # -1..1
    # Blend rating when available (normalized to -1..1)
    if rating is not None and rating_range:
        lo, hi = rating_range
        if hi > lo:
            norm = (rating - lo) / (hi - lo) * 2 - 1
            compound = 0.5 * compound + 0.5 * norm
    if compound >= 0.15:
        label = "positive"
    elif compound <= -0.15:
        label = "negative"
    else:
        label = "neutral"

    low = (text or "").lower()
    severe_hits = sum(1 for kw in _SEVERE if kw in low)
    # severity 0..1: negativity intensity amplified by severe keyword hits
    neg_intensity = max(0.0, -compound)
    severity = min(1.0, neg_intensity * 0.7 + min(severe_hits, 3) * 0.15)
    if label != "negative":
        severity *= 0.4

    # crude confidence: longer, more polar text = more confident
    conf = min(1.0, 0.4 + abs(compound) * 0.5 + min(len(low), 300) / 1000)
    return {
        "sentiment_score": round(compound, 4),
        "sentiment": label,
        "severity": round(severity, 4),
        "severe_signals": severe_hits,
        "confidence": round(conf, 3),
    }
