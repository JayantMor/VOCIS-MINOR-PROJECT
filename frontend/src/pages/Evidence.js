import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Quote, SlidersHorizontal } from "lucide-react";
import api from "@/lib/api";
import { Card, Caption, SectionHeader, SentimentBadge, cx } from "@/components/vo/ui";

const SENTIMENTS = ["positive", "negative", "neutral"];
const INTENTS = ["complaint", "praise", "request", "question", "statement"];

function Select({ label, value, onChange, options, testid }) {
  return (
    <div>
      <Caption className="mb-1.5 block text-slate-500">{label}</Caption>
      <select value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid}
        className="w-full rounded-lg border border-white/10 bg-[#0f141f] px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/50">
        <option value="">All</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export default function Evidence({ report, datasetId }) {
  const [filters, setFilters] = useState({ sentiment: "", theme: "", product: "", brand: "", intent: "" });
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(false);

  const themes = (report.issues || []).map((i) => i.name);
  const dims = report.profile?.dimensions || {};
  const products = dims.product?.top || [];
  const brands = dims.brand?.top || [];

  const fetchData = useCallback(async (reset = true) => {
    setLoading(true);
    const nextSkip = reset ? 0 : skip;
    try {
      const params = { ...filters, limit: 40, skip: nextSkip };
      Object.keys(params).forEach((k) => params[k] === "" && delete params[k]);
      if (q) params.q = q;
      const { data } = await api.get(`/datasets/${datasetId}/feedback`, { params });
      setTotal(data.total);
      setItems(reset ? data.items : [...items, ...data.items]);
      setSkip(nextSkip + data.items.length);
    } finally { setLoading(false); }
  }, [filters, q, datasetId, skip, items]);

  useEffect(() => { fetchData(true); /* eslint-disable-next-line */ }, [filters]);
  useEffect(() => { fetchData(true); /* eslint-disable-next-line */ }, []);

  const setF = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <SectionHeader eyebrow="Evidence Explorer" title="Inspect the customer voice directly"
        subtitle="Every conclusion in VOCIS traces back to these records. Filters adapt to the fields your data actually contains." />

      <Card hover={false} className="mb-6 p-5">
        <div className="mb-4 flex items-center gap-2 text-slate-300"><SlidersHorizontal size={15} className="text-indigo-300" /><span className="text-sm font-medium">Filters</span></div>
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 mb-4">
          <Search size={15} className="text-slate-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchData(true)}
            placeholder="Search feedback text… (press Enter)" data-testid="evidence-explorer-search"
            className="w-full bg-transparent py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select label="Sentiment" value={filters.sentiment} onChange={(v) => setF("sentiment", v)} options={SENTIMENTS} testid="filter-sentiment-select" />
          <Select label="Theme" value={filters.theme} onChange={(v) => setF("theme", v)} options={themes} testid="filter-theme-select" />
          <Select label="Intent" value={filters.intent} onChange={(v) => setF("intent", v)} options={INTENTS} testid="filter-intent-select" />
          {products.length > 0 && <Select label="Product" value={filters.product} onChange={(v) => setF("product", v)} options={products} testid="filter-product-select" />}
          {brands.length > 0 && <Select label="Brand" value={filters.brand} onChange={(v) => setF("brand", v)} options={brands} testid="filter-brand-select" />}
        </div>
      </Card>

      <div className="mb-4 flex items-center justify-between">
        <Caption className="text-slate-500">{total.toLocaleString()} matching records</Caption>
      </div>

      <div className="space-y-3">
        {items.map((it, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.015, 0.25) }}>
            <Card className="p-4">
              <div className="flex items-start gap-2.5">
                <Quote size={15} className="mt-0.5 shrink-0 text-slate-600" />
                <p className="text-sm text-slate-300 leading-relaxed">{it.text}</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 pl-6">
                <SentimentBadge value={it.sentiment} />
                {it.intent && <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] font-mono uppercase text-slate-400">{it.intent}</span>}
                {it.theme && <span className="rounded-md border border-indigo-500/20 bg-indigo-500/5 px-1.5 py-0.5 text-[10px] text-indigo-300">{it.theme}</span>}
                {it.severity > 0.5 && <span className="rounded-md border border-rose-500/25 bg-rose-500/5 px-1.5 py-0.5 text-[10px] font-mono uppercase text-rose-300">high severity</span>}
                {["product", "brand", "region", "segment"].map((k) => it[k] && <span key={k} className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-400">{it[k]}</span>)}
                {it.date && <span className="ml-auto text-[10px] font-mono text-slate-600">{String(it.date).slice(0, 10)}</span>}
              </div>
            </Card>
          </motion.div>
        ))}
        {!loading && items.length === 0 && <div className="py-16 text-center text-sm text-slate-500">No feedback matches these filters.</div>}
      </div>

      {items.length < total && (
        <div className="mt-6 text-center">
          <button onClick={() => fetchData(false)} disabled={loading} data-testid="evidence-load-more"
            className="rounded-lg border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm text-slate-300 hover:border-white/25 transition-colors disabled:opacity-60">
            {loading ? "Loading…" : `Load more (${total - items.length} remaining)`}
          </button>
        </div>
      )}
    </div>
  );
}
