"""Run ONCE (offline) to turn the PDFs into the files the API serves.

    python build_index.py --pdf-dir ./dataset1 --out ./data

Optional: put a titles.json next to the PDFs, e.g. {"39.pdf": "Adam (1988-92)"},
to give sites human-readable names in the UI.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.manifold import TSNE
from sklearn.metrics import silhouette_score

from app import nlp


def pick_k(emb: np.ndarray, k_min=2, k_max=8) -> tuple[int, dict[int, float]]:
    """Choose cluster count by silhouette score on the REAL embeddings (not t-SNE)."""
    scores: dict[int, float] = {}
    for k in range(k_min, min(k_max, len(emb) - 1) + 1):
        labels = KMeans(n_clusters=k, n_init=10, random_state=42).fit_predict(emb)
        scores[k] = float(silhouette_score(emb, labels, metric="cosine"))
    best = max(scores, key=scores.get)
    return best, scores


def top_keywords(docs: list[str], n: int = 8) -> list[list[str]]:
    tfidf = TfidfVectorizer(stop_words="english", max_df=0.8, min_df=1,
                            token_pattern=r"[A-Za-z]{4,}", sublinear_tf=True)
    m = tfidf.fit_transform(docs)
    vocab = np.array(tfidf.get_feature_names_out())
    return [list(vocab[np.argsort(m[i].toarray()[0])[::-1][:n]]) for i in range(m.shape[0])]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf-dir", required=True)
    ap.add_argument("--out", default="data")
    ap.add_argument("--k", type=int, default=0, help="force cluster count (0 = auto)")
    ap.add_argument("--no-ocr", action="store_true")
    args = ap.parse_args()

    pdf_dir, out = Path(args.pdf_dir), Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    titles = {}
    if (pdf_dir / "titles.json").exists():
        titles = json.loads((pdf_dir / "titles.json").read_text())

    ids, site_vecs, site_texts = [], [], []
    chunk_vecs_all, chunk_meta = [], []
    skipped = []

    pdfs = sorted(pdf_dir.glob("*.pdf"), key=lambda p: (len(p.stem), p.stem))
    for pdf in pdfs:
        print(f"[{pdf.name}] extracting...")
        text = nlp.clean_text(nlp.extract_text(pdf, use_ocr=not args.no_ocr))
        chunks = nlp.chunk_text(text)
        if len(chunks) < 2:
            print(f"   skipped (only {len(text)} usable chars)")
            skipped.append(pdf.name)
            continue
        vecs = nlp.embed_texts(chunks)
        sid = pdf.stem
        ids.append(sid)
        site_vecs.append(nlp.pool(vecs))
        site_texts.append(text)
        chunk_vecs_all.append(vecs)
        chunk_meta += [{"site": sid, "text": c} for c in chunks]
        print(f"   {len(chunks)} chunks")

    if len(ids) < 4:
        raise SystemExit("Need at least 4 usable reports to cluster.")

    emb = np.vstack(site_vecs)
    sim = emb @ emb.T  # already normalised -> cosine similarity

    k, k_scores = (args.k, {}) if args.k else pick_k(emb)
    km = KMeans(n_clusters=k, n_init=10, random_state=42).fit(emb)
    labels = km.labels_
    sil = float(silhouette_score(emb, labels, metric="cosine"))

    xy = TSNE(n_components=2, perplexity=min(10, len(ids) - 1),
              random_state=42, init="pca").fit_transform(emb)

    site_kw = top_keywords(site_texts)
    cluster_docs = [" ".join(t for t, l in zip(site_texts, labels) if l == c) for c in range(k)]
    cluster_kw = top_keywords(cluster_docs)

    sites = [{
        "id": sid, "name": titles.get(f"{sid}.pdf", f"Report {sid}"),
        "cluster": int(labels[i]), "x": float(xy[i, 0]), "y": float(xy[i, 1]),
        "keywords": site_kw[i],
        "n_chunks": int(chunk_vecs_all[i].shape[0]),
    } for i, sid in enumerate(ids)]
    clusters = [{
        "id": c, "size": int((labels == c).sum()),
        "keywords": cluster_kw[c],
        "label": " / ".join(cluster_kw[c][:3]).title(),   # rename these by hand!
    } for c in range(k)]

    np.save(out / "embeddings.npy", emb)
    np.save(out / "similarity.npy", sim.astype("float32"))
    np.save(out / "centroids.npy", km.cluster_centers_.astype("float32"))
    np.save(out / "chunk_embeddings.npy", np.vstack(chunk_vecs_all))
    (out / "chunks.json").write_text(json.dumps(chunk_meta))
    (out / "sites.json").write_text(json.dumps(sites, indent=1))
    (out / "clusters.json").write_text(json.dumps(clusters, indent=1))
    (out / "metrics.json").write_text(json.dumps(
        {"n_sites": len(ids), "k": k, "silhouette": sil,
         "k_scores": k_scores, "skipped": skipped}, indent=1))

    print(f"\nDone: {len(ids)} sites, k={k}, silhouette={sil:.3f}, skipped={skipped}")


if __name__ == "__main__":
    main()
