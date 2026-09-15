import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Quote, Search } from "lucide-react";
import api from "@/lib/api";
import { SentimentBadge, Caption, cx } from "@/components/vo/ui";

const EvidenceContext = createContext(null);
export const useEvidence = () => useContext(EvidenceContext);

export function EvidenceProvider({ children }) {
  const [state, setState] = useState(null); // {datasetId, title, filters}
  const open = useCallback((payload) => setState(payload), []);
  const close = useCallback(() => setState(null), []);
  return (
    <EvidenceContext.Provider value={{ open, close }}>
      {children}
      <EvidenceDrawer state={state} onClose={close} />
    </EvidenceContext.Provider>
  );
}

function EvidenceDrawer({ state, onClose }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!state) return;
    setQ("");
    fetchItems(state, "");
    // eslint-disable-next-line
  }, [state]);

  const fetchItems = async (s, query) => {
    setLoading(true);
    try {
      const params = { ...(s.filters || {}), limit: 60 };
      if (query) params.q = query;
      const { data } = await api.get(`/datasets/${s.datasetId}/feedback`, { params });
      setItems(data.items); setTotal(data.total);
    } finally { setLoading(false); }
  };

  return (
    <AnimatePresence>
      {state && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            data-testid="evidence-drawer"
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-[#0b0f18]">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 p-6">
              <div>
                <Caption className="text-cyan-300/70">Customer Evidence</Caption>
                <h3 className="mt-1 text-lg font-semibold text-slate-100 font-display">{state.title}</h3>
                <p className="mt-1 text-xs text-slate-500 font-mono">{total} feedback records · verbatim customer voice</p>
              </div>
              <button data-testid="close-evidence-drawer" onClick={onClose}
                className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white hover:border-white/25 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="border-b border-white/10 p-4">
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3">
                <Search size={15} className="text-slate-500" />
                <input value={q} onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchItems(state, q)}
                  placeholder="Search within this evidence…"
                  data-testid="evidence-search-input"
                  className="w-full bg-transparent py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading && <div className="py-10 text-center text-sm text-slate-500">Loading evidence…</div>}
              {!loading && items.length === 0 && <div className="py-10 text-center text-sm text-slate-500">No matching feedback.</div>}
              {items.map((it, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4">
                  <div className="flex items-start gap-2.5">
                    <Quote size={15} className="mt-0.5 shrink-0 text-slate-600" />
                    <p className="text-sm text-slate-300 leading-relaxed">{it.text}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 pl-6">
                    <SentimentBadge value={it.sentiment} />
                    {it.intent && <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] font-mono uppercase text-slate-400">{it.intent}</span>}
                    {it.severity > 0.5 && <span className="rounded-md border border-rose-500/25 bg-rose-500/5 px-1.5 py-0.5 text-[10px] font-mono uppercase text-rose-300">high severity</span>}
                    {["product", "brand", "region", "segment"].map((k) => it[k] && (
                      <span key={k} className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-400">{it[k]}</span>
                    ))}
                    {it.date && <span className="ml-auto text-[10px] font-mono text-slate-600">{String(it.date).slice(0, 10)}</span>}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export { cx };
