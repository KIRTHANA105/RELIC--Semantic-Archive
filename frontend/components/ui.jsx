"use client";
import { useData } from "./Providers";
import { clusterColor } from "@/lib/colors";

export function Skeleton({ h = 16, w = "100%", style }) {
  return <div className="skel" style={{ height: h, width: w, ...style }} aria-hidden="true" />;
}

export function Empty({ title, children }) {
  return <div className="empty"><h3>{title}</h3><p>{children}</p></div>;
}

export function PageHead({ title, children, aside }) {
  return (
    <header className="sheet-head">
      <div><h1>{title}</h1>{children && <p>{children}</p>}</div>
      {aside}
    </header>
  );
}

export function ClusterTag({ id }) {
  const { clusters } = useData();
  const c = clusters?.[id];
  return (
    <span className="tag">
      <span className="dot" style={{ background: clusterColor(id) }} />
      <span>{c ? c.label : `Cluster ${id}`}</span>
    </span>
  );
}

export function ScoreBar({ score }) {
  return (
    <div className="score" title={`Cosine similarity ${score.toFixed(4)}`}>
      <div className="bar"><i style={{ width: `${Math.max(0, Math.min(1, score)) * 100}%` }} /></div>
      <span className="v">{score.toFixed(3)}</span>
    </div>
  );
}

/** Wrap a page: shows skeletons while loading and a fix-it message if the API is down. */
export function Gate({ children }) {
  const d = useData();
  if (d.status === "loading")
    return (
      <div aria-busy="true" style={{ display: "grid", gap: 14 }}>
        <Skeleton h={90} /><Skeleton h={22} w="70%" /><Skeleton h={22} w="55%" /><Skeleton h={260} />
      </div>
    );
  if (d.status === "error")
    return (
      <div className="errbox" role="alert">
        <h3>The archive isn&apos;t reachable</h3>
        <p>{d.error}</p>
        <p className="muted" style={{ marginTop: 8 }}>
          Check that the backend is running and that <span className="mono">NEXT_PUBLIC_API_URL</span> points to it, then retry.
        </p>
        <button className="btn sm" style={{ marginTop: 14 }} onClick={d.reload}>Retry connection</button>
      </div>
    );
  return children;
}

export function Caveat() {
  return (
    <p className="notice">
      <b>Textual similarity, not proof.</b> Scores compare how reports are written. A high score marks a pair worth investigating; it does not establish a historical or archaeological connection.
    </p>
  );
}
