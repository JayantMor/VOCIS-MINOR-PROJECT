"""AI reasoning & synthesis layer.
GPT-5.4 receives STRUCTURED EVIDENCE PACKAGES (facts computed deterministically in Python)
and produces analyst-grade narrative. It never calculates statistics and never invents
numbers, competitors, or dimensions — it reasons over what it is given.
"""
import json
import asyncio
import logging
from emergentintegrations.llm.chat import LlmChat, UserMessage

from core.config import EMERGENT_LLM_KEY, LLM_MODEL

logger = logging.getLogger("vocis.reasoning")

_SEM = asyncio.Semaphore(4)

_ANALYST_SYSTEM = (
    "You are VOCIS, a senior customer & market intelligence analyst. You reason over the "
    "structured EVIDENCE you are given and communicate like an excellent human analyst — "
    "connecting signals, explaining what is happening and why it matters, distinguishing "
    "fact from interpretation, and acknowledging uncertainty. "
    "HARD RULES: (1) Use ONLY the numbers, quotes, entities and dimensions present in the "
    "evidence. Never invent figures, competitors, products, dates or causes. (2) If the "
    "evidence cannot establish a root cause, say what additional data would be needed instead "
    "of asserting causality. (3) Vary your phrasing — do not start sentences with the same "
    "stock phrases. (4) Write with variable depth: a minor point stays short, a consequential "
    "one gets a fuller explanation. (5) No bullet-point dumps unless asked; write flowing, "
    "precise prose. (6) Never use emojis or marketing fluff."
)


def _chat(system_message: str) -> LlmChat:
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id="vocis",
        system_message=system_message,
    ).with_model("openai", LLM_MODEL)


async def _send(system: str, prompt: str) -> str:
    async with _SEM:
        last = None
        for attempt in range(2):
            try:
                chat = _chat(system)
                resp = await chat.send_message(UserMessage(text=prompt))
                text = resp if isinstance(resp, str) else str(resp)
                if text and text.strip():
                    return text
            except Exception as e:
                last = e
                await asyncio.sleep(1.0 + attempt)
        if last:
            raise last
        return ""


def _extract_json(text: str):
    t = text.strip()
    if t.startswith("```"):
        t = t.split("```", 2)[1]
        if t.startswith("json"):
            t = t[4:]
        t = t.strip("` \n")
    start = t.find("{")
    end = t.rfind("}")
    if start != -1 and end != -1:
        t = t[start:end + 1]
    return json.loads(t)


async def llm_json(system: str, prompt: str, default=None):
    try:
        raw = await _send(system, prompt + "\n\nReturn ONLY valid JSON, no prose, no code fences.")
        return _extract_json(raw)
    except Exception as e:
        logger.warning(f"llm_json failed: {e}")
        return default


async def llm_text(system: str, prompt: str, default=""):
    try:
        return (await _send(system, prompt)).strip()
    except Exception as e:
        logger.warning(f"llm_text failed: {e}")
        return default


async def name_themes(themes: list) -> list:
    """Batch-name all discovered clusters in one call. Returns list of {name, summary}."""
    payload = [{
        "id": i,
        "keywords": t["keywords"],
        "sample_feedback": t["representative_texts"][:5],
        "size": t["size"],
    } for i, t in enumerate(themes)]
    prompt = (
        "Below are customer-feedback clusters discovered by semantic clustering. For EACH cluster, "
        "produce a concise, specific, human-readable theme name (2-4 words, Title Case) that reflects "
        "what customers are actually talking about, plus a one-sentence neutral summary. "
        "Avoid generic labels like 'Good Service', 'Customer Issue', 'General Feedback' unless the "
        "evidence is genuinely that generic. Base names strictly on the evidence.\n\n"
        f"CLUSTERS:\n{json.dumps(payload, ensure_ascii=False)}\n\n"
        'Return JSON: {"themes":[{"id":0,"name":"...","summary":"..."}, ...]}'
    )
    out = await llm_json(_ANALYST_SYSTEM, prompt, default={"themes": []})
    mapping = {t["id"]: t for t in out.get("themes", []) if "id" in t}
    result = []
    for i, t in enumerate(themes):
        m = mapping.get(i, {})
        name = m.get("name") or (" ".join(w.capitalize() for w in t["keywords"][:3]) or "Theme")
        result.append({"name": name, "summary": m.get("summary", "")})
    return result


async def theme_narrative(issue: dict, context: dict) -> str:
    facts = {
        "theme": issue.get("name"),
        "mentions": issue["size"],
        "share_of_feedback_pct": round(issue["share"] * 100, 1),
        "negative_pct": round(issue["neg_share"] * 100, 1),
        "avg_severity_0_1": issue["avg_severity"],
        "growth_vs_prev_period": issue.get("growth"),
        "recency_0_1": issue.get("recency"),
        "affected_dimensions": issue["breadth"]["by_dimension"],
        "priority_band": issue.get("priority"),
        "priority_score_0_100": issue["priority_score"],
    }
    prompt = (
        "Write a deep, analyst-grade narrative about this customer theme. Follow a natural flow: "
        "what is observed, the relevant context, what the evidence shows, your interpretation, why it "
        "matters, and what the business should investigate or do next — but write it as flowing prose, "
        "NOT as labelled sections. Be specific to the numbers. If a root cause cannot be established "
        "from feedback alone, state what data would be needed. 120-220 words.\n\n"
        f"DATASET CONTEXT: {json.dumps(context, ensure_ascii=False)}\n"
        f"FACTS: {json.dumps(facts, ensure_ascii=False)}\n"
        f"REPRESENTATIVE CUSTOMER QUOTES: {json.dumps(issue['representative_texts'][:5], ensure_ascii=False)}"
    )
    return await llm_text(_ANALYST_SYSTEM, prompt)


async def executive_synthesis(package: dict) -> dict:
    prompt = (
        "You are producing the Executive Intelligence overview for a company. Using ONLY the evidence "
        "below, produce a JSON object. Each field must be defensible from the evidence and written in "
        "natural analyst language (not a template). If a field is not supported by the evidence, set it "
        "to null.\n\n"
        f"EVIDENCE:\n{json.dumps(package, ensure_ascii=False)}\n\n"
        'Return JSON with keys: '
        '{"headline": "one strong sentence — the single most consequential finding", '
        '"executive_summary": "2-4 sentence synthesis connecting the signals", '
        '"most_important_finding": "...", "what_changed": "... or null if no temporal data", '
        '"biggest_pain": "...", "strongest_signal": "... positive experience", '
        '"customer_demand": "... top request/opportunity or null", '
        '"competitive_signal": "... or null if no competitor data", '
        '"recommended_attention": "what deserves investigation now"}'
    )
    return await llm_json(_ANALYST_SYSTEM, prompt, default={})


async def strategic_synthesis(package: dict) -> dict:
    prompt = (
        "Produce strategic intelligence for leadership. Using ONLY the evidence, connect findings into "
        "a coherent view of what matters for the business. Every item must trace to the evidence and "
        "avoid generic advice.\n\n"
        f"EVIDENCE:\n{json.dumps(package, ensure_ascii=False)}\n\n"
        'Return JSON: {"synthesis":"2-4 sentence strategic read of the situation", '
        '"priorities":[{"title":"...","rationale":"why, from evidence","evidence_ref":"theme name"}], '
        '"opportunities":[{"title":"...","rationale":"..."}], '
        '"risks":[{"title":"...","rationale":"..."}], '
        '"needs_investigation":[{"question":"...","why":"what data would resolve it"}]}'
    )
    return await llm_json(_ANALYST_SYSTEM, prompt, default={})


async def competitive_narrative(comp: dict) -> str:
    prompt = (
        "Write an analyst narrative about the competitive landscape using ONLY this evidence, which was "
        "derived from customer feedback across brands. Explain where each side appears stronger or weaker "
        "and what customers seem to value, using cautious language ('customer feedback indicates', "
        "'appears to'). Do not assert market share or facts not present. 120-200 words.\n\n"
        f"EVIDENCE: {json.dumps(comp, ensure_ascii=False)}"
    )
    return await llm_text(_ANALYST_SYSTEM, prompt)


async def market_synthesis(customer_context: dict, sources: list) -> dict:
    prompt = (
        "You are given (A) internal CUSTOMER EVIDENCE themes and (B) EXTERNAL web SOURCES retrieved for "
        "market context. Produce market intelligence that CLEARLY separates external market information "
        "from customer evidence and from your interpretation. Only use claims supported by the provided "
        "sources; cite them by their index. Never present an external fact as customer feedback.\n\n"
        f"CUSTOMER EVIDENCE (themes): {json.dumps(customer_context, ensure_ascii=False)}\n"
        f"EXTERNAL SOURCES: {json.dumps(sources, ensure_ascii=False)}\n\n"
        'Return JSON: {"market_summary":"synthesis grounded in the sources", '
        '"external_signals":[{"signal":"...","source_index":0}], '
        '"connection_to_customers":"how external context relates to the customer evidence (interpretation)", '
        '"whitespace":[{"opportunity":"...","rationale":"..."}]}'
    )
    return await llm_json(_ANALYST_SYSTEM, prompt, default={})
