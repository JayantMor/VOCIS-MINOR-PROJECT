import React from "react";
import { motion } from "framer-motion";
import { Boxes } from "lucide-react";
import { Card, Caption, SectionHeader, Bar, EmptyState, cx } from "@/components/vo/ui";
import { useEvidence } from "@/components/vo/EvidenceDrawer";

function pct(x) { return x == null ? "—" : `${Math.round(x * 100)}%`; }

export default function Product({ report, datasetId }) {
  const products = report?.product?.products || [];
  const { open } = useEvidence();

  return (
    <div>
      <SectionHeader eyebrow="Product Intelligence" title="VOCIS is explaining the product experience"
        subtitle="How customer experience differs across products — strengths, friction, and recurring issues per product." />
      {products.length === 0 ? (
        <EmptyState icon={Boxes} title="Product intelligence unavailable">
          VOCIS needs a product-level field (e.g. product, model, plan or SKU) with at least two distinct
          values to compare product experiences. This dataset does not contain one, so no product breakdown is shown.
        </EmptyState>
      ) : (
      <div className="grid gap-4 lg:grid-cols-2">
        {products.map((p, i) => (
          <motion.div key={p.product || i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="p-6 h-full">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-indigo-300"><Boxes size={16} /></div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-100 font-display">{p.product}</h3>
                    <Caption className="text-slate-500">{p.count} records</Caption>
                  </div>
                </div>
                <div className="text-right">
                  <div className={cx("font-mono text-xl font-bold", (p.avg_sentiment ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300")}>{(p.avg_sentiment ?? 0).toFixed(2)}</div>
                  <Caption className="text-slate-600">avg sentiment</Caption>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div>
                  <div className="mb-1 flex justify-between text-xs"><span className="text-emerald-300">Positive</span><span className="font-mono text-slate-400">{pct(p.pos_share)}</span></div>
                  <Bar value={p.pos_share || 0} tone="emerald" />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs"><span className="text-rose-300">Negative</span><span className="font-mono text-slate-400">{pct(p.neg_share)}</span></div>
                  <Bar value={p.neg_share || 0} tone="rose" />
                </div>
              </div>

              {p.top_issues?.length > 0 && (
                <div className="mt-5 border-t border-white/[0.07] pt-4">
                  <Caption className="mb-2 text-slate-500">Recurring issues for this product</Caption>
                  <div className="flex flex-wrap gap-2">
                    {p.top_issues.map((it, j) => (
                      <button key={j} onClick={() => it.name && open({ datasetId, title: `${it.name} — ${p.product}`, filters: { theme: it.name, product: p.product } })}
                        className={cx("rounded-lg border px-2.5 py-1 text-xs transition-colors hover:border-white/30",
                          it.neg_share >= 0.5 ? "border-rose-500/20 bg-rose-500/5 text-rose-200" : "border-white/10 bg-white/[0.02] text-slate-300")}>
                        {it.name || (it.keywords ? it.keywords.slice(0, 3).join(" ") : "Theme")} <span className="font-mono text-slate-500">· {it.mentions}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
      )}
    </div>
  );
}
