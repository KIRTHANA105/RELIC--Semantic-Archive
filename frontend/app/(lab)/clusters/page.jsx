"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ClusterBars, ScatterMap } from "@/components/charts";
import { useData } from "@/components/Providers";
import { Caveat, Gate, PageHead } from "@/components/ui";
import { clusterColor } from "@/lib/colors";

function Body() {
  const d = useData();
  const [active, setActive] = useState(d.clusters[0]?.id ?? null);
  const [sel, setSel] = useState(null);
  const c = d.clusters[active];

  // representative reports: highest average similarity to the rest of their own cluster
  const members = useMemo(() => {
    if (active == null) return [];
    const ms = d.sites.filter((s) => s.cluster === active);
    return ms.map((s) => {
      const others = ms.filter((o) => o.id !== s.id);
      const avg = others.length ? others.reduce((a, o) => a + d.matrix.values[d.idx[s.id]][d.idx[o.id]], 0) / others.length : 1;
      return { ...s, avg };
    }).sort((a, b) => b.avg - a.avg);
  }, [active, d]);

  return (
    <div className="cols-side" style={{ gridTemplateColumns: "minmax(0,1fr) 360px" }}>
      <div>
        <ScatterMap sites={d.sites} clusters={d.clusters} activeCluster={active} selected={sel}
          onSelect={(id) => { setSel(id); setActive(d.byId[id].cluster); }} />
        <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>Positions come from a t-SNE projection of each report&apos;s embedding. Cluster outlines are drawn around the members the clustering assigned.</p>
        <div style={{ marginTop: 14 }}><Caveat /></div>
      </div>
      <aside>
        <div className="panel" style={{ marginBottom: 20 }}>
          <span className="label">Clusters · select one</span>
          <ClusterBars clusters={d.clusters} active={active} onPick={(id) => { setActive(id); setSel(null); }} />
        </div>
        {c && (
          <div className="panel">
            <span className="label">Selected cluster</span>
            <h3 style={{ fontSize: 28, color: clusterColor(c.id) }}>{c.label}</h3>
            <p className="muted" style={{ margin: "4px 0 10px" }}>{c.size} reports</p>
            <div className="kwlist">{c.keywords.map((k) => <span key={k} className="kw-pill">{k}</span>)}</div>
            <span className="label" style={{ margin: "18px 0 8px" }}>Reports, most representative first</span>
            <div style={{ display: "grid" }}>
              {members.map((m, i) => (
                <Link key={m.id} href={`/archive/${encodeURIComponent(m.id)}`} style={{ textDecoration: "none", display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dotted var(--sand-dk)", fontFamily: "var(--display)", fontSize: 19, fontWeight: i === 0 ? 700 : 500 }}>
                  <span>{m.name}</span><span className="mono muted" style={{ fontSize: 12 }}>{m.avg.toFixed(2)}</span>
                </Link>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>The number is each report&apos;s average similarity to the others in its cluster.</p>
          </div>
        )}
      </aside>
    </div>
  );
}

export default function Clusters() {
  return (
    <>
      <PageHead title="Clusters">The groups k-means found among the reports, with the terms that characterise each one.</PageHead>
      <Gate><Body /></Gate>
    </>
  );
}
