# OutreachIQ

An AI sales team that researches your company, finds matching prospects, and writes personalized outreach emails from your own docs and case studies.

Multi-agent system built on **Microsoft Azure AI Foundry** (Responses API + knowledge base), with model routing across **Azure** (gpt-4.1-mini, judgment/writing) and **Groq** (gpt-oss-20b, bulk fetch/extract) to cut cost without losing quality.

## Status
Phase 5 — React frontend: Setup, New Run, Live Run (live SSE agent cards), Prospects, and a cost-split Dashboard, wired to the API.

## Setup
```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env         # then fill in real keys
python backend/test_models.py  # smoke test: Azure + Featherless respond
```

## Run
```bash
python backend/kb_build.py build            # build Foundry knowledge base from data/company/*.md
python backend/kb_build.py ask "question"    # grounded query + citations
python backend/prospector.py 8               # discover + rank top 8 prospects from the pool
python backend/orchestrator.py 3             # discover top 3 + run full pipeline on each
python backend/orchestrator.py single        # run pipeline on the fallback hardcoded prospect
```

## Backend API
```bash
cd backend && uvicorn api:app --reload        # http://127.0.0.1:8000
```
- `POST /api/runs` `{"top_n": 3}` — start a discovery+pipeline batch (background), returns `run_id`
- `GET  /api/runs` — list runs
- `GET  /api/runs/{id}` — full detail: prospects, fit, emails, citations, cost split
- `GET  /api/runs/{id}/stream` — SSE live agent events
- `GET  /api/pool` — the seed prospect pool

## Frontend
```bash
cd frontend && npm install && npm run dev     # http://localhost:5173 (proxies /api to :8000)
```
Screens: Setup · New Run · Live Run (streaming agent cards) · Prospects (grounded email + citations) · Dashboard (Azure vs Groq cost split). Run the backend first.


## Architecture (high level)
- **Setup:** paste a company URL -> self-analyzer reads site -> ICP builder drafts profile -> stored in Foundry knowledge base.
- **Run:** prospector discovers fitting companies -> fit scorer ranks -> researcher digs -> pain mapper + email drafter write grounded outreach -> dashboard.
