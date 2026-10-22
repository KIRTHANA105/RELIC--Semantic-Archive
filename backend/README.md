# Artifact Similarity – Backend

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 1) build the index once (takes a few minutes; downloads the MiniLM model)
python build_index.py --pdf-dir ./dataset1 --out ./data

# 2) serve the API
uvicorn app.main:app --reload --port 8000
# docs: http://localhost:8000/docs
```
Env vars: `DATA_DIR` (default `data`), `CORS_ORIGINS` (default `http://localhost:3000`).
