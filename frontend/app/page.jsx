"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Contours from "@/components/Contours";
import { Wordmark } from "@/components/Mark";
import { useData } from "@/components/Providers";
import { ScoreBar, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { clusterColor } from "@/lib/colors";
import { normalise } from "@/lib/layout";

export default function Landing() {
  const d = useData();
  const ready = d.status === "ready";

  // survey points: real sites placed by their t-SNE coordinates, each tied to its nearest neighbour
  const survey = useMemo(() => {
    if (!ready) return null;
    const p = normalise(d.sites.map((s) => [s.x, s.y])).map(([x, y]) => [820 + x * 640, 150 + y * 620]);
    const links = d.sites.map((_, i) => {
      let best = -1, bs = -1;
      d.matrix.values[i].forEach((v, j) => { if (j !== i && v > bs) { bs = v; best = j; } });
      return [i, best];
    });
    return { p, links };
  }, [ready, d.sites, d.matrix]);

  const [peek, setPeek] = useState(null);
  const topId = ready && d.pairs[0]?.a;
  useEffect(() => { if (topId) api.similar(topId, 5).then(setPeek).catch(() => {}); }, [topId]);

  const v = (x) => (ready ? x : "—");
  return (
    <div className="land">
      <section className="hero">
        <Contours>
          {survey && (
            <g>
              {survey.links.map(([i, j]) => (
                <line key={i} x1={survey.p[i][0]} y1={survey.p[i][1]} x2={survey.p[j][0]} y2={survey.p[j][1]} stroke="#292720" strokeOpacity=".28" />
              ))}
              {d.sites.map((s, i) => (
                <circle key={s.id} cx={survey.p[i][0]} cy={survey.p[i][1]} r="6" fill={clusterColor(s.cluster)} stroke="#F2E6CC" strokeWidth="2" />
              ))}
            </g>
          )}
        </Contours>
        <header className="topbar">
          <Wordmark size={32} />
          <nav aria-label="Primary"><Link href="/archive">Archive</Link><Link href="/connections">Connections</Link><Link href="/analyze">Analyze</Link></nav>
        </header>
        <div className="hero-copy">
          <h1>The past leaves clues. <em>Relic finds the connections.</em></h1>
          <p>Relic reads archaeological excavation reports, measures how closely their wording matches, and groups the sites that read alike, so you know which reports to read side by side.</p>
          <div className="hero-cta">
            <Link className="btn" href="/overview">Explore the Archive</Link>
            <Link className="btn ghost" href="/analyze">Analyze a Report</Link>
          </div>
        </div>
        <p className="hero-note">{ready ? `Each point is one of the ${d.sites.length} indexed reports, tied to its closest match.` : d.status === "error" ? "Start the API to see the live archive here." : ""}</p>
      </section>

      <section className="strip" aria-label="Archive statistics">
        <div className="in">
          <div className="cell"><div className="n">{v(d.metrics?.n_sites)}</div><small>reports indexed</small></div>
          <div className="cell"><div className="n">{v(d.metrics?.k)}</div><small>clusters found</small></div>
          <div className="cell"><div className="n">{v(d.pairs?.length?.toLocaleString())}</div><small>report pairs compared</small></div>
          <div className="cell"><div className="n">{v(d.pairs?.[0]?.score.toFixed(2))}</div><small>strongest pair similarity</small></div>
        </div>
      </section>

      <section className="band">
        <h2>From a stack of PDFs to a map of what reads alike</h2>
        <div className="method">
          {[
            ["Read", "Text is pulled from each PDF, with OCR for scanned pages, and stamps and page debris are removed."],
            ["Embed", "Reports are split into passages. Each passage becomes a vector, and a report is the average of its passages."],
            ["Compare", "Cosine similarity scores every pair of reports from 0 to 1."],
            ["Group", "K-means groups reports that sit close together, and keywords describe each group."],
          ].map(([t, p], i) => (
            <div key={t}><span className="label">Step {i + 1}</span><h3>{t}</h3><p>{p}</p></div>
          ))}
        </div>
      </section>

      <section className="band" style={{ paddingTop: 0 }}>
        <div className="preview">
          <div>
            <h2>Pick a report. See what reads like it.</h2>
            <p className="muted" style={{ margin: "18px 0 24px", maxWidth: "46ch" }}>Every report has ranked neighbours. Open one, compare passages side by side, or upload your own report to see where it lands.</p>
            <Link className="btn" href="/connections">Open the Connection Explorer</Link>
          </div>
          <div className="panel dark">
            <span className="label" style={{ color: "#D6C09A" }}>Most similar to {peek ? peek.site.name : "…"}</span>
            {peek ? (
              <div style={{ display: "grid", gap: 14 }}>
                {peek.similar.map((s) => (
                  <div key={s.id} style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontFamily: "var(--display)", fontSize: 21 }}>{s.name}</span>
                    <ScoreBar score={s.score} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={26} />)}</div>
            )}
          </div>
        </div>
      </section>
      <footer className="footer"><span>RELIC compares how excavation reports are written. Similarity suggests where to look; it is not evidence of a connection.</span><span className="mono">all-MiniLM-L6-v2 · cosine similarity · k-means</span></footer>
    </div>
  );
}
