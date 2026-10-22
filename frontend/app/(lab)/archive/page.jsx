"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useData } from "@/components/Providers";
import { ClusterTag, Empty, Gate, PageHead } from "@/components/ui";
import { clusterColor } from "@/lib/colors";

function Body() {
  const { sites, clusters } = useData();
  const [q, setQ] = useState("");
  const [cluster, setCluster] = useState(null);
  const [sort, setSort] = useState("name");
  const hasMeta = sites.some((s) => s.location || s.period);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return sites
      .filter((s) => (cluster == null || s.cluster === cluster) &&
        (!t || [s.name, s.id, s.location, s.period, ...s.keywords].filter(Boolean).join(" ").toLowerCase().includes(t)))
      .sort((a, b) => sort === "cluster" ? a.cluster - b.cluster || a.name.localeCompare(b.name)
        : sort === "length" ? b.n_chunks - a.n_chunks
        : sort === "id" ? a.id.localeCompare(b.id, undefined, { numeric: true })
        : a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [sites, q, cluster, sort]);

  return (
    <>
      <div className="toolbar">
        <label className="sr" style={{ display: "contents" }}>
          <span style={{ position: "absolute", left: -9999 }}>Search reports</span>
          <input className="input grow" type="search" placeholder="Search by title, ID, keyword or place" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label style={{ display: "contents" }}>
          <span style={{ position: "absolute", left: -9999 }}>Sort by</span>
          <select className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="name">Sort: title</option><option value="id">Sort: report ID</option>
            <option value="cluster">Sort: cluster</option><option value="length">Sort: longest report</option>
          </select>
        </label>
      </div>
      <div className="toolbar" role="group" aria-label="Filter by cluster">
        <button className="chip" aria-pressed={cluster == null} onClick={() => setCluster(null)}>All clusters</button>
        {clusters.map((c) => (
          <button key={c.id} className="chip" aria-pressed={cluster === c.id} onClick={() => setCluster(cluster === c.id ? null : c.id)}>
            <span className="dot" style={{ background: clusterColor(c.id) }} />{c.label} <span className="mono">{c.size}</span>
          </button>
        ))}
      </div>
      <p className="label" style={{ margin: "6px 0 10px" }}>{list.length} of {sites.length} reports</p>
      {!hasMeta && <p className="notice" style={{ marginBottom: 18 }}><b>No dates or locations yet.</b> Add a <span className="mono">metadata.json</span> next to your PDFs and rebuild the index to show them here.</p>}
      {list.length === 0 ? (
        <Empty title="No reports match">Clear the search or pick a different cluster.</Empty>
      ) : (
        <div className="rows">
          {list.map((s) => (
            <Link key={s.id} href={`/archive/${encodeURIComponent(s.id)}`} className="row">
              <span className="mono muted">{s.id}</span>
              <span><span className="title">{s.name}</span>{(s.location || s.period) && <><br /><span className="muted" style={{ fontSize: 13 }}>{[s.location, s.period].filter(Boolean).join(", ")}</span></>}</span>
              <span className="kw">{s.keywords.slice(0, 5).join(", ")}</span>
              <span className="tagcol"><ClusterTag id={s.cluster} /></span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export default function Archive() {
  return (
    <>
      <PageHead title="Archive">Every indexed excavation report, with the cluster it was assigned and the terms that set it apart.</PageHead>
      <Gate><Body /></Gate>
    </>
  );
}
