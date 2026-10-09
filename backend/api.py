"""FastAPI backend for OutreachIQ.

POST /api/runs            start a discovery+pipeline batch (background), returns run_id
GET  /api/runs            list runs
GET  /api/runs/{id}       full run detail (prospects, emails, cost)
GET  /api/runs/{id}/stream   SSE stream of live agent events
GET  /api/pool            the seed prospect pool
"""
from __future__ import annotations

import asyncio
import json
import queue
import threading

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

import db
from db import Session, Run, Prospect, Email, Step
import orchestrator
from prospector import load_pool

app = FastAPI(title="OutreachIQ API")
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

RUN_QUEUES: dict[int, queue.Queue] = {}


@app.on_event("startup")
def _startup():
    db.init_db()


# ---------- background worker + persistence ----------

def _persist(run_id: int, ev: dict, name2id: dict) -> None:
    t = ev.get("type")
    with Session() as s:
        if t == "discovered":
            for p in ev["prospects"]:
                row = Prospect(run_id=run_id, name=p["name"],
                               discovery_score=p["score"], status="pending")
                s.add(row)
                s.commit()
                name2id[p["name"]] = row.id

        elif t == "step" and ev.get("status") == "done":
            pid = name2id.get(ev["prospect"])
            led = ev.get("ledger") or {}
            if led:
                s.add(Step(run_id=run_id, prospect_id=pid, agent=ev["agent"],
                           provider=led.get("provider", ""), model=led.get("model", ""),
                           tokens_in=led.get("tokens_in", 0),
                           tokens_out=led.get("tokens_out", 0),
                           cost=led.get("cost", 0.0)))
            row = s.get(Prospect, pid) if pid else None
            if row:
                out = ev.get("output")
                if ev["agent"] == "researcher":
                    row.facts_json = json.dumps(out)
                elif ev["agent"] == "fit_scorer" and isinstance(out, dict):
                    row.fit_score = out.get("score")
                    row.fit_reason = out.get("reason")
                elif ev["agent"] == "pain_mapper":
                    row.pains_json = json.dumps(out)
                elif ev["agent"] == "hook_finder":
                    row.hook = out
            s.commit()

        elif t == "prospect_done":
            pid = name2id.get(ev["prospect"])
            email = ev["result"].get("email", {})
            if pid:
                s.add(Email(prospect_id=pid, subject=email.get("subject", ""),
                            body=email.get("body", email.get("_raw", "")),
                            sources_json=json.dumps(email.get("sources", []))))
                row = s.get(Prospect, pid)
                if row:
                    row.status = "done"
            s.commit()

        elif t == "run_done":
            run = s.get(Run, run_id)
            cost = ev.get("cost", {})
            run.status = "done"
            run.cost_azure = cost.get("azure", 0.0)
            run.cost_cheap = cost.get("groq", 0.0)
            s.commit()


def _worker(run_id: int, top_n: int, q: queue.Queue) -> None:
    name2id: dict = {}

    def emit(ev: dict) -> None:
        try:
            _persist(run_id, ev, name2id)
        finally:
            q.put(ev)

    try:
        orchestrator.run_batch(top_n=top_n, emit=emit)
    except Exception as e:  # noqa: BLE001
        with Session() as s:
            run = s.get(Run, run_id)
            run.status = "error"
            run.error = str(e)
            s.commit()
        q.put({"type": "error", "message": str(e)})
    finally:
        q.put({"type": "__end__"})


# ---------- endpoints ----------

@app.post("/api/runs")
def start_run(payload: dict | None = None):
    top_n = int((payload or {}).get("top_n", 3))
    with Session() as s:
        run = Run(top_n=top_n, status="running")
        s.add(run)
        s.commit()
        run_id = run.id
    q: queue.Queue = queue.Queue()
    RUN_QUEUES[run_id] = q
    threading.Thread(target=_worker, args=(run_id, top_n, q), daemon=True).start()
    return {"run_id": run_id, "top_n": top_n, "status": "running"}


@app.get("/api/runs")
def list_runs():
    with Session() as s:
        runs = s.query(Run).order_by(Run.id.desc()).all()
        return [{"id": r.id, "top_n": r.top_n, "status": r.status,
                 "cost_total": round(r.cost_azure + r.cost_cheap, 6),
                 "created_at": r.created_at.isoformat()} for r in runs]


@app.get("/api/runs/{run_id}")
def get_run(run_id: int):
    with Session() as s:
        run = s.get(Run, run_id)
        if not run:
            raise HTTPException(404, "run not found")
        prospects = []
        for p in sorted(run.prospects, key=lambda x: -x.discovery_score):
            em = p.email
            prospects.append({
                "id": p.id, "name": p.name, "domain": p.domain,
                "discovery_score": p.discovery_score, "fit_score": p.fit_score,
                "fit_reason": p.fit_reason, "status": p.status,
                "facts": json.loads(p.facts_json) if p.facts_json else None,
                "pains": json.loads(p.pains_json) if p.pains_json else None,
                "hook": p.hook,
                "email": ({"subject": em.subject, "body": em.body,
                           "sources": json.loads(em.sources_json) if em.sources_json else []}
                          if em else None),
            })
        return {
            "id": run.id, "top_n": run.top_n, "status": run.status, "error": run.error,
            "cost": {"azure": run.cost_azure, "groq": run.cost_cheap,
                     "total": round(run.cost_azure + run.cost_cheap, 6)},
            "prospects": prospects,
        }


@app.get("/api/runs/{run_id}/stream")
async def stream_run(run_id: int):
    q = RUN_QUEUES.get(run_id)
    if q is None:
        raise HTTPException(404, "no live stream for this run")

    async def gen():
        loop = asyncio.get_event_loop()
        while True:
            ev = await loop.run_in_executor(None, q.get)
            if ev.get("type") == "__end__":
                yield "event: end\ndata: {}\n\n"
                break
            yield f"data: {json.dumps(ev)}\n\n"
        RUN_QUEUES.pop(run_id, None)

    return StreamingResponse(gen(), media_type="text/event-stream")


@app.get("/api/pool")
def get_pool():
    return load_pool()
