import React from "react";
import { motion } from "framer-motion";
import { Upload, Sparkles, Network, ShieldCheck } from "lucide-react";
import { Card } from "@/components/vo/ui";

export default function StartHub({ onNew }) {
  return (
    <div className="mx-auto max-w-3xl py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card hover={false} className="vo-grain overflow-hidden p-10 text-center">
          <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl border border-indigo-400/30 bg-indigo-500/10 text-indigo-300">
            <Network size={28} strokeWidth={1.6} />
          </div>
          <div className="vo-caption text-indigo-300/70">Welcome to VOCIS</div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-display">
            Connect information. VOCIS does the thinking.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-slate-400">
            Upload customer feedback or explore a demo. VOCIS profiles your data, discovers what customers
            are really saying, connects the evidence, and surfaces what deserves attention — no manual configuration.
          </p>
          <button data-testid="starthub-connect-button" onClick={onNew}
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-400">
            <Upload size={16} /> Connect data or try a demo
          </button>
        </Card>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Sparkles, t: "Adaptive by design", d: "No fixed themes or categories. Intelligence adapts to whatever your data contains." },
            { icon: Network, t: "Evidence-backed", d: "Every conclusion traces to the actual customer feedback that supports it." },
            { icon: ShieldCheck, t: "Never fabricated", d: "If the data can't support a conclusion, VOCIS says so — honestly." },
          ].map((f) => (
            <Card key={f.t} className="p-5">
              <f.icon size={18} className="text-indigo-300" />
              <div className="mt-3 text-sm font-semibold text-slate-200">{f.t}</div>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">{f.d}</p>
            </Card>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
