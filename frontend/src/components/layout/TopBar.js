import React from "react";
import { Upload, LogOut, Sparkles, Database } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DatasetContext";
import { cx } from "@/components/vo/ui";

export default function TopBar({ title, onNew }) {
  const { user, logout } = useAuth();
  const { active } = useData();
  const initials = (user?.name || "U").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-white/10 vo-glass px-4 sm:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="truncate text-base sm:text-lg font-semibold text-slate-100 font-display">{title}</h1>
        {active && (
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-400">
            <Database size={12} className="text-indigo-300" /> {active.name}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button data-testid="upload-dataset-button" onClick={onNew}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-200 hover:border-white/25 transition-colors">
          <Upload size={14} /> <span className="hidden sm:inline">Connect data</span>
        </button>
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] py-1 pl-1 pr-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-indigo-500/15 text-[11px] font-semibold text-indigo-200 font-mono">{initials}</span>
          <span className="hidden sm:block text-xs text-slate-300 max-w-[120px] truncate">{user?.name}</span>
          <button data-testid="logout-button" onClick={logout} className="text-slate-500 hover:text-rose-400 transition-colors">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}

export function Banner({ children }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-2 text-xs text-indigo-200">
      <Sparkles size={13} /> {children}
    </div>
  );
}
