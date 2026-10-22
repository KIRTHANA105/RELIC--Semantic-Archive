/** Topographic contours for the landing hero. Deterministic, drawn once on load. */
function ring(cx, cy, r, seed, amp = 0.14) {
  const pts = [];
  const n = 72;
  for (let k = 0; k < n; k++) {
    const t = (k / n) * Math.PI * 2;
    const w = 1 + amp * Math.sin(3 * t + seed) + amp * 0.55 * Math.sin(5 * t + seed * 1.7) + amp * 0.3 * Math.sin(8 * t + seed * 0.6);
    pts.push([cx + Math.cos(t) * r * w, cy + Math.sin(t) * r * w * 0.82]);
  }
  return "M" + pts.map((p) => p.map((v) => v.toFixed(1)).join(",")).join("L") + "Z";
}

export default function Contours({ children }) {
  const rings = [];
  for (let i = 1; i <= 15; i++) rings.push({ d: ring(1040, 400, i * 46, 1.2 + i * 0.07), k: `a${i}`, delay: i * 0.09 });
  for (let i = 1; i <= 7; i++) rings.push({ d: ring(1380, 760, i * 52, 4 + i * 0.1, 0.18), k: `b${i}`, delay: 0.5 + i * 0.12 });
  return (
    <svg className="hero-art" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {rings.map((r) => <path key={r.k} d={r.d} pathLength="1" className="contour" style={{ animationDelay: `${r.delay}s` }} />)}
      {children}
    </svg>
  );
}
