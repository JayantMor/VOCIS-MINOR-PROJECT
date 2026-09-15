import React from "react";
import { motion } from "framer-motion";

export const cx = (...a) => a.filter(Boolean).join(" ");

export function Card({ className, children, hover = true, ...p }) {
  return (
    <div className={cx("vo-surface relative overflow-hidden", hover && "vo-surface-hover", className)} {...p}>
      {children}
    </div>
  );
}

export function Caption({ children, className }) {
  return <div className={cx("vo-caption", className)}>{children}</div>;
}

export function SectionHeader({ eyebrow, title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        {eyebrow && <Caption className="mb-2 text-indigo-300/70">{eyebrow}</Caption>}
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 font-display">{title}</h2>
        {subtitle && <p className="mt-2 text-sm text-slate-400 max-w-2xl leading-relaxed">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

const PRI = {
  high: "bg-rose-500/10 text-rose-300 border-rose-500/30",
  medium: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  low: "bg-slate-500/10 text-slate-300 border-slate-500/25",
};
export function PriorityBadge({ level }) {
  if (!level) return null;
  return (
    <span data-testid="priority-badge" className={cx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-wider", PRI[level] || PRI.low)}>
      <span className={cx("h-1.5 w-1.5 rounded-full", level === "high" ? "bg-rose-400 vo-dot" : level === "medium" ? "bg-amber-400" : "bg-slate-400")} />
      {level} priority
    </span>
  );
}

const SENT = {
  positive: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
  negative: "bg-rose-500/10 text-rose-300 border-rose-500/25",
  neutral: "bg-slate-500/10 text-slate-300 border-slate-500/20",
  mixed: "bg-violet-500/10 text-violet-300 border-violet-500/25",
};
export function SentimentBadge({ value }) {
  return <span className={cx("inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize", SENT[value] || SENT.neutral)}>{value}</span>;
}

export function MetricPill({ label, value, tone = "slate", mono = true }) {
  const tones = {
    slate: "text-slate-200", emerald: "text-emerald-300", rose: "text-rose-300",
    amber: "text-amber-300", indigo: "text-indigo-300", cyan: "text-cyan-300",
  };
  return (
    <div className="min-w-0">
      <Caption className="mb-1 text-slate-500">{label}</Caption>
      <div className={cx("text-lg font-semibold", mono && "font-mono", tones[tone])}>{value}</div>
    </div>
  );
}

export function ConfidenceBadge({ level }) {
  const map = {
    High: "text-emerald-300 border-emerald-500/30 bg-emerald-500/5",
    Moderate: "text-amber-300 border-amber-500/30 bg-amber-500/5",
    Limited: "text-slate-300 border-slate-500/25 bg-slate-500/5",
  };
  return <span className={cx("rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider", map[level] || map.Limited)}>{level} evidence</span>;
}

export function evidenceLevel(size, cohesion = 0.5) {
  if (size >= 25 && cohesion >= 0.5) return "High";
  if (size >= 10) return "Moderate";
  return "Limited";
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <Card hover={false} className="flex flex-col items-center justify-center text-center px-8 py-16">
      <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-indigo-300">
        {Icon && <Icon size={24} strokeWidth={1.6} />}
      </div>
      <h3 className="text-lg font-semibold text-slate-200 font-display">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-400 leading-relaxed">{children}</p>
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
}

export function Bar({ value, max = 1, tone = "indigo", className }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const tones = { indigo: "bg-indigo-500", rose: "bg-rose-500", emerald: "bg-emerald-500", amber: "bg-amber-500", cyan: "bg-cyan-500" };
  return (
    <div className={cx("h-1.5 w-full overflow-hidden rounded-full bg-white/5", className)}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className={cx("h-full rounded-full", tones[tone])} />
    </div>
  );
}

export const pageMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
};
