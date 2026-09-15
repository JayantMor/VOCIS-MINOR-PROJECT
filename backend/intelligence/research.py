"""External market research via Tavily. Every returned claim keeps its source URL.
Results are stored and always presented as EXTERNAL information, separate from customer evidence."""
import logging
import httpx

from core.config import TAVILY_API_KEY

logger = logging.getLogger("vocis.research")


def is_available() -> bool:
    return bool(TAVILY_API_KEY)


async def search(query: str, max_results: int = 6, topic: str = "general", time_range: str = None) -> dict:
    if not TAVILY_API_KEY:
        return {"available": False, "sources": [], "query": query}
    body = {
        "query": query, "topic": topic, "search_depth": "advanced",
        "max_results": max_results, "include_answer": False, "include_raw_content": False,
    }
    if time_range:
        body["time_range"] = time_range
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=10.0)) as client:
            resp = await client.post(
                "https://api.tavily.com/search",
                headers={"Authorization": f"Bearer {TAVILY_API_KEY}"},
                json=body,
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        logger.warning(f"tavily search failed: {e}")
        return {"available": True, "error": "research_provider_unavailable", "sources": [], "query": query}

    sources = []
    for item in data.get("results", []):
        if not item.get("url"):
            continue
        sources.append({
            "title": item.get("title") or item["url"],
            "url": item["url"],
            "snippet": (item.get("content") or "")[:600],
            "published_date": item.get("published_date"),
            "score": item.get("score"),
        })
    return {"available": True, "sources": sources, "query": query}
