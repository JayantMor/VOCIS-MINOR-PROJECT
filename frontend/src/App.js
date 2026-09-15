import React, { useEffect } from "react";
import "@/index.css";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { DataProvider } from "@/context/DatasetContext";
import { EvidenceProvider } from "@/components/vo/EvidenceDrawer";
import AuthPage from "@/components/auth/AuthPage";
import Shell from "@/components/layout/Shell";
import { Activity } from "lucide-react";

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#07090e]">
      <div className="flex flex-col items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-indigo-400/30 bg-indigo-500/10 text-indigo-300 animate-pulse">
          <Activity size={22} />
        </div>
        <span className="vo-caption text-slate-500">Loading VOCIS…</span>
      </div>
    </div>
  );
}

function Gate() {
  const { user } = useAuth();
  if (user === null) return <Splash />;
  if (!user) return <AuthPage />;
  return (
    <DataProvider>
      <EvidenceProvider>
        <Shell />
      </EvidenceProvider>
    </DataProvider>
  );
}

export default function App() {
  useEffect(() => { document.title = "VOCIS — Customer & Market Intelligence"; }, []);
  return (
    <AuthProvider>
      <Toaster theme="dark" position="top-right" toastOptions={{ style: { background: "#121722", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0" } }} />
      <Gate />
    </AuthProvider>
  );
}
