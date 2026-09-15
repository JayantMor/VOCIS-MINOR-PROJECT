import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, FileSearch, TrendingUp, TrendingDown } from "lucide-react";
import { Card, PriorityBadge, MetricPill, Bar, ConfidenceBadge, evidenceLevel, cx } from "@/components/vo/ui";
import { useEvidence } from "@/components/vo/EvidenceDrawer";

function pct(x) { return x == null ? "—" : `${Math.round(x * 100)}%`; }

export default function NarrativeCard({ issue, datasetId, index = 0 }) {
  const [open, setOpen] = useState(false);
  const { open: openEvidence } = useEvidence();
  const growth = issue.growth;

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.06, 0.4), duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-lg font-semibold text-slate-100 font-display truncate">{issue.name}</h3>
              <PriorityBadge level={issue.priority} />
              <ConfidenceBadge level={evidenceLevel(issue.size, issue.cohesion)} />
            </div>
            {issue.summary && <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{issue.summary}</p>}
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono text-2xl font-bold text-slate-100">{issue.priority_score}</div>
            <div className="vo-caption text-slate-600">priority score</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricPill label="Mentions" value={issue.size} />
          <MetricPill label="Share" value={pct(issue.share)} />
          <MetricPill label="Negative" value={pct(issue.neg_share)} tone={issue.neg_share >= 0.5 ? "rose" : "slate"} />
          {growth != null ? (
            <div>
              <div className="vo-caption mb-1 text-slate-500">Growth</div>
              <div className={cx("flex items-center gap-1 text-lg font-semibold font-mono", growth > 0 ? "text-rose-300" : "text-emerald-300")}>
                {growth > 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                {growth > 0 ? "+" : ""}{Math.round(growth * 100)}%
              </div>
            </div>
          ) : (
            <MetricPill label="Severity" value={pct(issue.avg_severity)} tone="amber" />
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button data-testid="deep-intelligence-expand-btn" onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-white/25 hover:text-white transition-colors">
            <ChevronDown size={14} className={cx("transition-transform", open && "rotate-180")} />
            {open ? "Hide analysis" : "Tell me more"}
          </button>
          <button data-testid="view-evidence-drawer-button"
            onClick={() => openEvidence({ datasetId, title: issue.name, filters: { theme: issue.name } })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:border-cyan-500/40 transition-colors">
            <FileSearch size={14} /> View evidence ({issue.size})
          </button>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
              <div className="mt-5 border-t border-white/[0.07] pt-5">
                {issue.narrative ? (
                  <p className="text-[15px] text-slate-300 leading-[1.75] whitespace-pre-line">{issue.narrative}</p>
                ) : (
                  <p className="text-sm text-slate-500 italic">Deep analysis is generated for the highest-priority themes.</p>
                )}
                {issue.priority_factors && (
                  <div className="mt-6">
                    <div className="vo-caption mb-3 text-slate-500">Why this priority — evidence breakdown</div>
                    <div className="space-y-2.5">
                      {issue.priority_factors.map((f) => (
                        <div key={f.label} className="grid grid-cols-[110px_1fr_44px] items-center gap-3">
                          <span className="text-xs text-slate-400">{f.label}</span>
                          <Bar value={f.value} tone={f.label === "Negativity" || f.label === "Severity" ? "rose" : f.label === "Growth" ? "amber" : "indigo"} />
                          <span className="text-right font-mono text-xs text-slate-400">{Math.round(f.value * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {issue.breadth?.by_dimension && Object.keys(issue.breadth.by_dimension).length > 0 && (
                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <span className="vo-caption text-slate-500">Affected:</span>
                    {Object.entries(issue.breadth.by_dimension).map(([k, v]) => (
                      <span key={k} className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[11px] text-slate-300">{v} {k}{v > 1 ? "s" : ""}</span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
