import React from "react";
import { motion } from "framer-motion";
import { Swords, Sparkles } from "lucide-react";
import { Card, Caption, SectionHeader, EmptyState, cx } from "@/components/vo/ui";
import { useEvidence } from "@/components/vo/EvidenceDrawer";

const RATING = {
  Strong: "bg-emerald-500/12 text-emerald-300 border-emerald-500/30",
  Medium: "bg-amber-500/10 text-amber-300 border-amber-500/25",
  Weak: "bg-rose-500/12 text-rose-300 border-rose-500/30",
  "n/a": "bg-white/[0.03] text-slate-600 border-white/10",
};

export default function Competitive({ report, datasetId }) {
  const c = report.competitive || {};
  const brands = c.brands || [];
  const dims = c.dimensions || [];
  const { open } = useEvidence();

  if (brands.length < 2) {
    return (
      <div>
        <SectionHeader eyebrow="Competitive Intelligence" title="VOCIS is explaining the competitive landscape" />
        <EmptyState icon={Swords} title="Competitive intelligence unavailable">
          VOCIS requires feedback from multiple comparable brands or competitors (a brand/company/competitor
          field with at least two distinct values) to establish a meaningful comparison. This dataset covers a
          single entity, so no competitive comparison is shown — nothing is fabricated.
        </EmptyState>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader eyebrow="Competitive Intelligence" title="VOCIS is explaining the competitive landscape"
        subtitle="Dimensions are discovered dynamically from customer feedback — not preset. Ratings are relative across the compared brands." />

      <div className="mb-6 grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(brands.length, 3)}, minmax(0,1fr))` }}>
        {brands.map((b, i) => {
          const o = c.overall?.[b] || {};
          return (
            <motion.div key={b} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="p-5">
                <div className="flex items-center gap-2"><Swords size={15} className="text-indigo-300" /><h3 className="text-sm font-semibold text-slate-100 font-display truncate">{b}</h3></div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className={cx("font-mono text-2xl font-bold", o.avg_sentiment >= 0 ? "text-emerald-300" : "text-rose-300")}>{(o.avg_sentiment ?? 0).toFixed(2)}</span>
                  <span className="text-xs text-slate-500">avg sentiment · {o.count} records</span>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {c.narrative && (
        <Card hover={false} className="mb-6 p-6">
          <div className="mb-3 flex items-center gap-2"><Sparkles size={14} className="text-indigo-300" /><Caption className="text-indigo-300/70">VOCIS interpretation</Caption></div>
          <p className="text-[15px] leading-[1.75] text-slate-300 whitespace-pre-line">{c.narrative}</p>
        </Card>
      )}

      <Card hover={false} className="overflow-hidden p-0">
        <div className="border-b border-white/10 p-5">
          <h3 className="text-sm font-semibold text-slate-100 font-display">Dynamic dimension comparison</h3>
          <p className="mt-1 text-xs text-slate-400">Each dimension is a theme discovered in the feedback. Click a rating to inspect the evidence.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="p-4 text-left"><Caption className="text-slate-500">Dimension</Caption></th>
                {brands.map((b) => <th key={b} className="p-4 text-center"><Caption className="text-slate-400">{b}</Caption></th>)}
              </tr>
            </thead>
            <tbody>
              {dims.map((d, i) => (
                <tr key={i} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.015] transition-colors">
                  <td className="p-4 font-medium text-slate-200">{d.name || d.keywords?.slice(0, 3).join(" ")}</td>
                  {brands.map((b) => {
                    const r = d.ratings?.[b];
                    const rating = r?.rating || "n/a";
                    return (
                      <td key={b} className="p-4 text-center">
                        <button disabled={!r || rating === "n/a"} onClick={() => open({ datasetId, title: `${d.name} — ${b}`, filters: { theme: d.name, brand: b } })}
                          className={cx("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase tracking-wide transition-transform", RATING[rating], rating !== "n/a" && "hover:scale-105")}>
                          {rating}{r?.mentions ? <span className="ml-1 opacity-60">· {r.mentions}</span> : ""}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
