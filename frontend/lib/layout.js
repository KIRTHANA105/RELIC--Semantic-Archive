/** Normalise points into [0,1]x[0,1] */
export function normalise(pts) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const s = Math.max(x1 - x0, y1 - y0) || 1;
  const ox = (s - (x1 - x0)) / 2, oy = (s - (y1 - y0)) / 2;
  return pts.map(([x, y]) => [(x - x0 + ox) / s, (y - y0 + oy) / s]);
}

/**
 * Place reports so that distance reflects (1 - cosine similarity), using
 * gradient descent on stress. Positions come from the full matrix, so the
 * layout stays stable while the threshold slider only toggles edges.
 */
export function stressLayout(sim, seed, iters = 350) {
  const n = sim.length;
  let min = 1;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) min = Math.min(min, sim[i][j]);
  const span = Math.max(1 - min, 1e-6);
  const target = (i, j) => ((1 - sim[i][j]) / span) * 0.95;
  const pos = normalise(seed).map(([x, y]) => [x, y]);
  for (let it = 0; it < iters; it++) {
    const lr = 0.6 * (1 - it / iters) + 0.05;
    for (let i = 0; i < n; i++) {
      let gx = 0, gy = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dx = pos[i][0] - pos[j][0], dy = pos[i][1] - pos[j][1];
        const d = Math.max(Math.hypot(dx, dy), 1e-4);
        const k = (d - target(i, j)) / d;
        gx += k * dx; gy += k * dy;
      }
      pos[i][0] -= (lr * gx) / n;
      pos[i][1] -= (lr * gy) / n;
    }
  }
  // keep points from sitting on top of each other
  for (let pass = 0; pass < 60; pass++) {
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const dx = pos[i][0] - pos[j][0], dy = pos[i][1] - pos[j][1];
        const d = Math.hypot(dx, dy) || 1e-4;
        const min = 0.05;
        if (d < min) {
          const push = (min - d) / 2 / d;
          pos[i][0] += dx * push; pos[i][1] += dy * push;
          pos[j][0] -= dx * push; pos[j][1] -= dy * push;
        }
      }
  }
  return normalise(pos);
}

/** Words two passages share (for highlighting) – simple, no stop-word list needed at >=5 letters */
const COMMON = new Set("which there their these those where other about would could after being between through during before under while because within again three first second which found shall should every among above below around against often since until whose".split(" "));
export function sharedTerms(a, b) {
  const tok = (t) => new Set((t.toLowerCase().match(/[a-z]{5,}/g) || []).filter((w) => !COMMON.has(w)));
  const A = tok(a), B = tok(b);
  return new Set([...A].filter((w) => B.has(w)));
}
