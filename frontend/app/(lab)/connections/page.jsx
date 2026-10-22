"use client";
import Link from "next/link";
import { useState } from "react";
import { NetworkGraph } from "@/components/charts";
import { useData } from "@/components/Providers";
import { Caveat, ClusterTag, Gate, PageHead, ScoreBar } from "@/components/ui";
import { clusterColor } from "@/lib/colors";

function Body() {
  const d = useData();
  const lo = d.pairs[d.pairs.length - 1].score, hi = d.pairs[0].score;
  const [th, setTh] = useState(d.quartile);
  const [sel, setSel] = useState(null);
  const edgeCount = d.pairs.filter((p) => p.score >= th).length;
  const node = sel ? d.byId[sel] : null;
  const links = node
    ? d.pairs.filter((p) => (p.a === sel || p.b === sel) && p.score >= th).map((p) => ({ id: p.a === sel ? p.b : p.a, score: p.score }))
    : [];

  return (
    <>
      <div className="toolbar" style={{ gap: 20 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 12, flex: "1 1 320px" }}>
          <span className="label" style={{ whiteSpace: "nowrap" }}>Minimum similarity</span>
          <input type="range" min={lo} max={hi} step="0.001" value={th} onChange={(e) => setTh(+e.target.value)} style={{ flex: 1, accentColor: "#B84A32" }} />
          <span className="mono" style={{ width: 52 }}>{th.toFixed(3)}</span>
        </label>
        <span className="muted">{edgeCount} connections shown</span>
        <button className="chip" onClick={() => setTh(d.quartile)}>Reset to top quartile</button>
      </div>
      <div className="cols-side">
        <div>
          <NetworkGraph sites={d.sites} matrix={d.matrix} threshold={th} selected={sel} onSelect={setSel} />
          <div className="legend" style={{ marginTop: 14 }}>
            {d.clusters.map((c) => <span key={c.id} className="tag"><span className="dot" style={{ background: clusterColor(c.id) }} />{c.label}</span>)}
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>Distance on the map reflects similarity. A thicker line means a higher score, and a larger point means more connections above the threshold. Hover a line for its score.</p>
          <div style={{ marginTop: 16 }}><Caveat /></div>
        </div>
        <aside className="panel">
          {!node ? (
            <><span className="label">Report details</span><p className="muted">Select a point to see its report and the reports connected to it.</p></>
          ) : (
            <>
              <span className="label">Selected report</span>
              <h3 style={{ fontSize: 28 }}>{node.name}</h3>
              <p className="mono muted" style={{ margin: "4px 0 8px" }}>{node.id}</p>
              <ClusterTag id={node.cluster} />
              <div className="kwlist" style={{ margin: "12px 0 6px" }}>{node.keywords.slice(0, 6).map((k) => <span key={k} className="kw-pill">{k}</span>)}</div>
              <Link className="btn sm" style={{ margin: "10px 0 18px" }} href={`/archive/${encodeURIComponent(node.id)}`}>Open report</Link>
              <span className="label">Connected above {th.toFixed(2)}</span>
              {links.length === 0 ? <p className="muted">No connections at this threshold. Lower the minimum similarity.</p> : (
                <div style={{ display: "grid", gap: 12 }}>
                  {links.sort((a, b) => b.score - a.score).slice(0, 8).map((l) => (
                    <div key={l.id}>
                      <button onClick={() => setSel(l.id)} style={{ all: "unset", cursor: "pointer", fontFamily: "var(--display)", fontSize: 19, textDecoration: "underline", textDecorationThickness: 1 }}>{d.byId[l.id].name}</button>
                      <ScoreBar score={l.score} />
                      <Link className="muted" style={{ fontSize: 12.5 }} href={`/compare?a=${node.id}&b=${l.id}`}>Compare side by side</Link>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </>
  );
}

export default function Connections() {
  return (
    <>
      <PageHead title="Connections">Reports that read alike sit close together and are joined by a line. Lower the threshold to see weaker links.</PageHead>
      <Gate><Body /></Gate>
    </>
  );
}
