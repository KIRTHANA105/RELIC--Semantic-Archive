"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useData } from "@/components/Providers";
import { Caveat, ClusterTag, Gate, PageHead, ScoreBar, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";

function Body({ id }) {
  const { byId, clusters } = useData();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { setD(null); setErr(null); api.site(id).then(setD).catch((e) => setErr(e.message)); }, [id]);
  if (err) return <div className="errbox"><h3>Report not found</h3><p>{err}</p><Link className="btn sm" style={{ marginTop: 12 }} href="/archive">Back to the archive</Link></div>;
  if (!d) return <div style={{ display: "grid", gap: 12 }}><Skeleton h={30} w="50%" /><Skeleton h={160} /><Skeleton h={120} /></div>;
  const s = d.site;
  return (
    <div className="cols-side">
      <div>
        <h2 style={{ fontSize: 28, marginBottom: 14 }}>Opening passages</h2>
        {d.excerpts.map((t, i) => <p key={i} className="excerpt">{t}…</p>)}
        <div className="section"><Caveat /></div>
      </div>
      <aside className="panel">
        <span className="label">Report details</span>
        <div className="metarow"><span className="muted">Report ID</span><span className="mono">{s.id}</span></div>
        <div className="metarow"><span className="muted">Cluster</span><ClusterTag id={s.cluster} /></div>
        <div className="metarow"><span className="muted">Location</span><span>{s.location || <span className="muted">not in metadata</span>}</span></div>
        <div className="metarow"><span className="muted">Period</span><span>{s.period || <span className="muted">not in metadata</span>}</span></div>
        <div className="metarow"><span className="muted">Passages</span><span className="mono">{s.n_chunks}</span></div>
        <span className="label" style={{ margin: "20px 0 8px" }}>Distinctive terms</span>
        <div className="kwlist">{s.keywords.map((k) => <span key={k} className="kw-pill">{k}</span>)}</div>
        <span className="label" style={{ margin: "22px 0 10px" }}>Most similar reports</span>
        <div style={{ display: "grid", gap: 14 }}>
          {d.similar.map((x) => (
            <div key={x.id}>
              <Link href={`/archive/${encodeURIComponent(x.id)}`} style={{ fontFamily: "var(--display)", fontSize: 19, textDecorationThickness: 1 }}>{x.name}</Link>
              <ScoreBar score={x.score} />
              <Link className="muted" style={{ fontSize: 12.5 }} href={`/compare?a=${s.id}&b=${x.id}`}>Compare side by side</Link>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

export default function Detail() {
  const { id } = useParams();
  const { byId } = useData();
  const name = byId?.[id]?.name || `Report ${id}`;
  return (
    <>
      <PageHead title={name} aside={<Link className="btn ghost sm" href="/archive">All reports</Link>}>Report <span className="mono">{id}</span></PageHead>
      <Gate><Body id={id} /></Gate>
    </>
  );
}
