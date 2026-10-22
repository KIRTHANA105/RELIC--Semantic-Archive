"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

const DataCtx = createContext(null);
const ToastCtx = createContext(() => {});
export const useData = () => useContext(DataCtx);
export const useToast = () => useContext(ToastCtx);

export default function Providers({ children }) {
  const [state, setState] = useState({ status: "loading" });
  const [toasts, setToasts] = useState([]);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const [sites, clusters, matrix, metrics] = await Promise.all([api.sites(), api.clusters(), api.matrix(), api.metrics()]);
      setState({ status: "ready", sites, clusters, matrix, metrics });
    } catch (e) {
      setState({ status: "error", error: e.message });
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const data = useMemo(() => {
    if (state.status !== "ready") return { ...state, reload: load };
    const { sites, matrix } = state;
    const idx = Object.fromEntries(sites.map((s, i) => [s.id, i]));
    const byId = Object.fromEntries(sites.map((s) => [s.id, s]));
    const pairs = [];
    for (let i = 0; i < sites.length; i++)
      for (let j = i + 1; j < sites.length; j++) pairs.push({ a: sites[i].id, b: sites[j].id, score: matrix.values[i][j] });
    pairs.sort((p, q) => q.score - p.score);
    const quartile = pairs.length ? pairs[Math.floor(pairs.length * 0.25)].score : 0;
    return { ...state, idx, byId, pairs, quartile, reload: load };
  }, [state, load]);

  const push = useCallback((message, kind = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4800);
  }, []);

  return (
    <DataCtx.Provider value={data}>
      <ToastCtx.Provider value={push}>
        {children}
        <div className="toasts" role="status" aria-live="polite">
          {toasts.map((t) => <div key={t.id} className={`toast ${t.kind}`}>{t.message}</div>)}
        </div>
      </ToastCtx.Provider>
    </DataCtx.Provider>
  );
}
