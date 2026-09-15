"""Issue intelligence + transparent, explainable priority engine.
Each discovered theme becomes a candidate issue with deterministic metrics."""
import numpy as np
from collections import Counter
from datetime import datetime


def _parse_dt(s):
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")) if s else None
    except Exception:
        return None


def build_issues(themes: list, records: list, capabilities: dict) -> list:
    total = max(len(records), 1)
    dates = [_parse_dt(r.get("date")) for r in records]
    valid_dates = [d for d in dates if d]
    midpoint = None
    if capabilities.get("temporal") and len(valid_dates) >= 8:
        ordered = sorted(valid_dates)
        midpoint = ordered[len(ordered) // 2]

    issues = []
    for t in themes:
        members = t["member_indices"]
        recs = [records[i] for i in members]
        n = len(recs)
        neg = sum(1 for r in recs if r.get("sentiment") == "negative")
        pos = sum(1 for r in recs if r.get("sentiment") == "positive")
        neu = n - neg - pos
        neg_share = neg / n if n else 0
        avg_sev = float(np.mean([r.get("severity", 0) for r in recs])) if n else 0
        avg_sent = float(np.mean([r.get("sentiment_score", 0) for r in recs])) if n else 0

        growth = None
        recency = None
        trajectory = None
        if midpoint:
            member_dates = [dates[i] for i in members if dates[i]]
            if len(member_dates) >= 4:
                prev = sum(1 for d in member_dates if d < midpoint)
                curr = sum(1 for d in member_dates if d >= midpoint)
                growth = (curr - prev) / (prev + 1)
                latest = max(valid_dates)
                span = (latest - min(valid_dates)).days or 1
                recent_cut = max(member_dates)
                recency = 1 - min((latest - recent_cut).days / span, 1.0)
                trajectory = _weekly_series(member_dates)

        breadth = _breadth(recs)
        polarity = "negative" if neg_share >= 0.5 else ("positive" if pos / n >= 0.5 else "mixed")

        factors = _priority_factors(n / total, neg_share, avg_sev, growth, recency, breadth)
        score = round(sum(f["contribution"] for f in factors), 1)

        issues.append({
            "size": n,
            "share": round(n / total, 4),
            "negative": neg, "positive": pos, "neutral": neu,
            "neg_share": round(neg_share, 3),
            "avg_severity": round(avg_sev, 3),
            "avg_sentiment": round(avg_sent, 3),
            "polarity": polarity,
            "growth": None if growth is None else round(growth, 3),
            "recency": None if recency is None else round(recency, 3),
            "breadth": breadth,
            "trajectory": trajectory,
            "priority_score": score,
            "priority_factors": factors,
            "keywords": t["keywords"],
            "cohesion": t["cohesion"],
            "representative_texts": t["representative_texts"],
            "member_indices": members,
            "representative_indices": t["representative_indices"],
        })
    _assign_priority_band(issues)
    issues.sort(key=lambda x: -x["priority_score"])
    return issues


def _priority_factors(share, neg_share, severity, growth, recency, breadth):
    # Weighted, explainable. Weights re-normalized over available signals.
    comps = [
        ("Volume", "Share of total feedback", min(share * 3, 1.0), 0.22),
        ("Negativity", "Proportion of negative experiences", neg_share, 0.26),
        ("Severity", "Intensity / high-impact language", severity, 0.20),
        ("Breadth", "Spread across products / segments / regions", min(breadth["spread"] / 3, 1.0), 0.10),
    ]
    if growth is not None:
        comps.append(("Growth", "Increase vs previous period", max(min(growth, 1.5), 0) / 1.5, 0.14))
    if recency is not None:
        comps.append(("Recency", "How recent the signal is", recency, 0.08))
    total_w = sum(w for *_, w in comps)
    out = []
    for label, desc, raw, w in comps:
        norm_w = w / total_w
        out.append({
            "label": label, "description": desc,
            "value": round(float(raw), 3),
            "weight": round(norm_w, 3),
            "contribution": round(float(raw) * norm_w * 100, 2),
        })
    return out


def _assign_priority_band(issues):
    if not issues:
        return
    scores = [i["priority_score"] for i in issues]
    hi = np.percentile(scores, 75) if len(scores) > 3 else max(scores)
    lo = np.percentile(scores, 40) if len(scores) > 3 else min(scores)
    for i in issues:
        s = i["priority_score"]
        i["priority"] = "high" if s >= hi else ("medium" if s >= lo else "low")


def _breadth(recs):
    out = {}
    spread = 0
    for dim in ["product", "brand", "region", "segment", "channel"]:
        vals = [r.get(dim) for r in recs if r.get(dim)]
        if vals:
            distinct = len(set(vals))
            out[dim] = distinct
            spread += min(distinct - 1, 3) / 3
    return {"by_dimension": out, "spread": round(spread, 3)}


def _weekly_series(member_dates):
    if not member_dates:
        return None
    member_dates = sorted(member_dates)
    start = member_dates[0]
    buckets = Counter()
    for d in member_dates:
        wk = (d - start).days // 7
        buckets[wk] += 1
    max_wk = max(buckets)
    return [{"week": w, "count": buckets.get(w, 0)} for w in range(max_wk + 1)]
