import React, { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useData } from "@/context/DatasetContext";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import UploadDialog from "@/components/upload/UploadDialog";
import ProcessingView from "@/components/ProcessingView";
import StartHub from "@/components/StartHub";
import { SECTIONS } from "@/components/layout/sections";
import { pageMotion } from "@/components/vo/ui";

import Overview from "@/pages/Overview";
import Customer from "@/pages/Customer";
import Product from "@/pages/Product";
import Competitive from "@/pages/Competitive";
import Market from "@/pages/Market";
import Evidence from "@/pages/Evidence";
import Strategic from "@/pages/Strategic";
import Reports from "@/pages/Reports";

const PAGES = { overview: Overview, customer: Customer, product: Product, competitive: Competitive, market: Market, evidence: Evidence, strategic: Strategic, reports: Reports };

export default function Shell() {
  const { datasets, activeId, active, report, loadingReport, refreshList, selectDataset } = useData();
  const [section, setSection] = useState("overview");
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    refreshList().then((list) => { if (list.length && !activeId) selectDataset(list[0].id); });
    // eslint-disable-next-line
  }, []);

  // If current section becomes unavailable for a new dataset, fall back to overview
  useEffect(() => {
    const sec = SECTIONS.find((s) => s.key === section);
    if (report && sec && !sec.available(report)) setSection("overview");
  }, [report, section]);

  const openNew = useCallback(() => setUploadOpen(true), []);
  const status = active?.analysis?.status;
  const Page = PAGES[section];
  const title = SECTIONS.find((s) => s.key === section)?.label || "Overview";

  let content;
  if (!activeId) {
    content = <StartHub onNew={openNew} />;
  } else if (["queued", "running", "failed"].includes(status)) {
    content = <ProcessingView />;
  } else if (report) {
    content = (
      <AnimatePresence mode="wait">
        <motion.div key={section} {...pageMotion}>
          <Page report={report} datasetId={activeId} setSection={setSection} onNew={openNew} />
        </motion.div>
      </AnimatePresence>
    );
  } else {
    content = <div className="py-20 text-center text-sm text-slate-500">{loadingReport ? "Loading intelligence…" : "No intelligence available."}</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#07090e] text-slate-200">
      <Sidebar section={section} setSection={setSection} report={report} onNew={openNew} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar title={title} onNew={openNew} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            {content}
          </div>
        </main>
      </div>
      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onDone={() => setSection("overview")} />
    </div>
  );
}
