import React from "react";
import { motion } from "framer-motion";
import { Compass, Sparkles, Target, Lightbulb, AlertTriangle, HelpCircle } from "lucide-react";
import { Card, Caption, SectionHeader } from "@/components/vo/ui";

function Block({ icon: Icon, title, tone, items, render, empty }) {
  const tones = { indigo: "text-indigo-300", emerald: "text-emerald-300", rose: "text-rose-300", amber: "text-amber-300" };
  return (
    <Card hover={false} className="p-6">
      <div className={`mb-4 flex items-center gap-2 ${tones[tone]}`}>
        <Icon size={16} /> <h3 className="text-sm font-semibold font-display text-slate-100">{title}</h3>
      </div>
      <div className="space-y-3">
        {(!items || items.length === 0) && <p className="text-xs text-slate-500">{empty}</p>}
        {items?.map((it, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-4">
            {render(it)}
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

export default function Strategic({ report }) {
  const s = report.strategic || {};

  return (
    <div>
      <SectionHeader eyebrow="Strategic Intelligence" title="What this means for the business"
        subtitle="The synthesis layer — connecting customer, product, competitive and market signals into decisions. Every item traces to evidence." />

      {s.synthesis && (
        <Card hover={false} className="vo-grain mb-6 p-8">
          <div className="mb-3 flex items-center gap-2"><Sparkles size={15} className="text-indigo-300" /><Caption className="text-indigo-300/80">Strategic synthesis</Caption></div>
          <p className="text-[16px] leading-[1.8] text-slate-200 max-w-4xl">{s.synthesis}</p>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Block icon={Target} title="Strategic priorities" tone="indigo" items={s.priorities} empty="No prioritized actions were derived."
          render={(it) => (<>
            <div className="text-sm font-semibold text-slate-100">{it.title}</div>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">{it.rationale}</p>
            {it.evidence_ref && <div className="mt-2"><span className="rounded-md border border-indigo-500/20 bg-indigo-500/5 px-2 py-0.5 text-[10px] font-mono text-indigo-300">evidence · {it.evidence_ref}</span></div>}
          </>)} />
        <Block icon={Lightbulb} title="Opportunities" tone="emerald" items={s.opportunities} empty="No distinct opportunities surfaced."
          render={(it) => (<>
            <div className="text-sm font-semibold text-slate-100">{it.title}</div>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">{it.rationale}</p>
          </>)} />
        <Block icon={AlertTriangle} title="Risks" tone="rose" items={s.risks} empty="No material risks identified from the evidence."
          render={(it) => (<>
            <div className="text-sm font-semibold text-slate-100">{it.title}</div>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">{it.rationale}</p>
          </>)} />
        <Block icon={HelpCircle} title="Needs investigation" tone="amber" items={s.needs_investigation} empty="No open questions flagged."
          render={(it) => (<>
            <div className="text-sm font-medium text-slate-200">{it.question}</div>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">{it.why}</p>
          </>)} />
      </div>
    </div>
  );
}
