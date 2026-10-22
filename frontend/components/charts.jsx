"use client";
import { useMemo, useRef, useState } from "react";
import { clusterColor } from "@/lib/colors";
import { normalise, stressLayout } from "@/lib/layout";

/* ---------- histogram of pairwise similarity ---------- */
export function Histogram({ values, bins = 18, threshold }) {
  const W = 560, H = 200, P = { l: 34, r: 24, t: 10, b: 26 };
  const lo = Math.min(...values), hi = Math.max(...values);
  const step = (hi - lo || 1) / bins;
  const counts = Array(bins).fill(0);
  values.forEach((v) => counts[Math.min(bins - 1, Math.floor((v - lo) / step))]++);
  const max = Math.max(...counts);
  const bw = (W - P.l - P.r) / bins;
  const x = (v) => P.l + ((v - lo) / (hi - lo || 1)) * (W - P.l - P.r);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Histogram of pairwise cosine similarity between reports">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={P.l} x2={W - P.r} y1={H - P.b - f * (H - P.t - P.b)} y2={H - P.b - f * (H - P.t - P.b)} stroke="#D6C09A" />
          <text x={P.l - 6} y={H - P.b - f * (H - P.t - P.b) + 4} textAnchor="end">{Math.round(f * max)}</text>
        </g>
      ))}
      {counts.map((c, i) => (
        <rect key={i} x={P.l + i * bw + 1} width={bw - 2} y={H - P.b - (c / max) * (H - P.t - P.b)} height={(c / max) * (H - P.t - P.b)}
          fill={lo + (i + 0.5) * step >= (threshold ?? Infinity) ? "#B84A32" : "#777447"} />
      ))}
      {threshold != null && <line x1={x(threshold)} x2={x(threshold)} y1={P.t} y2={H - P.b} stroke="#292720" strokeDasharray="3 3" />}
      {[lo, (lo + hi) / 2, hi].map((v) => <text key={v} x={x(v)} y={H - 8} textAnchor="middle">{v.toFixed(2)}</text>)}
    </svg>
  );
}

/* ---------- cluster distribution ---------- */
export function ClusterBars({ clusters, onPick, active }) {
  const max = Math.max(...clusters.map((c) => c.size));
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {clusters.map((c) => (
        <button key={c.id} onClick={onPick ? () => onPick(c.id) : undefined} aria-pressed={active === c.id}
          style={{ all: "unset", cursor: onPick ? "pointer" : "default", display: "grid", gap: 4, opacity: active == null || active === c.id ? 1 : 0.45 }}>
          <span style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
            <span>{c.label}</span><span className="mono">{c.size}</span>
          </span>
          <span style={{ height: 10, background: "#D6C09A", display: "block" }}>
            <i style={{ display: "block", height: "100%", width: `${(c.size / max) * 100}%`, background: clusterColor(c.id) }} />
          </span>
        </button>
      ))}
    </div>
  );
}

/* ---------- shared svg frame with survey grid ---------- */
function Frame({ size, h = size, children, label }) {
  const ticks = [0.1, 0.3, 0.5, 0.7, 0.9];
  return (
    <svg className="chart" viewBox={`0 0 ${size} ${h}`} role="img" aria-label={label} style={{ background: "#F8F0DC", border: "1px solid #A8905F" }}>
      {ticks.map((t) => (
        <g key={t} stroke="#D6C09A" strokeWidth="1">
          <line x1={t * size} x2={t * size} y1="0" y2={h} strokeDasharray="2 6" />
          <line y1={t * h} y2={t * h} x1="0" x2={size} strokeDasharray="2 6" />
        </g>
      ))}
      {children}
    </svg>
  );
}

/* ---------- cluster scatter (t-SNE positions from the backend) ---------- */
export function ScatterMap({ sites, clusters, activeCluster, selected, onSelect }) {
  const S = 700, H = 540, pad = 56;
  const [hover, setHover] = useState(null);
  const pts = useMemo(() => normalise(sites.map((s) => [s.x, s.y])).map(([x, y]) => [pad + x * (S - 2 * pad), pad + y * (H - 2 * pad)]), [sites]);
  const territories = clusters.map((c) => {
    const m = sites.map((s, i) => (s.cluster === c.id ? pts[i] : null)).filter(Boolean);
    if (!m.length) return null;
    const cx = m.reduce((a, p) => a + p[0], 0) / m.length, cy = m.reduce((a, p) => a + p[1], 0) / m.length;
    const r = Math.max(26, ...m.map((p) => Math.hypot(p[0] - cx, p[1] - cy))) + 22;
    return { id: c.id, cx, cy, r, label: c.label };
  }).filter(Boolean);
  const shown = hover ?? selected;
  return (
    <Frame size={S} h={H} label="Scatter map of report clusters">
      {territories.map((t) => (
        <g key={t.id} opacity={activeCluster == null || activeCluster === t.id ? 1 : 0.25}>
          <circle cx={t.cx} cy={t.cy} r={t.r} fill={clusterColor(t.id)} fillOpacity=".09" stroke={clusterColor(t.id)} strokeDasharray="4 5" />
          <text x={t.cx} y={t.cy - t.r - 7} textAnchor="middle" style={{ fill: clusterColor(t.id), fontWeight: 600, fontSize: 13 }}>{t.label}</text>
        </g>
      ))}
      {sites.map((s, i) => {
        const dim = activeCluster != null && activeCluster !== s.cluster;
        return (
          <g key={s.id} className="node" tabIndex={0} role="button" aria-label={`${s.name}, ${clusters[s.cluster]?.label}`}
            onClick={() => onSelect(s.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(s.id)}
            onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)} opacity={dim ? 0.25 : 1}>
            <circle className="ring" cx={pts[i][0]} cy={pts[i][1]} r={selected === s.id ? 11 : 7.5} fill={clusterColor(s.cluster)} stroke="#F8F0DC" strokeWidth="2" />
            {selected === s.id && <circle cx={pts[i][0]} cy={pts[i][1]} r={16} fill="none" stroke="#292720" />}
          </g>
        );
      })}
      {shown != null && (() => {
        const i = sites.findIndex((s) => s.id === shown);
        if (i < 0) return null;
        const [x, y] = pts[i];
        return <text x={x} y={y - 16} textAnchor="middle" style={{ fill: "#292720", fontWeight: 600, fontSize: 13 }}>{sites[i].name}</text>;
      })()}
    </Frame>
  );
}

/* ---------- connection network ---------- */
export function NetworkGraph({ sites, matrix, threshold, selected, onSelect }) {
  const S = 760, H = 580, pad = 50;
  const wrap = useRef(null);
  const [edgeTip, setEdgeTip] = useState(null);
  const [hover, setHover] = useState(null);

  const pos = useMemo(() => {
    const p = stressLayout(matrix.values, sites.map((s) => [s.x, s.y]));
    return p.map(([x, y]) => [pad + x * (S - 2 * pad), pad + y * (H - 2 * pad)]);
  }, [matrix, sites]);

  const edges = useMemo(() => {
    const out = [];
    for (let i = 0; i < sites.length; i++)
      for (let j = i + 1; j < sites.length; j++) if (matrix.values[i][j] >= threshold) out.push({ i, j, score: matrix.values[i][j] });
    return out;
  }, [matrix, sites, threshold]);
  const degree = useMemo(() => { const d = Array(sites.length).fill(0); edges.forEach((e) => { d[e.i]++; d[e.j]++; }); return d; }, [edges, sites]);
  const lo = threshold, hi = Math.max(...edges.map((e) => e.score), threshold + 1e-6);
  const sel = selected != null ? sites.findIndex((s) => s.id === selected) : -1;

  const onMove = (e, ed) => {
    const r = wrap.current.getBoundingClientRect();
    setEdgeTip({ x: e.clientX - r.left, y: e.clientY - r.top, text: `${sites[ed.i].name} ↔ ${sites[ed.j].name} · ${ed.score.toFixed(3)}` });
  };

  return (
    <div ref={wrap} style={{ position: "relative" }}>
      <Frame size={S} h={H} label="Network of reports connected by textual similarity">
        {edges.map((e) => {
          const hot = sel === e.i || sel === e.j;
          const t = (e.score - lo) / (hi - lo || 1);
          return (
            <g key={`${e.i}-${e.j}`}>
              <line x1={pos[e.i][0]} y1={pos[e.i][1]} x2={pos[e.j][0]} y2={pos[e.j][1]}
                stroke={hot ? "#B84A32" : "#292720"} strokeOpacity={hot ? 0.95 : 0.12 + t * 0.3} strokeWidth={hot ? 1.2 + t * 2.4 : 0.6 + t * 1.6} />
              <line x1={pos[e.i][0]} y1={pos[e.i][1]} x2={pos[e.j][0]} y2={pos[e.j][1]} stroke="transparent" strokeWidth="10"
                onMouseMove={(ev) => onMove(ev, e)} onMouseLeave={() => setEdgeTip(null)} />
            </g>
          );
        })}
        {sites.map((s, i) => (
          <g key={s.id} className="node" tabIndex={0} role="button" aria-label={`${s.name}, ${degree[i]} connections above threshold`}
            onClick={() => onSelect(s.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(s.id)}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <circle className="ring" cx={pos[i][0]} cy={pos[i][1]} r={6 + Math.min(degree[i], 10) * 0.9} fill={clusterColor(s.cluster)} stroke="#F8F0DC" strokeWidth="2" />
            {(sel === i || hover === i) && <text x={pos[i][0]} y={pos[i][1] - (sel === i ? 30 + Math.min(degree[i], 10) * 0.9 : 14 + Math.min(degree[i], 10) * 0.9)} textAnchor="middle" style={{ fill: "#292720", fontWeight: 600, fontSize: 13 }}>{s.name}</text>}
            {sel === i && <circle cx={pos[i][0]} cy={pos[i][1]} r={18 + Math.min(degree[i], 10) * 0.9} fill="none" stroke="#292720" />}
          </g>
        ))}
      </Frame>
      {edgeTip && <div className="tip" style={{ left: edgeTip.x, top: edgeTip.y }}>{edgeTip.text}</div>}
    </div>
  );
}
