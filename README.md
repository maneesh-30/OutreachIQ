# OutreachIQ

An AI sales team that researches your company, finds matching prospects, and writes personalized outreach emails from your own docs and case studies.

Multi-agent system built on **Microsoft Azure AI Foundry** (Responses API + knowledge base), with model routing across **Azure** (gpt-4.1-mini, judgment/writing) and **Featherless** (Qwen2.5-7B-Instruct, bulk fetch/extract) to cut cost without losing quality.

## Status
Phase 2 — agent pipeline runs end-to-end on one lead (terminal).

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
python backend/orchestrator.py               # full agent pipeline on one prospect + cost split
```

## Architecture (high level)
- **Setup:** paste a company URL -> self-analyzer reads site -> ICP builder drafts profile -> stored in Foundry knowledge base.
- **Run:** prospector discovers fitting companies -> fit scorer ranks -> researcher digs -> pain mapper + email drafter write grounded outreach -> dashboard.
