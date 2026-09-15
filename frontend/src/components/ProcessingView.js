import React from "react";
import { motion } from "framer-motion";
import { Check, Loader2, Circle, AlertTriangle, RotateCw } from "lucide-react";
import { useData } from "@/context/DatasetContext";
import { Card, cx } from "@/components/vo/ui";
import api from "@/lib/api";

export default function ProcessingView() {
  const { active } = useData();
  const a = active?.analysis || {};
  const steps = a.steps || [];
  const stateOf = (k) => a.step_state?.[k] || "pending";
  const failed = a.status === "failed";

  const retry = async () => { if (active) await api.post(`/datasets/${active.id}/analyze`); };

  return (
    <div className="mx-auto max-w-2xl py-12">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card hover={false} className="vo-grain p-8">
          <div className="relative">
            <div className="vo-caption text-indigo-300/70">{failed ? "Analysis interrupted" : "Understanding your data"}</div>
            <h2 className="mt-2 text-2xl font-bold text-slate-100 font-display">
              {failed ? "Something went wrong" : "VOCIS is building your intelligence"}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {failed ? (a.error || "The analysis failed. You can retry.")
                : `Analyzing ${active?.profile?.records_usable ?? ""} feedback records. This runs deterministic analytics first, then AI reasoning over the evidence.`}
            </p>

            <div className="mt-8 space-y-1">
              {steps.map((s, i) => {
                const st = stateOf(s.key);
                return (
                  <motion.div key={s.key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className={cx("flex items-center gap-3 rounded-lg px-3 py-2.5",
                      st === "running" && "bg-indigo-500/8")}>
                    <span className="grid h-6 w-6 place-items-center">
                      {st === "done" ? <Check size={16} className="text-emerald-400" />
                        : st === "running" ? <Loader2 size={16} className="animate-spin text-indigo-300" />
                        : <Circle size={9} className="text-slate-700" />}
                    </span>
                    <span className={cx("text-sm", st === "done" ? "text-slate-300" : st === "running" ? "text-white font-medium" : "text-slate-600")}>
                      {s.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {failed && (
              <button onClick={retry} data-testid="retry-analysis-button"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors">
                <RotateCw size={15} /> Retry analysis
              </button>
            )}
            {!failed && (
              <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
                <AlertTriangle size={12} /> Steps only complete when the underlying work genuinely finishes — nothing is faked.
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
