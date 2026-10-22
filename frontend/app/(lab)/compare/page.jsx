"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useData } from "@/components/Providers";
import { Caveat, ClusterTag, Gate, PageHead, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { sharedTerms } from "@/lib/layout";

function Highlight({ text, terms }) {
  const parts = text.split(/([A-Za-z]{5,})/g);
  return <>{parts.map((p, i) => (terms.has(p.toLowerCase()) ? <mark key={i}>{p}</mark> : p))}</>;
}

function Body() {
  const d = useData();
  const router = useRouter();
  const sp = useSearchParams();
  const a = sp.get("a") || d.pairs[0]?.a, b = sp.get("b") || d.pairs[0]?.b;
  const [r, setR] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!a || !b || a === b) { setR(null); return; }
    setR(null); setErr(null);
    api.compare(a, b).then(setR).catch((e) => setErr(e.message));
  }, [a, b]);

  const set = (k, v) => { const q = new URLSearchParams({ a, b, [k]: v }); router.replace(`/compare?${q}`); };
  const rank = r ? d.pairs.findIndex((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a)) + 1 : 0;
  const terms = r ? sharedTerms(r.best_passages.a, r.best_passages.b) : new Set();

  const Side = ({ s, cls, passage, opening }) => (
    <div className={`side ${cls}`}>
      <h2 style={{ fontSize: 32 }}>{s.name}</h2>
      <p className="mono muted" style={{ margin: "4px 0 12px" }}>{s.id}</p>
      <div className="metarow"><span className="muted">Cluster</span><ClusterTag id={s.cluster} /></div>
      <div className="metarow"><span className="muted">Location</span><span>{s.location || <span className="muted">not in metadata</span>}</span></div>
      <div className="metarow"><span className="muted">Period</span><span>{s.period || <span className="muted">not in metadata</span>}</span></div>
      <div className="metarow"><span className="muted">Passages</span><span className="mono">{s.n_chunks}</span></div>
      <span className="label" style={{ margin: "18px 0 8px", display: "block" }}>Distinctive terms</span>
      <div className="kwlist">{s.keywords.map((k) => <span key={k} className={`kw-pill ${r.shared_keywords.includes(k) ? "shared" : ""}`}>{k}</span>)}</div>
      <span className="label" style={{ margin: "22px 0 8px", display: "block" }}>Best-matching passage</span>
      <p className="excerpt"><Highlight text={passage} terms={terms} />…</p>
      <span className="label" style={{ margin: "22px 0 8px", display: "block" }}>Opening of the report</span>
      <p className="excerpt" style={{ fontSize: 16, color: "var(--muted)" }}>{opening}…</p>
    </div>
  );

  return (
    <>
      <div className="toolbar">
        {[["a", a], ["b", b]].map(([k, v]) => (
          <label key={k} style={{ flex: "1 1 240px", display: "grid", gap: 4 }}>
            <span className="label">Report {k.toUpperCase()}</span>
            <select className="input" value={v} onChange={(e) => set(k, e.target.value)}>
              {d.sites.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
            </select>
          </label>
        ))}
      </div>
      {a === b ? (
        <p className="notice">Pick two different reports to compare.</p>
      ) : err ? (
        <div className="errbox"><h3>Couldn&apos;t compare these reports</h3><p>{err}</p></div>
      ) : !r ? (
        <div style={{ display: "grid", gap: 12 }}><Skeleton h={40} /><Skeleton h={300} /></div>
      ) : (
        <>
          <div className="split">
            <Side s={r.a} cls="a" passage={r.best_passages.a} opening={r.opening.a} />
            <div className="mid" aria-label={`Similarity ${r.score}`}>
              <span className="label">Similarity</span>
              <span className="big">{r.score.toFixed(3)}</span>
              <span className="muted" style={{ fontSize: 12 }}>pair #{rank} of {d.pairs.length}</span>
              <span className="muted" style={{ fontSize: 12, marginTop: 10 }}>passages {r.best_passages.score.toFixed(2)}</span>
            </div>
            <Side s={r.b} cls="b" passage={r.best_passages.b} opening={r.opening.b} />
          </div>
          <p className="notice" style={{ marginTop: 18 }}>
            <b>Shared terms</b> are highlighted in gold: {r.shared_keywords.length ? r.shared_keywords.join(", ") : "none among each report's distinctive terms"}. The highlighted words in the passages appear in both. <Link href={`/archive/${a}`}><b>Open {r.a.name}</b></Link> or <Link href={`/archive/${b}`}><b>{r.b.name}</b></Link>.
          </p>
          <div style={{ marginTop: 14 }}><Caveat /></div>
        </>
      )}
    </>
  );
}

export default function Compare() {
  return (
    <>
      <PageHead title="Compare">Two reports side by side: overall similarity, the passages that match best, and the terms they share.</PageHead>
      <Gate><Suspense fallback={<Skeleton h={300} />}><Body /></Suspense></Gate>
    </>
  );
}
