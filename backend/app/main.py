"""FastAPI backend: serves the precomputed index + live semantic search/upload."""
from __future__ import annotations

import json
import os
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import nlp

DATA_DIR = Path(os.getenv("DATA_DIR", "data"))
STATE: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    d = DATA_DIR
    if not (d / "sites.json").exists():
        raise RuntimeError(f"No index in {d}. Run build_index.py first.")
    STATE["sites"] = json.loads((d / "sites.json").read_text())
    STATE["clusters"] = json.loads((d / "clusters.json").read_text())
    STATE["metrics"] = json.loads((d / "metrics.json").read_text())
    STATE["chunks"] = json.loads((d / "chunks.json").read_text())
    STATE["emb"] = np.load(d / "embeddings.npy")
    STATE["sim"] = np.load(d / "similarity.npy")
    STATE["centroids"] = np.load(d / "centroids.npy")
    STATE["chunk_emb"] = np.load(d / "chunk_embeddings.npy")
    STATE["index"] = {s["id"]: i for i, s in enumerate(STATE["sites"])}
    yield
    STATE.clear()


app = FastAPI(title="Artifact Similarity API", version="1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["*"], allow_headers=["*"],
)


# ------------------------------------------------------------------ helpers
def _site(i: int) -> dict:
    return STATE["sites"][i]


def _nearest_sites(vec: np.ndarray, k: int, exclude: int | None = None) -> list[dict]:
    scores = STATE["emb"] @ vec
    out = []
    for i in np.argsort(-scores):
        if i == exclude:
            continue
        s = _site(int(i))
        out.append({"id": s["id"], "name": s["name"], "cluster": s["cluster"],
                    "score": round(float(scores[i]), 4)})
        if len(out) == k:
            break
    return out


# ----------------------------------------------------------------- endpoints
@app.get("/health")
def health():
    return {"status": "ok", "sites": len(STATE["sites"])}


@app.get("/sites")
def sites():
    """Every site with cluster + 2D coordinates (for the scatter plot)."""
    return STATE["sites"]


@app.get("/clusters")
def clusters():
    return STATE["clusters"]


@app.get("/metrics")
def metrics():
    return STATE["metrics"]


@app.get("/matrix")
def matrix():
    """Full similarity matrix (for the heatmap)."""
    return {"ids": [s["id"] for s in STATE["sites"]],
            "names": [s["name"] for s in STATE["sites"]],
            "values": np.round(STATE["sim"], 4).tolist()}


@app.get("/similar/{site_id}")
def similar(site_id: str, k: int = Query(5, ge=1, le=20)):
    i = STATE["index"].get(site_id)
    if i is None:
        raise HTTPException(404, f"Unknown site '{site_id}'")
    return {"site": _site(i), "similar": _nearest_sites(STATE["emb"][i], k, exclude=i)}


class QueryIn(BaseModel):
    text: str = Field(min_length=3, max_length=500)
    k: int = Field(5, ge=1, le=20)


@app.post("/query")
def query(body: QueryIn):
    """Free-text semantic search: best-matching passage per report."""
    q = nlp.embed_texts([body.text])[0]
    scores = STATE["chunk_emb"] @ q
    best: dict[str, tuple[float, int]] = {}
    for ci in np.argsort(-scores)[:200]:
        sid = STATE["chunks"][int(ci)]["site"]
        if sid not in best:
            best[sid] = (float(scores[ci]), int(ci))
        if len(best) == body.k:
            break
    results = []
    for sid, (score, ci) in sorted(best.items(), key=lambda kv: -kv[1][0]):
        s = _site(STATE["index"][sid])
        results.append({"id": sid, "name": s["name"], "cluster": s["cluster"],
                        "score": round(score, 4),
                        "snippet": STATE["chunks"][ci]["text"][:400]})
    return {"query": body.text, "results": results}


@app.post("/upload")
async def upload(file: UploadFile = File(...), k: int = Query(5, ge=1, le=20)):
    """Embed a NEW report and place it among the existing ones."""
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(400, "Please upload a PDF.")
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(await file.read())
        path = Path(tmp.name)
    try:
        text = nlp.clean_text(nlp.extract_text(path))
    finally:
        path.unlink(missing_ok=True)
    chunks = nlp.chunk_text(text)
    if len(chunks) < 2:
        raise HTTPException(422, "Not enough readable text in this PDF.")
    vec = nlp.pool(nlp.embed_texts(chunks))
    cluster = int(np.argmax(STATE["centroids"] @ vec))
    return {"filename": file.filename, "n_chunks": len(chunks),
            "predicted_cluster": cluster,
            "cluster_info": STATE["clusters"][cluster],
            "similar": _nearest_sites(vec, k)}
