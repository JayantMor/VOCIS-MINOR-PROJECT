import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import api from "@/lib/api";

const DatasetContext = createContext(null);
export const useData = () => useContext(DatasetContext);

export function DataProvider({ children }) {
  const [datasets, setDatasets] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [active, setActive] = useState(null); // dataset meta w/ analysis status
  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const pollRef = useRef(null);

  const refreshList = useCallback(async () => {
    const { data } = await api.get("/datasets");
    setDatasets(data.datasets);
    return data.datasets;
  }, []);

  const loadReport = useCallback(async (id) => {
    setLoadingReport(true);
    try {
      const { data } = await api.get(`/datasets/${id}/report`);
      setReport(data);
    } catch (_) {
      setReport(null);
    } finally {
      setLoadingReport(false);
    }
  }, []);

  const poll = useCallback(async (id) => {
    const { data } = await api.get(`/datasets/${id}`);
    setActive(data);
    if (data.analysis?.status === "complete") {
      clearInterval(pollRef.current);
      pollRef.current = null;
      loadReport(id);
      refreshList();
    } else if (data.analysis?.status === "failed") {
      clearInterval(pollRef.current);
      pollRef.current = null;
      refreshList();
    }
  }, [loadReport, refreshList]);

  const selectDataset = useCallback(async (id) => {
    setActiveId(id);
    setReport(null);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    const { data } = await api.get(`/datasets/${id}`);
    setActive(data);
    if (data.analysis?.status === "complete") {
      loadReport(id);
    } else if (["queued", "running"].includes(data.analysis?.status)) {
      pollRef.current = setInterval(() => poll(id), 2500);
    }
  }, [loadReport, poll]);

  const createFromDemo = useCallback(async (key) => {
    const { data } = await api.post(`/datasets/demo/${key}`);
    await refreshList();
    setActiveId(data.id);
    setActive(data);
    setReport(null);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => poll(data.id), 2500);
    return data;
  }, [refreshList, poll]);

  const uploadFile = useCallback(async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await api.post(`/datasets/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
    await refreshList();
    setActiveId(data.id);
    setActive(data);
    setReport(null);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => poll(data.id), 2500);
    return data;
  }, [refreshList, poll]);

  const deleteDataset = useCallback(async (id) => {
    await api.delete(`/datasets/${id}`);
    if (id === activeId) { setActiveId(null); setActive(null); setReport(null); }
    await refreshList();
  }, [activeId, refreshList]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  return (
    <DatasetContext.Provider value={{
      datasets, activeId, active, report, loadingReport,
      refreshList, selectDataset, createFromDemo, uploadFile, deleteDataset,
    }}>
      {children}
    </DatasetContext.Provider>
  );
}
