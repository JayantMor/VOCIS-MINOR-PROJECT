import React from "react";
import { motion } from "framer-motion";
import { Globe2, ExternalLink, Sparkles, Users, Compass, Info } from "lucide-react";
import { Card, Caption, SectionHeader, EmptyState } from "@/components/vo/ui";

export default function Market({ report }) {
  const m = report.market || {};
  const sources = m.sources || [];

  if (sources.length === 0) {
    return (
      <div>
        <SectionHeader eyebrow="Market Intelligence" title="VOCIS is explaining what's happening around the business" />
        <EmptyState icon={Globe2} title="External market context unavailable">
          {m.unavailable_reason === "research_provider_unavailable"
            ? "The research provider could not be reached. External facts are never fabricated — reconnect a provider to retrieve attributable market context."
            : "No relevant external sources were retrieved for this dataset. VOCIS will not invent market information; external facts must be attributable to a real source."}
        </EmptyState>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader eyebrow="Market Intelligence" title="VOCIS is explaining what's happening around the business"
        subtitle="External information is kept strictly separate from your customer evidence. Every external claim is attributable to a source below." />

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-200">
        <Info size={13} /> Retrieved for query: <span className="font-mono">{m.query}</span>
      </div>

      {m.market_summary && (
        <Card hover={false} className="mb-6 p-6">
          <div className="mb-3 flex items-center gap-2"><Globe2 size={14} className="text-cyan-300" /><Caption className="text-cyan-300/70">External market summary</Caption></div>
          <p className="text-[15px] leading-[1.75] text-slate-300">{m.market_summary}</p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Caption className="text-slate-500">External signals — attributable</Caption>
          {(m.external_signals || []).map((sig, i) => {
            const src = sources[sig.source_index];
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="p-4">
                  <p className="text-sm text-slate-300 leading-relaxed">{sig.signal}</p>
                  {src && <a href={src.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs text-cyan-300 hover:text-cyan-200">
                    <ExternalLink size={12} /> {new URL(src.url).hostname}</a>}
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="space-y-4">
          {m.connection_to_customers && (
            <Card hover={false} className="p-5">
              <div className="mb-2 flex items-center gap-2"><Users size={14} className="text-indigo-300" /><Caption className="text-indigo-300/70">Connection to your customers — interpretation</Caption></div>
              <p className="text-sm text-slate-300 leading-relaxed">{m.connection_to_customers}</p>
            </Card>
          )}
          {m.whitespace?.length > 0 && (
            <Card hover={false} className="p-5">
              <div className="mb-3 flex items-center gap-2"><Compass size={14} className="text-emerald-300" /><Caption className="text-emerald-300/70">Potential whitespace</Caption></div>
              <div className="space-y-3">
                {m.whitespace.map((w, i) => (
                  <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-3">
                    <div className="text-sm font-medium text-slate-200">{w.opportunity}</div>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">{w.rationale}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="mt-8">
        <Caption className="mb-3 text-slate-500">Sources ({sources.length})</Caption>
        <div className="grid gap-3 md:grid-cols-2">
          {sources.map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noreferrer" className="group rounded-xl border border-white/[0.07] bg-white/[0.015] p-4 transition-colors hover:border-cyan-500/30">
              <div className="flex items-start gap-2">
                <span className="font-mono text-xs text-slate-600">[{i}]</span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-200 group-hover:text-white truncate">{s.title}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-cyan-300/80"><ExternalLink size={11} />{new URL(s.url).hostname}{s.published_date ? ` · ${String(s.published_date).slice(0, 10)}` : ""}</div>
                  {s.snippet && <p className="mt-1.5 text-xs text-slate-500 leading-relaxed line-clamp-2">{s.snippet}</p>}
                </div>
              </div>
            </a>
          ))}
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-600"><Sparkles size={12} /> External market information — do not treat as customer feedback.</p>
      </div>
    </div>
  );
}
