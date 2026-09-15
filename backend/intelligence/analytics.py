"""Temporal + competitive + product analytics. Purely deterministic.
Every function refuses to fabricate: returns None when the supporting dimension is absent."""
import numpy as np
from collections import Counter, defaultdict
from datetime import datetime


def _parse_dt(s):
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")) if s else None
    except Exception:
        return None


def temporal_intelligence(records: list, issues: list, capabilities: dict):
    if not capabilities.get("temporal"):
        return None
    dated = [(i, _parse_dt(r.get("date"))) for i, r in enumerate(records)]
    dated = [(i, d) for i, d in dated if d]
    if len(dated) < 12:
        return None
    dates = [d for _, d in dated]
    start, end = min(dates), max(dates)
    span_days = (end - start).days or 1
    bucket = "week" if span_days <= 400 else "month"

    def key(d):
        return d.isocalendar()[:2] if bucket == "week" else (d.year, d.month)

    sent_series = defaultdict(list)
    vol_series = Counter()
    idx_sent = {i: records[i].get("sentiment_score", 0) for i, _ in dated}
    for i, d in dated:
        k = key(d)
        sent_series[k].append(idx_sent[i])
        vol_series[k] += 1
    keys = sorted(sent_series.keys())
    overall = [{
        "label": _fmt_key(k, bucket),
        "volume": vol_series[k],
        "avg_sentiment": round(float(np.mean(sent_series[k])), 3),
    } for k in keys]

    emerging = []
    for iss in issues:
        traj = iss.get("trajectory")
        g = iss.get("growth")
        if traj and len(traj) >= 3 and g is not None and g >= 0.4 and iss["neg_share"] >= 0.4:
            emerging.append({
                "name": iss.get("name"),
                "keywords": iss["keywords"],
                "growth": g,
                "trajectory": traj,
                "size": iss["size"],
                "neg_share": iss["neg_share"],
                "priority_score": iss["priority_score"],
                "ref": iss["representative_indices"][:3],
            })
    emerging.sort(key=lambda x: -x["growth"])
    return {"bucket": bucket, "from": start.date().isoformat(), "to": end.date().isoformat(),
            "series": overall, "emerging": emerging[:6]}


def _fmt_key(k, bucket):
    if bucket == "week":
        return f"{k[0]}-W{k[1]:02d}"
    return f"{k[0]}-{k[1]:02d}"


def competitive_intelligence(records: list, issues: list, capabilities: dict):
    """Dynamically compare discovered themes across brands/competitors."""
    if not capabilities.get("competitive"):
        return None
    brand_key = None
    for r in records:
        if r.get("brand"):
            brand_key = "brand"
            break
    if not brand_key:
        return None
    brands = [r["brand"] for r in records if r.get("brand")]
    brand_counts = Counter(brands)
    top_brands = [b for b, _ in brand_counts.most_common(5) if brand_counts[b] >= 3]
    if len(top_brands) < 2:
        return None

    # Overall sentiment per brand
    overall = {}
    for b in top_brands:
        recs = [r for r in records if r.get("brand") == b]
        overall[b] = {
            "count": len(recs),
            "avg_sentiment": round(float(np.mean([r.get("sentiment_score", 0) for r in recs])), 3),
            "neg_share": round(sum(1 for r in recs if r.get("sentiment") == "negative") / len(recs), 3),
        }

    # Dimension = discovered theme. Rate each brand Strong/Medium/Weak by relative sentiment.
    dimensions = []
    for iss in issues[:8]:
        per_brand = {}
        for b in top_brands:
            member_recs = [records[i] for i in iss["member_indices"] if records[i].get("brand") == b]
            if len(member_recs) < 2:
                per_brand[b] = None
                continue
            avg = float(np.mean([r.get("sentiment_score", 0) for r in member_recs]))
            per_brand[b] = {"avg_sentiment": round(avg, 3), "mentions": len(member_recs)}
        rated = {b: v for b, v in per_brand.items() if v}
        if len(rated) < 2:
            continue
        vals = [v["avg_sentiment"] for v in rated.values()]
        vmin, vmax = min(vals), max(vals)
        rng = (vmax - vmin) or 1e-6
        ratings = {}
        for b, v in per_brand.items():
            if not v:
                ratings[b] = {"rating": "n/a", "avg_sentiment": None, "mentions": 0}
                continue
            rel = (v["avg_sentiment"] - vmin) / rng
            band = "Strong" if rel >= 0.66 else ("Weak" if rel <= 0.33 else "Medium")
            ratings[b] = {"rating": band, "avg_sentiment": v["avg_sentiment"], "mentions": v["mentions"]}
        dimensions.append({"name": iss.get("name"), "keywords": iss["keywords"],
                           "ref": iss["representative_indices"][:3], "ratings": ratings})

    return {"brands": top_brands, "overall": overall, "dimensions": dimensions}


def product_intelligence(records: list, issues: list, capabilities: dict):
    if not capabilities.get("product"):
        return None
    products = Counter(r.get("product") for r in records if r.get("product"))
    top = [p for p, c in products.most_common(6) if c >= 3]
    if len(top) < 1:
        return None
    out = []
    for p in top:
        recs = [r for r in records if r.get("product") == p]
        neg = sum(1 for r in recs if r.get("sentiment") == "negative")
        pos = sum(1 for r in recs if r.get("sentiment") == "positive")
        # top issue for this product
        prod_issues = []
        for iss in issues:
            cnt = sum(1 for i in iss["member_indices"] if records[i].get("product") == p)
            if cnt >= 2:
                prod_issues.append({"name": iss.get("name"), "keywords": iss["keywords"], "mentions": cnt,
                                    "neg_share": iss["neg_share"], "priority": iss.get("priority")})
        prod_issues.sort(key=lambda x: -x["mentions"])
        out.append({
            "product": p, "count": len(recs),
            "avg_sentiment": round(float(np.mean([r.get("sentiment_score", 0) for r in recs])), 3),
            "neg_share": round(neg / len(recs), 3), "pos_share": round(pos / len(recs), 3),
            "top_issues": prod_issues[:4],
        })
    out.sort(key=lambda x: -x["count"])
    return {"products": out}
