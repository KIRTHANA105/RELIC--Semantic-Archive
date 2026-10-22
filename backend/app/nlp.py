"""Shared NLP helpers used by the offline index builder AND the API.

Keeping them in one place guarantees an uploaded PDF is processed exactly
like the reports that were indexed (same cleaning, chunking, model).
"""
from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path

import numpy as np

MODEL_NAME = "all-MiniLM-L6-v2"
CHUNK_WORDS = 250      # MiniLM reads ~256 tokens, so keep chunks below that
CHUNK_OVERLAP = 40
MIN_TEXT_CHARS = 500   # below this we assume a scanned PDF and try OCR


# ----------------------------------------------------------------- extraction
def _ocr_pdf(path: Path) -> str:
    """OCR fallback for scanned reports. Silently returns '' if OCR libs are missing."""
    try:
        import pytesseract
        from pdf2image import convert_from_path
    except ImportError:
        return ""
    pages = convert_from_path(str(path), dpi=200)
    return "\n".join(pytesseract.image_to_string(p) for p in pages)


def extract_text(path: str | Path, use_ocr: bool = True) -> str:
    import pdfplumber

    path = Path(path)
    parts: list[str] = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                parts.append(t)
    text = "\n".join(parts)
    if use_ocr and len(text.strip()) < MIN_TEXT_CHARS:
        text = _ocr_pdf(path) or text
    return text


# ------------------------------------------------------------------- cleaning
_WORD = re.compile(r"[A-Za-z]{2,}")


def clean_text(raw: str) -> str:
    """Drop OCR junk lines (stamps, bullets, page numbers) but keep real sentences."""
    kept = []
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        words = _WORD.findall(line)
        letters = sum(c.isalpha() for c in line)
        # junk: too few real words, or mostly symbols
        if len(words) < 4 or letters / max(len(line), 1) < 0.6:
            continue
        kept.append(line)
    text = " ".join(kept)
    text = re.sub(r"[^A-Za-z0-9.,;:()'\- ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def chunk_text(text: str, size: int = CHUNK_WORDS, overlap: int = CHUNK_OVERLAP) -> list[str]:
    words = text.split()
    if not words:
        return []
    step = max(size - overlap, 1)
    chunks = [" ".join(words[i : i + size]) for i in range(0, len(words), step)]
    # drop a tiny trailing fragment
    if len(chunks) > 1 and len(chunks[-1].split()) < size // 4:
        chunks.pop()
    return chunks


# ------------------------------------------------------------------ embedding
@lru_cache(maxsize=1)
def get_model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(MODEL_NAME)


def embed_texts(texts: list[str]) -> np.ndarray:
    """L2-normalised embeddings, so dot product == cosine similarity."""
    vecs = get_model().encode(texts, batch_size=32, show_progress_bar=False)
    vecs = np.asarray(vecs, dtype="float32")
    return vecs / np.linalg.norm(vecs, axis=1, keepdims=True).clip(min=1e-9)


def pool(chunk_vecs: np.ndarray) -> np.ndarray:
    """Mean of chunk embeddings -> one vector per report (re-normalised)."""
    v = chunk_vecs.mean(axis=0)
    return (v / max(np.linalg.norm(v), 1e-9)).astype("float32")
