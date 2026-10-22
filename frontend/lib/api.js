export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function get(path) {
  let res;
  try {
    res = await fetch(API + path);
  } catch {
    throw new Error(`Can't reach the RELIC API at ${API}. Start it with: uvicorn app.main:app --port 8000`);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error ${res.status}`);
  }
  return res.json();
}

export const api = {
  sites: () => get("/sites"),
  clusters: () => get("/clusters"),
  matrix: () => get("/matrix"),
  metrics: () => get("/metrics"),
  site: (id) => get(`/sites/${encodeURIComponent(id)}`),
  similar: (id, k = 5) => get(`/similar/${encodeURIComponent(id)}?k=${k}`),
  compare: (a, b) => get(`/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`),
};

/** Upload a PDF with real byte-level progress. */
export function uploadReport(file, k, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API}/upload?k=${k}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onerror = () => reject(new Error(`The upload didn't reach the RELIC API at ${API}. Check that it is running.`));
    xhr.onload = () => {
      let body = {};
      try { body = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else reject(new Error(body.detail || `Upload failed (${xhr.status})`));
    };
    const fd = new FormData();
    fd.append("file", file);
    xhr.send(fd);
  });
}
