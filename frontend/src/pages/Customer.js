import React from "react";
import { motion } from "framer-motion";
import { Heart, ThumbsDown, Lightbulb, Shuffle, Quote } from "lucide-react";
import { Card, Caption, SectionHeader, MetricPill, SentimentBadge, cx } from "@/components/vo/ui";
import NarrativeCard from "@/components/vo/NarrativeCard";
import { useEvidence } from "@/components/vo/EvidenceDrawer";

function pct(x) { return x == null ? "—" : `${Math.round(x * 100)}%`; }

function NeedColumn({ icon: Icon, title, tone, items, datasetId, emptyText }) {
  const { open } = useEvidence();
  const tones = { emerald: "text-emerald-300", rose: "text-rose-300", violet: "text-violet-300" };
  return (
    <Card className="p-5">
      <div className={cx("mb-4 flex items-center gap-2", tones[tone])}>
        <Icon size={16} /> <h3 className="text-sm font-semibold font-display text-slate-100">{title}</h3>
      </div>
      <div className="space-y-3">
        {(!items || items.length === 0) && <p className="text-xs text-slate-500">{emptyText}</p>}
        {items?.map((it, i) => (
          <button key={i} onClick={() => it.name && open({ datasetId, title: it.name, filters: { theme: it.name } })}
            className="block w-full rounded-lg border border-white/[0.06] bg-white/[0.015] p-3 text-left transition-colors hover:border-white/20">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-200 truncate">{it.name}</span>
              <span className="shrink-0 font-mono text-xs text-slate-500">{it.size}</span>
            </div>
            {it.summary && <p className="mt-1 text-xs text-slate-400 leading-relaxed line-clamp-2">{it.summary}</p>}
          </button>
        ))}
      </div>
    </Card>
  );
}

export default function Customer({ report, datasetId }) {
  const c = report.customer || {};
  const s = c.sentiment || {};
  const issues = report.issues || [];
  const want = c.want || {};

  return (
    <div>
      <SectionHeader eyebrow="Customer Intelligence" title="VOCIS is explaining your customer"
        subtitle="What customers value, what frustrates them, and what they're asking for — discovered from the feedback itself, then reasoned over." />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5"><MetricPill label="Total voice" value={(s.total || 0).toLocaleString()} /></Card>
        <Card className="p-5"><MetricPill label="Positive" value={pct((s.positive || 0) / (s.total || 1))} tone="emerald" /></Card>
        <Card className="p-5"><MetricPill label="Negative" value={pct((s.negative || 0) / (s.total || 1))} tone="rose" /></Card>
        <Card className="p-5"><MetricPill label="Avg sentiment" value={(s.avg_score ?? 0).toFixed(2)} tone={s.avg_score >= 0 ? "emerald" : "rose"} /></Card>
      </div>

      <div className="mb-10 grid gap-4 lg:grid-cols-3">
        <NeedColumn icon={Heart} title="What customers love" tone="emerald" items={c.love} datasetId={datasetId}
          emptyText="No consistently positive theme reached a confident threshold." />
        <NeedColumn icon={ThumbsDown} title="What customers dislike" tone="rose" items={c.dislike} datasetId={datasetId}
          emptyText="No recurring negative theme reached a confident threshold." />
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2 text-violet-300">
            <Lightbulb size={16} /> <h3 className="text-sm font-semibold font-display text-slate-100">What customers want</h3>
          </div>
          <div className="mb-3 rounded-lg border border-violet-500/15 bg-violet-500/5 px-3 py-2 text-xs text-violet-200">
            <span className="font-mono text-sm font-semibold">{want.count || 0}</span> feedback records express a request or unmet need.
          </div>
          <div className="space-y-2">
            {(want.examples || []).slice(0, 5).map((t, i) => (
              <div key={i} className="flex gap-2 rounded-lg bg-white/[0.02] p-2.5 text-xs text-slate-300 leading-relaxed">
                <Quote size={12} className="mt-0.5 shrink-0 text-slate-600" />{t}
              </div>
            ))}
            {(!want.examples || want.examples.length === 0) && <p className="text-xs text-slate-500">No explicit feature requests detected.</p>}
          </div>
        </Card>
      </div>

      <SectionHeader eyebrow="Recurring Themes" title="What customers are really talking about"
        subtitle="Semantic themes discovered by clustering the feedback — not predefined categories. Expand for VOCIS's reasoning." />
      <div className="mb-10 grid gap-4">
        {issues.slice(0, 6).map((iss, i) => <NarrativeCard key={iss.name + i} issue={iss} datasetId={datasetId} index={i} />)}
      </div>

      {c.mixed_examples?.length > 0 && (
        <Card hover={false} className="p-6">
          <div className="mb-4 flex items-center gap-2 text-slate-200">
            <Shuffle size={16} className="text-indigo-300" />
            <h3 className="text-sm font-semibold font-display">Mixed feedback — not simply positive or negative</h3>
          </div>
          <p className="mb-4 text-xs text-slate-400 max-w-2xl">These records carry both praise and criticism. VOCIS treats them as multi-faceted rather than forcing a single label.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {c.mixed_examples.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-3.5">
                <p className="text-sm text-slate-300 leading-relaxed">{m.text}</p>
                <div className="mt-2"><SentimentBadge value="mixed" /></div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
