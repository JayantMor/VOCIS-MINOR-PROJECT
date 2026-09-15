from fastapi import APIRouter, Request, UploadFile, File, HTTPException, BackgroundTasks
from datetime import datetime, timezone
import uuid

from core.db import db
from core.security import get_current_user
from intelligence import ingestion as ING
from intelligence import research as RES
from intelligence.orchestrator import run_analysis, STEPS
from intelligence import demo_data as DEMO

router = APIRouter(prefix="/api", tags=["datasets"])

MAX_RECORDS = 4000


async def _workspace(request: Request) -> str:
    user = await get_current_user(request)
    return user.get("default_workspace_id") or user["workspace_id"]


def _summary(ds):
    return {"id": ds["id"], "name": ds["name"], "source_type": ds.get("source_type"),
            "industry": ds.get("industry"), "brand": ds.get("brand"),
            "created_at": ds["created_at"], "profile": ds.get("profile"),
            "analysis": ds.get("analysis", {"status": "idle"})}


async def _persist_and_run(ws_id, name, source_type, df, background, industry=None, brand=None):
    schema = ING.detect_schema(df)
    if not schema.get("text"):
        raise HTTPException(status_code=422,
                            detail="No usable text/feedback column detected. VOCIS needs at least one free-text field.")
    records = ING.normalize_records(df, schema)
    if len(records) < 5:
        raise HTTPException(status_code=422,
                            detail="Not enough usable text records were found to produce reliable intelligence.")
    if len(records) > MAX_RECORDS:
        records = records[:MAX_RECORDS]
    profile = ING.profile_dataset(df, schema, records)
    ds_id = str(uuid.uuid4())
    doc = {"id": ds_id, "workspace_id": ws_id, "name": name, "source_type": source_type,
           "industry": industry, "brand": brand, "schema": schema, "records": records,
           "profile": profile, "created_at": datetime.now(timezone.utc).isoformat(),
           "analysis": {"status": "queued", "steps": [{"key": k, "label": l} for k, l in STEPS],
                        "step_state": {k: "pending" for k, _ in STEPS}}}
    await db.datasets.insert_one(doc)
    background.add_task(run_analysis, ds_id)
    return _summary(doc)


@router.post("/datasets/upload")
async def upload(request: Request, background: BackgroundTasks, file: UploadFile = File(...)):
    ws_id = await _workspace(request)
    raw = await file.read()
    if len(raw) == 0:
        raise HTTPException(status_code=422, detail="The uploaded file is empty.")
    try:
        df = ING.read_table(raw, file.filename)
    except Exception:
        raise HTTPException(status_code=422, detail="Could not read the file. Please upload a valid CSV or Excel file.")
    if df.empty or len(df.columns) == 0:
        raise HTTPException(status_code=422, detail="The file contains no rows or columns.")
    name = (file.filename or "Uploaded dataset").rsplit(".", 1)[0]
    return await _persist_and_run(ws_id, name, "upload", df, background)


@router.post("/datasets/demo/{key}")
async def load_demo(key: str, request: Request, background: BackgroundTasks):
    ws_id = await _workspace(request)
    if key not in DEMO.DEMOS:
        raise HTTPException(status_code=404, detail="Unknown demo dataset.")
    demo = DEMO.DEMOS[key]()
    return await _persist_and_run(ws_id, demo["name"], "demo", demo["df"],
                                  background, industry=demo["industry"], brand=demo["brand"])


@router.get("/demos")
async def demos():
    return {"demos": DEMO.list_demos(), "research_enabled": RES.is_available()}


@router.get("/datasets")
async def list_datasets(request: Request):
    ws_id = await _workspace(request)
    out = []
    async for ds in db.datasets.find({"workspace_id": ws_id}, {"records": 0, "schema": 0}).sort("created_at", -1):
        ds.pop("_id", None)
        out.append(_summary(ds))
    return {"datasets": out}


@router.get("/datasets/{ds_id}")
async def get_dataset(ds_id: str, request: Request):
    ws_id = await _workspace(request)
    ds = await db.datasets.find_one({"id": ds_id, "workspace_id": ws_id}, {"records": 0, "_id": 0})
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    return {**_summary(ds), "schema": ds.get("schema")}


@router.post("/datasets/{ds_id}/analyze")
async def reanalyze(ds_id: str, request: Request, background: BackgroundTasks):
    ws_id = await _workspace(request)
    ds = await db.datasets.find_one({"id": ds_id, "workspace_id": ws_id}, {"_id": 0, "id": 1})
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    await db.datasets.update_one({"id": ds_id}, {"$set": {"analysis.status": "queued"}})
    background.add_task(run_analysis, ds_id)
    return {"ok": True}


@router.delete("/datasets/{ds_id}")
async def delete_dataset(ds_id: str, request: Request):
    ws_id = await _workspace(request)
    await db.datasets.delete_one({"id": ds_id, "workspace_id": ws_id})
    await db.reports.delete_one({"dataset_id": ds_id})
    await db.feedback.delete_many({"dataset_id": ds_id})
    return {"ok": True}


@router.get("/datasets/{ds_id}/report")
async def get_report(ds_id: str, request: Request):
    ws_id = await _workspace(request)
    ds = await db.datasets.find_one({"id": ds_id, "workspace_id": ws_id}, {"_id": 0, "id": 1, "name": 1})
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    report = await db.reports.find_one({"dataset_id": ds_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Intelligence not ready yet.")
    report["dataset_name"] = ds.get("name")
    return report


@router.get("/datasets/{ds_id}/feedback")
async def get_feedback(ds_id: str, request: Request, sentiment: str = None, theme: str = None,
                       product: str = None, brand: str = None, intent: str = None,
                       q: str = None, limit: int = 50, skip: int = 0):
    ws_id = await _workspace(request)
    ds = await db.datasets.find_one({"id": ds_id, "workspace_id": ws_id}, {"_id": 0, "id": 1})
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    query = {"dataset_id": ds_id}
    if sentiment:
        query["sentiment"] = sentiment
    if theme:
        query["theme"] = theme
    if product:
        query["product"] = product
    if brand:
        query["brand"] = brand
    if intent:
        query["intent"] = intent
    if q:
        query["text"] = {"$regex": q, "$options": "i"}
    total = await db.feedback.count_documents(query)
    items = []
    async for doc in db.feedback.find(query, {"_id": 0}).skip(skip).limit(min(limit, 100)):
        items.append(doc)
    return {"total": total, "items": items}
