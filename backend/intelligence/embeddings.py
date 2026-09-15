"""Provider-agnostic embedding layer. Local ONNX transformer (fastembed) by default;
an API provider can be added later by implementing EmbeddingProvider without touching
the intelligence engine."""
import hashlib
from abc import ABC, abstractmethod
import numpy as np


class EmbeddingProvider(ABC):
    name: str = "base"
    dim: int = 0

    @abstractmethod
    def embed(self, texts: list) -> np.ndarray:
        ...


class LocalFastEmbedProvider(EmbeddingProvider):
    """BGE-small (384d) transformer embeddings via ONNX runtime — no torch, CPU-fast."""
    name = "fastembed:BAAI/bge-small-en-v1.5"
    dim = 384

    def __init__(self):
        self._model = None

    def _ensure(self):
        if self._model is None:
            from fastembed import TextEmbedding
            self._model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")

    def embed(self, texts: list) -> np.ndarray:
        self._ensure()
        vecs = list(self._model.embed(texts, batch_size=64))
        return np.array(vecs, dtype=np.float32)


_provider = None


def get_provider() -> EmbeddingProvider:
    global _provider
    if _provider is None:
        _provider = LocalFastEmbedProvider()
    return _provider


def text_hash(text: str, model: str) -> str:
    return hashlib.sha1(f"{model}::{text}".encode("utf-8")).hexdigest()


def l2_normalize(mat: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(mat, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return mat / norms
