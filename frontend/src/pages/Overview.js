import React from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { AlertTriangle, Sparkles, TrendingUp, Target, Zap, Trophy, MessageSquarePlus, Swords, Database } from "lucide-react";
import { Card, Caption, SectionHeader, cx } from "@/components/vo/ui";
import NarrativeCard from "@/components/vo/NarrativeCard";

function pct(x, t = 1) { return x == null ? "—" : `${Math.round(x * t)}%`; }

function DataInterpretation({ report }) {
  const p = report.profile;
  const caps = report.capabilities;
  const dims = Object.keys(p.dimensions || {});
  const enabled = Object.entries(caps).filter(([, v]) => v).map(([k]) => k);
  return (
    <Card hover={false} className="vo-grain mb-6 p-5">
      <div className="flex items-start gap-3">
        <Database size={18} className="mt-0.5 shrink-0 text-indigo-300" />
        <p className="text-sm text-slate-300 leading-relaxed">
          <span className="font-semibold text-white">{p.records_usable.toLocaleString()} usable feedback records</span>{" "}
          identified from {p.records_raw.toLocaleString()} rows{p.duplicates_removed_est > 0 && <> ({p.duplicates_removed_est.toLocaleString()} near-duplicates removed)</>}.{" "}
          {dims.length > 0 ? <>Detected dimensions: <span className="text-slate-200">{dims.join(", ")}</span>. </> : "Only free-text feedback was detected. "}
          {caps.temporal ? "Dates are available, enabling temporal & emerging-issue intelligence. " : "No reliable dates found — temporal analysis is unavailable and will not be fabricated. "}
          {caps.competitive ? "Multiple brands enable competitive comparison." : ""}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {enabled.map((c) => (
          <span key={c} className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 text-[11px] font-mono uppercase text-emerald-300">{c}</span>
        ))}
      </div>
    </Card>
  );
}

function Signal({ icon: Icon, label, tone, children, delay }) {
  if (!children) return null;
  const tones = {
    rose: "text-rose-300 border-rose-500/20", emerald: "text-emerald-300 border-emerald-500/20",
    amber: "text-amber-300 border-amber-500/20", indigo: "text-indigo-300 border-indigo-500/20",
    cyan: "text-cyan-300 border-cyan-500/20", violet: "text-violet-300 border-violet-500/20",
  };
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="h-full p-5">
        <div className={cx("mb-3 inline-flex items-center gap-2 rounded-lg border bg-white/[0.02] px-2.5 py-1", tones[tone])}>
          <Icon size={14} /> <Caption className="text-current opacity-90">{label}</Caption>
        </div>
        <p className="text-[14px] leading-relaxed text-slate-300">{children}</p>
      </Card>
    </motion.div>
  );
}

export default function Overview({ report, datasetId, setSection }) {
  const e = report.executive || {};
  const s = report.customer?.sentiment || {};
  const top = report.issues || [];
  const temporal = report.temporal;

  const sentTotal = s.total || 1;
  const segs = [
    { k: "positive", v: s.positive, c: "bg-emerald-500" },
    { k: "neutral", v: s.neutral, c: "bg-slate-500" },
    { k: "negative", v: s.negative, c: "bg-rose-500" },
  ];

  return (
    <div>
      <DataInterpretation report={report} />

      {/* Executive hero */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card hover={false} className="vo-grain mb-6 overflow-hidden p-8">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-indigo-300" />
            <Caption className="text-indigo-300/80">Executive Intelligence</Caption>
          </div>
          <h1 className="mt-4 text-2xl sm:text-3xl font-bold leading-snug tracking-tight text-white font-display max-w-4xl">
            {e.headline || "Intelligence synthesized from your customer feedback."}
          </h1>
          {e.executive_summary && <p className="mt-4 max-w-3xl text-[15px] leading-[1.75] text-slate-300">{e.executive_summary}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-6">
            <div className="flex-1 min-w-[240px]">
              <div className="mb-2 flex justify-between"><Caption className="text-slate-500">Sentiment distribution</Caption>
                <span className="font-mono text-xs text-slate-400">{s.total?.toLocaleString()} records</span></div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/5">
                {segs.map((seg) => <div key={seg.k} className={seg.c} style={{ width: `${((seg.v || 0) / sentTotal) * 100}%` }} />)}
              </div>
              <div className="mt-2 flex gap-4 text-xs">
                {segs.map((seg) => <span key={seg.k} className="flex items-center gap-1.5 text-slate-400"><span className={cx("h-2 w-2 rounded-full", seg.c)} />{seg.k} {pct((seg.v || 0) / sentTotal, 100)}</span>)}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Signal grid */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Signal icon={Target} label="Most Important Finding" tone="indigo" delay={0.05}>{e.most_important_finding}</Signal>
        <Signal icon={TrendingUp} label="What Changed" tone="amber" delay={0.1}>{e.what_changed}</Signal>
        <Signal icon={Zap} label="Recommended Attention" tone="cyan" delay={0.15}>{e.recommended_attention}</Signal>
        <Signal icon={AlertTriangle} label="Biggest Customer Pain" tone="rose" delay={0.2}>{e.biggest_pain}</Signal>
        <Signal icon={Trophy} label="Strongest Signal" tone="emerald" delay={0.25}>{e.strongest_signal}</Signal>
        <Signal icon={MessageSquarePlus} label="Customer Demand" tone="violet" delay={0.3}>{e.customer_demand}</Signal>
        <Signal icon={Swords} label="Competitive Signal" tone="indigo" delay={0.35}>{e.competitive_signal}</Signal>
      </div>

      {temporal && temporal.series?.length > 2 && (
        <Card hover={false} className="mb-8 p-6">
          <SectionHeader eyebrow="Temporal Pulse" title="How customer sentiment is moving"
            subtitle="Average sentiment over time across all feedback. The trajectory — not the single number — is what matters." />
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={temporal.series} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="sent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis domain={[-1, 1]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <ReferenceLine y={0} stroke="#334155" strokeDasharray="3 3" />
                <Tooltip contentStyle={{ background: "#0f141f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#94a3b8" }} />
                <Area type="monotone" dataKey="avg_sentiment" stroke="#818cf8" strokeWidth={2} fill="url(#sent)" name="Avg sentiment" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Priority matrix */}
      <SectionHeader eyebrow="Priority Landscape" title="What deserves attention"
        subtitle="Issues ranked by an explainable priority model — not raw frequency. Expand any finding for the reasoning and evidence."
        right={<button onClick={() => setSection("strategic")} className="text-xs font-medium text-indigo-300 hover:text-indigo-200">Strategic view →</button>} />
      <div className="grid gap-4">
        {top.slice(0, 4).map((iss, i) => <NarrativeCard key={iss.name + i} issue={iss} datasetId={datasetId} index={i} />)}
      </div>
    </div>
  );
}
