"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useData, useToast } from "@/components/Providers";
import { Caveat, ClusterTag, Gate, PageHead, ScoreBar } from "@/components/ui";
import { api, uploadReport } from "@/lib/api";

const STAGES = ["Extracting text from the PDF", "Generating semantic embeddings", "Comparing with the archive"];
const fmt = (b) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

function Body() {
  const { clusters } = useData();
  const toast = useToast();
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [over, setOver] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | running | done | error
  const [upload, setUpload] = useState(0);
  const [stage, setStage] = useState(-1);
  const [result, setResult] = useState(null);
  const [excerpts, setExcerpts] = useState({});
  const [error, setError] = useState("");

  const pick = (f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) { toast("Only PDF files can be analyzed.", "error"); return; }
    setFile(f); setPhase("idle"); setResult(null); setError(""); setUpload(0); setStage(-1);
  };

  // stages advance while the server works; they all complete when the response arrives
  useEffect(() => {
    if (phase !== "running" || upload < 1) return;
    setStage((s) => Math.max(s, 0));
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 3500);
    return () => clearInterval(t);
  }, [phase, upload]);

  const run = async () => {
    setPhase("running"); setError(""); setStage(-1); setUpload(0);
    try {
      const r = await uploadReport(file, 6, setUpload);
      setResult(r); setStage(STAGES.length); setPhase("done");
      toast("Analysis complete.");
      try {
        const h = JSON.parse(localStorage.getItem("relic.history") || "[]");
        h.unshift({ filename: file.name, at: Date.now(), cluster: r.predicted_cluster, top: r.similar[0].name, score: r.similar[0].score });
        localStorage.setItem("relic.history", JSON.stringify(h.slice(0, 20)));
      } catch {}
      r.similar.slice(0, 6).forEach((s) => api.site(s.id).then((d) => setExcerpts((x) => ({ ...x, [s.id]: d.excerpts[0] }))).catch(() => {}));
    } catch (e) {
      setError(e.message); setStage(-1); setPhase("error"); toast("Analysis failed.", "error");
    }
  };

  return (
    <>
      <div className="cols-side">
        <div>
          <div className={`drop ${over ? "over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]); }}>
            <h2 style={{ fontSize: 32 }}>Drop an excavation report here</h2>
            <p className="muted" style={{ margin: "8px 0 20px" }}>PDF only. Scanned reports are read with OCR if the server has it installed.</p>
            <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => pick(e.target.files?.[0])} />
            <button className="btn ghost" onClick={() => input.current.click()}>Browse files</button>
          </div>

          {file && (
            <div style={{ marginTop: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                <span><span style={{ fontFamily: "var(--display)", fontSize: 22 }}>{file.name}</span> <span className="mono muted">{fmt(file.size)}</span></span>
                <button className="btn" disabled={phase === "running"} onClick={run}>{phase === "running" ? "Analyzing…" : phase === "done" ? "Analyze again" : "Analyze Report"}</button>
              </div>
              {phase === "running" && (
                <div className="progress" role="progressbar" aria-valuenow={Math.round(upload * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress"><i style={{ width: `${upload * 100}%` }} /></div>
              )}
            </div>
          )}

          {phase === "error" && (
            <div className="errbox" role="alert" style={{ marginTop: 22 }}>
              <h3>The report couldn&apos;t be analyzed</h3><p>{error}</p>
              <p className="muted" style={{ marginTop: 6 }}>Try another PDF, or check that the API is running and reachable.</p>
            </div>
          )}

          {result && (
            <section className="section" aria-live="polite">
              <h2>Closest reports in the archive</h2>
              <p className="sub">Textual similarity results, ranked by cosine similarity. They show which reports are worded alike, not that sites were connected.</p>
              <div className="rows">
                {result.similar.map((s) => (
                  <div key={s.id} className="row" style={{ gridTemplateColumns: "1fr 150px" }}>
                    <div>
                      <Link href={`/archive/${encodeURIComponent(s.id)}`} className="title" style={{ fontFamily: "var(--display)", fontSize: 24, fontWeight: 600 }}>{s.name}</Link>
                      <div style={{ margin: "4px 0" }}><ClusterTag id={s.cluster} /></div>
                      {excerpts[s.id] && <p className="muted" style={{ fontSize: 13.5 }}>Opens: {excerpts[s.id].slice(0, 200)}…</p>}
                    </div>
                    <ScoreBar score={s.score} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 22 }}><Caveat /></div>
            </section>
          )}
        </div>

        <aside className="panel">
          <span className="label">Processing</span>
          <ol className="steps">
            {STAGES.map((s, i) => {
              const st = stage > i ? "done" : stage === i ? "active" : "";
              return <li key={s} className={st}><span className="mark" /><span>{s}</span><span className="mono muted">{st === "done" ? "done" : st === "active" ? "working" : ""}</span></li>;
            })}
          </ol>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>The server runs these steps in one request, so the stages are shown as an estimate until it replies.</p>
          {result && (
            <div style={{ marginTop: 20 }}>
              <span className="label">Nearest cluster</span>
              <ClusterTag id={result.predicted_cluster} />
              <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>{result.n_chunks} passages read. Key terms: {result.cluster_info.keywords.slice(0, 5).join(", ")}.</p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

export default function Analyze() {
  return (
    <>
      <PageHead title="Analyze a report">Upload a new excavation report to see which archived reports it resembles most.</PageHead>
      <Gate><Body /></Gate>
    </>
  );
}
