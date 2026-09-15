"""Data ingestion: parse CSV/XLSX, adaptive schema detection, profiling.
Never assumes fixed column names — infers semantic roles from the data itself."""
import io
import re
import pandas as pd
import numpy as np
from datetime import datetime

# Name hints per semantic role (used as one signal, never the only one)
_HINTS = {
    "text": ["review", "feedback", "comment", "complaint", "description", "text",
             "body", "message", "content", "verbatim", "response", "note", "remark"],
    "title": ["title", "subject", "headline", "summary"],
    "date": ["date", "time", "created", "timestamp", "submitted", "posted", "day"],
    "rating": ["rating", "stars", "star", "score", "rate", "nps", "csat"],
    "product": ["product", "item", "sku", "model", "app", "service", "plan"],
    "brand": ["brand", "company", "vendor", "competitor", "manufacturer", "maker", "provider"],
    "category": ["category", "segment", "type", "department", "topic"],
    "region": ["region", "country", "city", "state", "location", "market", "geo"],
    "channel": ["channel", "platform", "device", "os"],
    "source": ["source", "site", "origin"],
    "language": ["language", "lang", "locale"],
    "segment": ["segment", "tier", "cohort", "persona", "customer_type"],
    "verified": ["verified", "confirmed"],
}


def read_table(file_bytes: bytes, filename: str) -> pd.DataFrame:
    name = (filename or "").lower()
    if name.endswith((".xlsx", ".xls")):
        return pd.read_excel(io.BytesIO(file_bytes))
    for enc in ("utf-8", "latin-1"):
        try:
            return pd.read_csv(io.BytesIO(file_bytes), encoding=enc, on_bad_lines="skip")
        except Exception:
            continue
    return pd.read_csv(io.BytesIO(file_bytes), encoding="utf-8", engine="python", on_bad_lines="skip")


def _name_match(col: str, role: str) -> bool:
    c = col.lower().strip()
    return any(h in c for h in _HINTS[role])


def _is_text_col(series) -> bool:
    return series.dtype == object or pd.api.types.is_string_dtype(series)


def _try_dates(series: pd.Series):
    s = series.dropna().astype(str).head(200)
    if s.empty:
        return 0.0
    parsed = pd.to_datetime(s, errors="coerce", format="mixed", dayfirst=False)
    return float(parsed.notna().mean())


def detect_schema(df: pd.DataFrame) -> dict:
    cols = list(df.columns)
    n = len(df)
    roles = {}
    used = set()

    # --- text: object column with the highest mean length + reasonable variety ---
    text_scores = {}
    for c in cols:
        if _is_text_col(df[c]):
            vals = df[c].dropna().astype(str)
            if vals.empty:
                continue
            mean_len = vals.str.len().mean()
            uniq_ratio = vals.nunique() / max(len(vals), 1)
            score = mean_len * (0.5 + 0.5 * uniq_ratio)
            if _name_match(c, "text"):
                score *= 1.6
            text_scores[c] = (score, mean_len)
    text_col = None
    if text_scores:
        text_col = max(text_scores, key=lambda k: text_scores[k][0])
        if text_scores[text_col][1] < 12 and not _name_match(text_col, "text"):
            text_col = None
    if text_col:
        roles["text"] = text_col
        used.add(text_col)

    # --- title ---
    for c in cols:
        if c in used:
            continue
        if _name_match(c, "title") and _is_text_col(df[c]):
            roles["title"] = c
            used.add(c)
            break

    # --- date ---
    best_date, best_date_score = None, 0.0
    for c in cols:
        if c in used:
            continue
        score = _try_dates(df[c])
        if _name_match(c, "date"):
            score += 0.25
        if score > best_date_score:
            best_date_score, best_date = score, c
    if best_date and best_date_score >= 0.6:
        roles["date"] = best_date
        used.add(best_date)

    # --- rating: numeric, small integer-ish range ---
    for c in cols:
        if c in used:
            continue
        num = pd.to_numeric(df[c], errors="coerce")
        if num.notna().mean() < 0.6:
            continue
        mn, mx = num.min(), num.max()
        if pd.notna(mn) and pd.notna(mx) and 0 <= mn and mx <= 100 and (mx - mn) <= 100:
            distinct = num.dropna().nunique()
            if _name_match(c, "rating") or (mx <= 10 and distinct <= 11):
                roles["rating"] = c
                roles["_rating_range"] = [float(mn), float(mx)]
                used.add(c)
                break

    # --- categorical roles ---
    def cardinality_ok(series):
        nun = series.dropna().nunique()
        return 1 < nun <= max(50, n * 0.5)

    for role in ["product", "brand", "category", "region", "channel", "source",
                 "language", "segment", "verified"]:
        for c in cols:
            if c in used:
                continue
            if _name_match(c, role) and cardinality_ok(df[c]):
                roles[role] = c
                used.add(c)
                break

    return roles


def _clean_text(x) -> str:
    if x is None:
        return ""
    s = str(x).strip()
    s = re.sub(r"\s+", " ", s)
    return s


def normalize_records(df: pd.DataFrame, schema: dict) -> list:
    """Map raw rows to normalized feedback records using detected roles."""
    text_col = schema.get("text")
    title_col = schema.get("title")
    records = []
    date_parsed = None
    if schema.get("date"):
        date_parsed = pd.to_datetime(df[schema["date"]], errors="coerce", format="mixed")

    for i in range(len(df)):
        row = df.iloc[i]
        text = _clean_text(row[text_col]) if text_col else ""
        if title_col and _clean_text(row[title_col]):
            t = _clean_text(row[title_col])
            text = (t + ". " + text).strip(". ") if text else t
        if not text or len(text) < 3:
            continue
        rec = {"text": text}
        if date_parsed is not None:
            d = date_parsed.iloc[i]
            rec["date"] = None if pd.isna(d) else d.isoformat()
        for role in ["rating", "product", "brand", "category", "region", "channel",
                     "source", "language", "segment", "verified"]:
            if schema.get(role):
                v = row[schema[role]]
                if pd.isna(v):
                    rec[role] = None
                elif role == "rating":
                    rec[role] = float(pd.to_numeric(v, errors="coerce"))
                else:
                    rec[role] = _clean_text(v)
        records.append(rec)
    return records


def profile_dataset(df: pd.DataFrame, schema: dict, records: list) -> dict:
    n_raw = len(df)
    texts = [r["text"] for r in records]
    dup = len(texts) - len(set(texts))
    dims = {}
    for role in ["rating", "product", "brand", "category", "region", "channel",
                 "source", "language", "segment"]:
        if schema.get(role):
            vals = [r.get(role) for r in records if r.get(role) not in (None, "")]
            if vals:
                dims[role] = {
                    "column": schema[role],
                    "distinct": len(set(vals)),
                    "coverage": round(len(vals) / max(len(records), 1), 3),
                    "top": [v for v, _ in _top_values(vals, 6)],
                }
    date_cov = None
    if schema.get("date"):
        dts = [r.get("date") for r in records if r.get("date")]
        if dts:
            dts_sorted = sorted(dts)
            date_cov = {"from": dts_sorted[0][:10], "to": dts_sorted[-1][:10],
                        "coverage": round(len(dts) / max(len(records), 1), 3),
                        "count": len(dts)}

    capabilities = {
        "semantic": len(records) >= 5,
        "temporal": bool(date_cov and date_cov["coverage"] >= 0.4 and date_cov["count"] >= 12),
        "rating": bool(dims.get("rating")),
        "product": bool(dims.get("product") and dims["product"]["distinct"] >= 2),
        "competitive": bool(dims.get("brand") and dims["brand"]["distinct"] >= 2),
        "regional": bool(dims.get("region") and dims["region"]["distinct"] >= 2),
    }
    return {
        "records_raw": n_raw,
        "records_usable": len(records),
        "duplicates_removed_est": dup,
        "text_column": schema.get("text"),
        "dimensions": dims,
        "date_coverage": date_cov,
        "capabilities": capabilities,
        "avg_text_length": int(np.mean([len(t) for t in texts])) if texts else 0,
    }


def _top_values(vals, k):
    from collections import Counter
    return Counter(vals).most_common(k)
