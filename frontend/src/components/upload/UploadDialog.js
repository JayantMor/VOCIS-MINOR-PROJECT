import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, UploadCloud, FileSpreadsheet, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api, { apiErr } from "@/lib/api";
import { useData } from "@/context/DatasetContext";
import { cx } from "@/components/vo/ui";

export default function UploadDialog({ open, onClose, onDone }) {
  const { createFromDemo, uploadFile } = useData();
  const [demos, setDemos] = useState([]);
  const [busy, setBusy] = useState(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { if (open) api.get("/demos").then((r) => setDemos(r.data.demos)).catch(() => {}); }, [open]);

  const runDemo = async (key) => {
    setBusy(key);
    try { await createFromDemo(key); toast.success("Dataset connected — VOCIS is analyzing."); onDone?.(); onClose(); }
    catch (e) { toast.error(apiErr(e)); }
    finally { setBusy(null); }
  };

  const handleFile = async (file) => {
    if (!file) return;
    setBusy("upload");
    try { await uploadFile(file); toast.success("File uploaded — VOCIS is analyzing."); onDone?.(); onClose(); }
    catch (e) { toast.error(apiErr(e)); }
    finally { setBusy(null); }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <div className="fixed inset-0 z-50 grid place-items-center p-4 pointer-events-none">
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              data-testid="upload-dialog"
              className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0c111b] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 p-6">
                <div>
                  <div className="vo-caption text-indigo-300/70">Connect information</div>
                  <h3 className="mt-1 text-xl font-bold text-slate-100 font-display">Give VOCIS something to understand</h3>
                </div>
                <button onClick={onClose} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
              </div>

              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Upload */}
                <div
                  data-testid="upload-dropzone"
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files?.[0]); }}
                  onClick={() => fileRef.current?.click()}
                  className={cx("flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed p-8 text-center transition-colors",
                    drag ? "border-indigo-500/60 bg-indigo-500/5" : "border-white/10 hover:border-white/25")}>
                  {busy === "upload" ? <Loader2 size={26} className="animate-spin text-indigo-300" /> : <UploadCloud size={26} className="text-indigo-300" />}
                  <p className="mt-3 text-sm font-medium text-slate-200">Drop a CSV or Excel file, or click to browse</p>
                  <p className="mt-1 text-xs text-slate-500">VOCIS auto-detects your columns — you don't need a specific format. Just include a feedback/review text field.</p>
                  <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                    data-testid="upload-file-input" onChange={(e) => handleFile(e.target.files?.[0])} />
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="vo-caption text-slate-600">or explore a demo</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                {/* Demos */}
                <div className="grid gap-3">
                  {demos.map((d) => (
                    <button key={d.key} data-testid={`demo-${d.key}`} disabled={!!busy} onClick={() => runDemo(d.key)}
                      className="group flex items-center gap-4 rounded-xl border border-white/[0.07] bg-white/[0.015] p-4 text-left transition-all hover:border-indigo-500/30 hover:bg-white/[0.03] disabled:opacity-60">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-indigo-300">
                        {busy === d.key ? <Loader2 size={17} className="animate-spin" /> : <FileSpreadsheet size={17} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-100">{d.name}</span>
                          <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-mono text-slate-400">{d.records} records</span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">{d.description}</p>
                      </div>
                      <ArrowRight size={16} className="shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-300" />
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs text-slate-500">
                  <Sparkles size={13} className="text-indigo-300" /> VOCIS never fabricates data — capabilities adapt to whatever fields your data actually contains.
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
