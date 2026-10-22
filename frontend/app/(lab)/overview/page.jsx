"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ClusterBars, Histogram } from "@/components/charts";
import { useData } from "@/components/Providers";
import { Caveat, Gate, PageHead, ScoreBar } from "@/components/ui";

function Body() {
  const d = useData();
  const [recent, setRecent] = useState([]);
  useEffect(() => { try { setRecent(JSON.parse(localStorage.getItem("relic.history") || "[]")); } catch {} }, []);
  const m = d.metrics;
  const big = { fontFamily: "var(--display)", fontSize: 20 };
  return (
    <>
      <div className="stats">
        <div className="stat"><span className="label">Reports analyzed</span><div className="n">{m.n_sites}</div><small>{m.skipped.length ? `${m.skipped.length} skipped: no readable text` : "every report was readable"}</small></div>
        <div className="stat"><span className="label">Sites represented</span><div className="n">{d.sites.length}</div><small>one report per site</small></div>
        <div className="stat"><span className="label">Relationships surfaced</span><div className="n gold">{Math.floor(d.pairs.length / 4)}</div><small>top-quartile pairs, from {d.pairs.length.toLocaleString()} compared</small></div>
        <div className="stat"><span className="label">Clusters detected</span><div className="n">{m.k}</div><small>silhouette {m.silhouette.toFixed(3)}</small></div>
      </div>

      <section className="section cols2">
        <div>
          <h2>How alike are the reports?</h2>
          <p className="sub">Every pair of reports by cosine similarity. Red bars are the top quartile.</p>
          <Histogram values={d.pairs.map((p) => p.score)} threshold={d.quartile} />
        </div>
        <div>
          <h2>Cluster sizes</h2>
          <p className="sub">Reports per cluster. Open Clusters to inspect one.</p>
          <ClusterBars clusters={d.clusters} />
        </div>
      </section>

      <section className="section cols2">
        <div>
          <h2>Strongest pairs</h2>
          <p className="sub">The most similar reports in the archive.</p>
          <div className="rows">
            {d.pairs.slice(0, 6).map((p) => (
              <Link key={p.a + p.b} className="row" style={{ gridTemplateColumns: "1fr 130px" }} href={`/compare?a=${p.a}&b=${p.b}`}>
                <span><span style={big}>{d.byId[p.a].name}</span> <span className="muted">with</span> <span style={big}>{d.byId[p.b].name}</span></span>
                <ScoreBar score={p.score} />
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2>Recently analyzed</h2>
          <p className="sub">Reports you uploaded in this browser.</p>
          {recent.length === 0 ? (
            <p className="notice">Nothing analyzed yet. <Link href="/analyze"><b>Analyze a report</b></Link> and it will appear here.</p>
          ) : (
            <div className="rows">
              {recent.slice(0, 6).map((r, i) => (
                <div key={i} className="row" style={{ gridTemplateColumns: "1fr auto" }}>
                  <span><span style={big}>{r.filename}</span><br /><span className="muted" style={{ fontSize: 13 }}>closest: {r.top} ({r.score.toFixed(3)})</span></span>
                  <span className="mono muted">{new Date(r.at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <div className="section"><Caveat /></div>
    </>
  );
}

export default function Overview() {
  return (
    <>
      <PageHead title="Overview">What the archive contains and how its reports relate, as calculated from the indexed excavation reports.</PageHead>
      <Gate><Body /></Gate>
    </>
  );
}
