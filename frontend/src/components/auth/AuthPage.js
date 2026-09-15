import React, { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Activity, ArrowRight, Loader2 } from "lucide-react";

export default function AuthPage() {
  const { login, register, error, setError } = useAuth();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "login") await login(email, password);
    else await register(name, email, password);
    setBusy(false);
  };

  const swap = () => { setError(""); setMode((m) => (m === "login" ? "register" : "login")); };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left — brand / narrative */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-white/10 p-12 vo-grain">
        <div className="absolute inset-0 -z-10">
          <img src="https://images.unsplash.com/photo-1644088379091-d574269d422f?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400" alt="" className="h-full w-full object-cover opacity-[0.14]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/70 to-transparent" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl border border-indigo-400/30 bg-indigo-500/10 text-indigo-300">
            <Activity size={18} />
          </div>
          <span className="text-xl font-bold tracking-tight text-white font-display">VOCIS</span>
        </div>
        <div className="max-w-md">
          <div className="vo-caption mb-4 text-indigo-300/70">AI-Native Customer & Market Intelligence</div>
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-white font-display">
            Connect your customer voice.<br />VOCIS does the understanding.
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-slate-400">
            Not another dashboard. VOCIS discovers what matters, connects the evidence, reasons over
            the findings, and tells you what deserves attention — before you know to ask.
          </p>
        </div>
        <div className="text-xs text-slate-600 font-mono">Evidence-backed · adaptive · decision-ready</div>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-sm">
          <div className="mb-8 lg:hidden flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-indigo-400/30 bg-indigo-500/10 text-indigo-300"><Activity size={18} /></div>
            <span className="text-xl font-bold tracking-tight text-white font-display">VOCIS</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 font-display">
            {mode === "login" ? "Welcome back" : "Create your workspace"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {mode === "login" ? "Sign in to your intelligence workspace." : "Start turning customer signals into decisions."}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {mode === "register" && (
              <Field label="Full name" value={name} onChange={setName} testid="auth-name" placeholder="Jordan Rivera" />
            )}
            <Field label="Email" type="email" value={email} onChange={setEmail} testid="auth-email" placeholder="you@company.com" />
            <Field label="Password" type="password" value={password} onChange={setPassword} testid="auth-password" placeholder="••••••••" />

            {error && <div data-testid="auth-error" className="rounded-lg border border-rose-500/25 bg-rose-500/5 px-3 py-2 text-sm text-rose-300">{error}</div>}

            <button type="submit" disabled={busy} data-testid="auth-submit"
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-400 disabled:opacity-60">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <>{mode === "login" ? "Sign in" : "Create account"}<ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" /></>}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            {mode === "login" ? "New to VOCIS?" : "Already have an account?"}{" "}
            <button onClick={swap} data-testid="auth-swap-mode" className="font-medium text-indigo-300 hover:text-indigo-200">
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </div>
          <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-center text-xs text-slate-500">
            Demo: <span className="font-mono text-slate-400">analyst@vocis.ai / vocis2026</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", testid, placeholder }) {
  return (
    <label className="block">
      <span className="vo-caption mb-1.5 block text-slate-500">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required data-testid={testid} placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-colors focus:border-indigo-500/50 focus:bg-white/[0.04]" />
    </label>
  );
}
