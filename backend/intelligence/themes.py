"""Dynamic theme discovery via density clustering over semantic embeddings.
- Cluster count is data-driven (HDBSCAN), not fixed.
- Low-confidence/outlier feedback stays unclustered (noise).
- Near-duplicate clusters are merged by centroid similarity.
- Distinctive keywords extracted for LLM naming; every theme keeps member indices."""
import numpy as np
from collections import Counter
import re

from intelligence.embeddings import l2_normalize

_STOP = set("""a an the and or but if then this that these those i you he she it we they me my your our their its of to in on for with at by from as is are was were be been being have has had do does did not no so very just really too also can will would could should about into out up down over under again more most only own same than that's it's i've i'm don't didn't doesn't very""".split())


def discover_themes(vectors: np.ndarray, texts: list, min_records: int = 5) -> list:
    n = len(texts)
    if n < min_records:
        return []
    norm = l2_normalize(vectors.astype(np.float32))

    min_cluster_size = max(4, int(round(n * 0.02)))
    min_cluster_size = min(min_cluster_size, 40)
    labels = _cluster(norm, min_cluster_size)

    clusters = {}
    for idx, lab in enumerate(labels):
        if lab == -1:
            continue
        clusters.setdefault(int(lab), []).append(idx)

    raw = []
    for lab, members in clusters.items():
        if len(members) < min_cluster_size:
            continue
        centroid = norm[members].mean(axis=0)
        centroid /= (np.linalg.norm(centroid) or 1.0)
        raw.append({"members": members, "centroid": centroid})

    merged = _merge_similar(raw, threshold=0.90)

    themes = []
    for c in merged:
        members = c["members"]
        centroid = c["centroid"]
        sims = norm[members] @ centroid
        order = np.argsort(-sims)
        rep_idx = [members[i] for i in order[:8]]
        keywords = _keywords([texts[i] for i in members], texts)
        themes.append({
            "member_indices": members,
            "size": len(members),
            "representative_indices": rep_idx,
            "representative_texts": [texts[i] for i in rep_idx[:6]],
            "keywords": keywords,
            "cohesion": round(float(sims.mean()), 3),
            "centroid": centroid.tolist(),
        })
    themes.sort(key=lambda t: -t["size"])
    return themes


def _cluster(norm: np.ndarray, min_cluster_size: int):
    try:
        import hdbscan
        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=min_cluster_size,
            min_samples=1,
            metric="euclidean",
            cluster_selection_method="eom",
        )
        return clusterer.fit_predict(norm.astype(np.float64))
    except Exception:
        from sklearn.cluster import AgglomerativeClustering
        k = max(2, min(12, len(norm) // max(min_cluster_size, 1)))
        model = AgglomerativeClustering(n_clusters=k, metric="cosine", linkage="average")
        return model.fit_predict(norm)


def _merge_similar(clusters: list, threshold: float) -> list:
    if not clusters:
        return []
    clusters = sorted(clusters, key=lambda c: -len(c["members"]))
    used = [False] * len(clusters)
    out = []
    for i in range(len(clusters)):
        if used[i]:
            continue
        members = list(clusters[i]["members"])
        ci = clusters[i]["centroid"]
        for j in range(i + 1, len(clusters)):
            if used[j]:
                continue
            sim = float(np.dot(ci, clusters[j]["centroid"]))
            if sim >= threshold:
                members.extend(clusters[j]["members"])
                used[j] = True
        used[i] = True
        members = sorted(set(members))
        out.append({"members": members, "centroid": ci})
    return out


def _tokenize(t: str):
    return [w for w in re.findall(r"[a-zA-Z][a-zA-Z']+", t.lower()) if w not in _STOP and len(w) > 2]


def _keywords(cluster_texts: list, all_texts: list, k: int = 8):
    """Distinctive terms: frequent inside cluster relative to the corpus (simple c-TF-IDF)."""
    cluster_counts = Counter()
    for t in cluster_texts:
        cluster_counts.update(set(_tokenize(t)))
    corpus_counts = Counter()
    for t in all_texts:
        corpus_counts.update(set(_tokenize(t)))
    N = max(len(all_texts), 1)
    C = max(len(cluster_texts), 1)
    scored = []
    for w, cc in cluster_counts.items():
        in_ratio = cc / C
        corpus_ratio = corpus_counts.get(w, 1) / N
        if in_ratio < 0.08:
            continue
        distinct = in_ratio / (corpus_ratio + 0.02)
        scored.append((w, in_ratio * distinct))
    scored.sort(key=lambda x: -x[1])
    return [w for w, _ in scored[:k]]
