# OutreachIQ

An AI sales team that researches your company, finds matching prospects, and writes personalized outreach emails from your own docs and case studies.

Multi-agent system built on **Microsoft Azure AI Foundry** (Responses API + knowledge base), with model routing across **Azure** (gpt-4.1-mini, judgment/writing) and **Featherless** (Qwen2.5-7B-Instruct, bulk fetch/extract) to cut cost without losing quality.

## Status
Phase 3 — discovery: finds + ranks fitting prospects from a seed pool, then runs the pipeline on the top N (terminal).

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

## Architecture (high level)
- **Setup:** paste a company URL -> self-analyzer reads site -> ICP builder drafts profile -> stored in Foundry knowledge base.
- **Run:** prospector discovers fitting companies -> fit scorer ranks -> researcher digs -> pain mapper + email drafter write grounded outreach -> dashboard.
