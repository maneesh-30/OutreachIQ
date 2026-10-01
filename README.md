# OutreachIQ

An AI sales team that researches your company, finds matching prospects, and writes personalized outreach emails from your own docs and case studies.

Multi-agent system built on **Microsoft Azure AI Foundry** (agents + knowledge base), with model routing across **Azure** (gpt-4.1-mini, judgment/writing) and **Featherless** (Llama-3.1-8B, bulk fetch/extract) to cut cost without losing quality.

## Status
Phase 0 — scaffold + model connectivity.

## Setup
```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env         # then fill in real keys
python backend/test_models.py
```

## Architecture (high level)
- **Setup:** paste a company URL -> self-analyzer reads site -> ICP builder drafts profile -> stored in Foundry knowledge base.
- **Run:** prospector discovers fitting companies -> fit scorer ranks -> researcher digs -> pain mapper + email drafter write grounded outreach -> dashboard.
