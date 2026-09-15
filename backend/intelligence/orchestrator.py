"""Intelligence Orchestrator — the core of VOCIS.
Understands what data exists, decides which analyses are meaningful, runs deterministic
analytics, builds evidence packages, invokes GPT-5.4 reasoning, and synthesizes a unified
intelligence report. Runs as an async background job with live step status."""
import asyncio
import logging
import re
from datetime import datetime, timezone
import numpy as np

from core.db import db
from intelligence import sentiment as S
from intelligence import embeddings as E
from intelligence import themes as T
from intelligence import issues as I
from intelligence import analytics as A
from intelligence import reasoning as R
from intelligence import research as RES

logger = logging.getLogger("vocis.orchestrator")

STEPS = [
    ("structure", "Understanding data structure"),
    ("clean", "Cleaning & preparing feedback"),
    ("embed", "Generating semantic representations"),
    ("themes", "Discovering customer themes"),
    ("issues", "Evaluating issues & priority"),
    ("analytics", "Correlating trends, products & competitors"),
    ("research", "Retrieving external market context"),
    ("synthesis", "Synthesizing decision-ready intelligence"),
]

_REQUEST = ["wish", "please add", "would be great", "would love", "should have", "should add",
            "hope they add", "need a", "need an", "want a", "want an", "add a", "add an",
            "feature request", "option to", "ability to", "allow us", "let us", "can you add",
            "missing", "lacks", "lacking", "it would help", "suggestion"]


def _intent(text: str, sent: str) -> str:
    low = text.lower()
    if any(k in low for k in _REQUEST):
        return "request"
    if "?" in text and len(text) < 160:
        return "question"
    if sent == "positive":
        return "praise"
    if sent == "negative":
        return "complaint"
    return "statement"


async def _set_step(dataset_id, key, state, extra=None):
    upd = {f"analysis.step_state.{key}": state, "analysis.current": key,
           "analysis.updated_at": datetime.now(timezone.utc).isoformat()}
    if extra:
        upd.update(extra)
    await db.datasets.update_one({"id": dataset_id}, {"$set": upd})


async def _embed_cached(texts):
    model = E.get_provider().name
    hashes = [E.text_hash(t, model) for t in texts]
    cached = {}
    cursor = db.embedding_cache.find({"text_hash": {"$in": hashes}}, {"_id": 0})
    async for doc in cursor:
        cached[doc["text_hash"]] = doc["vector"]
    missing_idx = [i for i, h in enumerate(hashes) if h not in cached]
    if missing_idx:
        prov = E.get_provider()
        missing_texts = [texts[i] for i in missing_idx]
        vecs = await asyncio.get_event_loop().run_in_executor(None, prov.embed, missing_texts)
        ops = []
        for j, i in enumerate(missing_idx):
            v = vecs[j].tolist()
            cached[hashes[i]] = v
            ops.append({"text_hash": hashes[i], "vector": v})
        if ops:
            try:
                await db.embedding_cache.insert_many(ops, ordered=False)
            except Exception:
                pass
    return np.array([cached[h] for h in hashes], dtype=np.float32)


async def run_analysis(dataset_id: str):
    try:
        ds = await db.datasets.find_one({"id": dataset_id}, {"_id": 0})
        if not ds:
            return
        await db.datasets.update_one({"id": dataset_id}, {"$set": {
            "analysis.status": "running",
            "analysis.step_state": {k: "pending" for k, _ in STEPS},
            "analysis.started_at": datetime.now(timezone.utc).isoformat(),
            "analysis.error": None,
        }})

        records = ds["records"]
        profile = ds["profile"]
        caps = profile["capabilities"]
        rating_range = ds.get("schema", {}).get("_rating_range")

        await _set_step(dataset_id, "structure", "done")

        # --- clean + sentiment + intent ---
        await _set_step(dataset_id, "clean", "running")
        seen = set()
        cleaned = []
        for r in records:
            key = r["text"].lower()
            if key in seen:
                continue
            seen.add(key)
            cleaned.append(r)
        records = cleaned
        for r in records:
            sc = S.score_record(r["text"], r.get("rating"), rating_range)
            r.update(sc)
            r["intent"] = _intent(r["text"], sc["sentiment"])
        await _set_step(dataset_id, "clean", "done")

        # --- embeddings ---
        await _set_step(dataset_id, "embed", "running")
        texts = [r["text"] for r in records]
        vectors = await _embed_cached(texts)
        await _set_step(dataset_id, "embed", "done")

        # --- themes ---
        await _set_step(dataset_id, "themes", "running")
        raw_themes = await asyncio.get_event_loop().run_in_executor(
            None, T.discover_themes, vectors, texts)
        names = await R.name_themes(raw_themes) if raw_themes else []
        await _set_step(dataset_id, "themes", "done", {"analysis.theme_count": len(raw_themes)})

        # --- issues + priority ---
        await _set_step(dataset_id, "issues", "running")
        issue_list = I.build_issues(raw_themes, records, caps)
        # attach LLM names by matching identical member sets
        idx_map = {tuple(rt["member_indices"]): nm for rt, nm in zip(raw_themes, names)}
        for iss in issue_list:
            nm = idx_map.get(tuple(iss["member_indices"]), {})
            iss["name"] = nm.get("name") or (" ".join(w.capitalize() for w in iss["keywords"][:3]) or "Theme")
            iss["summary"] = nm.get("summary", "")
        clustered = sum(len(i["member_indices"]) for i in issue_list)
        await _set_step(dataset_id, "issues", "done")

        # --- analytics: temporal / competitive / product ---
        await _set_step(dataset_id, "analytics", "running")
        temporal = A.temporal_intelligence(records, issue_list, caps)
        competitive = A.competitive_intelligence(records, issue_list, caps)
        product = A.product_intelligence(records, issue_list, caps)
        await _set_step(dataset_id, "analytics", "done")

        # --- customer intelligence blocks (deterministic) ---
        pos = sum(1 for r in records if r["sentiment"] == "positive")
        neg = sum(1 for r in records if r["sentiment"] == "negative")
        neu = len(records) - pos - neg
        requests = [r for r in records if r["intent"] == "request"]
        love = [i for i in issue_list if i["polarity"] == "positive"][:4]
        dislike = [i for i in issue_list if i["polarity"] in ("negative", "mixed") and i["neg_share"] >= 0.4][:5]
        mixed_examples = _mixed(records)

        customer = {
            "sentiment": {"positive": pos, "negative": neg, "neutral": neu,
                          "total": len(records),
                          "avg_score": round(float(np.mean([r["sentiment_score"] for r in records])), 3)},
            "love": [_slim(i) for i in love],
            "dislike": [_slim(i) for i in dislike],
            "want": {"count": len(requests),
                     "examples": [r["text"] for r in requests[:6]]},
            "mixed_examples": mixed_examples,
        }

        # --- evidence package for LLM (reduced, not raw dataset) ---
        top_issues = issue_list[:8]
        package = _evidence_package(profile, customer, top_issues, temporal, competitive, product)

        # --- external research (decide if meaningful) ---
        await _set_step(dataset_id, "research", "running")
        market = None
        if RES.is_available():
            query = _research_query(ds, top_issues, competitive)
            res = await RES.search(query, max_results=6, topic="news", time_range="year")
            if res.get("sources"):
                cust_ctx = [{"theme": i["name"], "polarity": i["polarity"], "size": i["size"]} for i in top_issues]
                synth = await R.market_synthesis(cust_ctx, res["sources"])
                market = {"query": query, "sources": res["sources"], **(synth or {})}
            else:
                market = {"query": query, "sources": [], "unavailable_reason": res.get("error", "no_sources")}
        await _set_step(dataset_id, "research", "done")

        # --- synthesis (LLM, parallel) ---
        await _set_step(dataset_id, "synthesis", "running")
        ctx = {"records": len(records), "dimensions": list(profile["dimensions"].keys()),
               "capabilities": caps}
        narrative_tasks = [R.theme_narrative(i, ctx) for i in top_issues[:6]]
        results = await asyncio.gather(
            R.executive_synthesis(package),
            R.strategic_synthesis(package),
            R.competitive_narrative(competitive) if competitive else _none(),
            *narrative_tasks,
        )
        executive = results[0] or {}
        strategic = results[1] or {}
        comp_narr = results[2]
        narratives = results[3:]
        for iss, narr in zip(top_issues[:6], narratives):
            iss["narrative"] = narr
        if competitive and comp_narr:
            competitive["narrative"] = comp_narr

        report = {
            "dataset_id": dataset_id,
            "workspace_id": ds["workspace_id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "profile": profile,
            "capabilities": caps,
            "executive": executive,
            "customer": customer,
            "issues": [_public_issue(i) for i in issue_list],
            "temporal": temporal,
            "competitive": competitive,
            "product": product,
            "market": market,
            "strategic": strategic,
            "coverage": {"records": len(records), "clustered": clustered,
                         "unclustered": len(records) - clustered,
                         "themes": len(issue_list)},
        }
        await db.reports.replace_one({"dataset_id": dataset_id}, report, upsert=True)

        # persist enriched feedback for evidence explorer
        await db.feedback.delete_many({"dataset_id": dataset_id})
        theme_of = {}
        for iss in issue_list:
            for m in iss["member_indices"]:
                theme_of[m] = iss["name"]
        docs = []
        for idx, r in enumerate(records):
            docs.append({"dataset_id": dataset_id, "idx": idx, **r,
                         "theme": theme_of.get(idx)})
        if docs:
            for i in range(0, len(docs), 1000):
                await db.feedback.insert_many(docs[i:i + 1000], ordered=False)

        await db.datasets.update_one({"id": dataset_id}, {"$set": {
            "analysis.status": "complete",
            "analysis.completed_at": datetime.now(timezone.utc).isoformat(),
        }})
    except Exception as e:
        logger.exception("analysis failed")
        await db.datasets.update_one({"id": dataset_id}, {"$set": {
            "analysis.status": "failed", "analysis.error": str(e)[:500]}})


async def _none():
    return None


def _slim(i):
    return {"name": i["name"], "summary": i["summary"], "size": i["size"],
            "share": i["share"], "neg_share": i["neg_share"], "avg_sentiment": i["avg_sentiment"],
            "priority": i.get("priority"), "keywords": i["keywords"],
            "representative_texts": i["representative_texts"][:3]}


def _public_issue(i):
    return {k: i[k] for k in [
        "name", "summary", "size", "share", "negative", "positive", "neutral", "neg_share",
        "avg_severity", "avg_sentiment", "polarity", "growth", "recency", "breadth",
        "trajectory", "priority_score", "priority", "priority_factors", "keywords",
        "cohesion", "representative_texts", "representative_indices", "member_indices",
    ] if k in i} | {"narrative": i.get("narrative")}


def _mixed(records, limit=5):
    out = []
    for r in records:
        low = r["text"].lower()
        if (" but " in low or " however " in low or "although" in low) and len(r["text"]) > 40:
            if -0.6 < r["sentiment_score"] < 0.6:
                out.append({"text": r["text"], "sentiment_score": r["sentiment_score"]})
        if len(out) >= limit:
            break
    return out


def _evidence_package(profile, customer, top_issues, temporal, competitive, product):
    return {
        "dataset": {"records": profile["records_usable"],
                    "dimensions": list(profile["dimensions"].keys()),
                    "date_coverage": profile.get("date_coverage")},
        "sentiment": customer["sentiment"],
        "top_themes": [{
            "name": i["name"], "mentions": i["size"], "share_pct": round(i["share"] * 100, 1),
            "negative_pct": round(i["neg_share"] * 100, 1), "avg_severity": i["avg_severity"],
            "growth": i.get("growth"), "polarity": i["polarity"], "priority": i.get("priority"),
            "priority_score": i["priority_score"], "affected": i["breadth"]["by_dimension"],
            "sample_quotes": i["representative_texts"][:3],
        } for i in top_issues],
        "customer_requests": {"count": customer["want"]["count"],
                              "examples": customer["want"]["examples"][:4]},
        "temporal": None if not temporal else {
            "from": temporal["from"], "to": temporal["to"],
            "emerging": [{"theme": e["keywords"][:3], "growth": e["growth"]} for e in temporal["emerging"][:4]]},
        "competitive": None if not competitive else {
            "brands": competitive["brands"], "overall": competitive["overall"],
            "dimensions": [{"theme": d["keywords"][:3], "ratings": {b: v.get("rating") for b, v in d["ratings"].items()}}
                           for d in competitive["dimensions"][:6]]},
        "product": None if not product else {
            "products": [{"product": p["product"], "avg_sentiment": p["avg_sentiment"],
                          "neg_share": p["neg_share"]} for p in product["products"]]},
    }


def _research_query(ds, top_issues, competitive):
    parts = []
    if competitive and competitive.get("brands"):
        parts.append(" vs ".join(competitive["brands"][:3]))
    elif ds.get("brand"):
        parts.append(ds["brand"])
    if ds.get("industry"):
        parts.append(ds["industry"])
    if top_issues:
        parts.append(top_issues[0]["name"])
    parts.append("customer experience market trends")
    return " ".join(p for p in parts if p)[:300]
