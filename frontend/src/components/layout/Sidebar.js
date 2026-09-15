import React from "react";
import { Activity, Plus, Database, Trash2, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { SECTIONS } from "@/components/layout/sections";
import { cx } from "@/components/vo/ui";
import { useData } from "@/context/DatasetContext";

export default function Sidebar({ section, setSection, report, onNew }) {
  const { datasets, activeId, selectDataset, deleteDataset } = useData();

  return (
    <aside className="hidden md:flex w-64 xl:w-72 shrink-0 flex-col border-r border-white/10 bg-[#090c13]">
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
        <div className="grid h-8 w-8 place-items-center rounded-lg border border-indigo-400/30 bg-indigo-500/10 text-indigo-300">
          <Activity size={16} />
        </div>
        <span className="text-lg font-bold tracking-tight text-white font-display">VOCIS</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        <div className="vo-caption px-3 pb-2 pt-3 text-slate-600">Intelligence</div>
        {SECTIONS.map((s) => {
          const enabled = s.available(report);
          const activeSec = section === s.key;
          return (
            <button key={s.key} data-testid={s.testid}
              disabled={!enabled}
              onClick={() => enabled && setSection(s.key)}
              className={cx(
                "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                activeSec ? "bg-indigo-500/12 text-white" : enabled ? "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200" : "text-slate-700 cursor-not-allowed"
              )}>
              <s.icon size={17} className={cx(activeSec ? "text-indigo-300" : "text-current")} strokeWidth={1.8} />
              <span className="truncate text-left flex-1">{s.label}</span>
              {activeSec && <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />}
              {!enabled && <span className="text-[9px] font-mono uppercase text-slate-700">n/a</span>}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center justify-between px-2 pb-2">
          <span className="vo-caption text-slate-600">Data Sources</span>
          <button data-testid="sidebar-new-dataset" onClick={onNew}
            className="grid h-6 w-6 place-items-center rounded-md border border-white/10 text-slate-400 hover:text-white hover:border-white/25 transition-colors">
            <Plus size={13} />
          </button>
        </div>
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {datasets.length === 0 && <div className="px-2 py-3 text-xs text-slate-600">No datasets yet.</div>}
          {datasets.map((d) => {
            const st = d.analysis?.status;
            return (
              <div key={d.id} data-testid="sidebar-dataset-item"
                className={cx("group flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors cursor-pointer",
                  activeId === d.id ? "bg-white/[0.06] text-slate-200" : "text-slate-400 hover:bg-white/[0.03]")}
                onClick={() => selectDataset(d.id)}>
                {st === "complete" ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  : st === "failed" ? <AlertCircle size={13} className="text-rose-400 shrink-0" />
                  : ["queued", "running"].includes(st) ? <Loader2 size={13} className="animate-spin text-indigo-400 shrink-0" />
                  : <Database size={13} className="text-slate-500 shrink-0" />}
                <span className="flex-1 truncate">{d.name}</span>
                <button onClick={(e) => { e.stopPropagation(); deleteDataset(d.id); }}
                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-opacity">
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
