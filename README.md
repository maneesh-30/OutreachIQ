# OutreachIQ

OutreachIQ is an AI agent system for B2B sales outreach. You paste your own company's URL. It reads your site, works out what you sell and who your ideal customer is, then goes out to the live web, finds real companies that match, researches each one, and writes a personalized first email grounded in facts about both sides. You review each draft and send it from your own Gmail.

It is not a template email writer. Every score and every email is backed by research, and the emails cite real proof from your own material.

## How it works

Seven agents, five on Azure AI Foundry (the judgment and grounding work) and two on Groq (cheap bulk work):

1. **Self-analyzer** (Foundry) reads your website and extracts what you sell plus your ideal customer profile (ICP).
2. **Prospector** (Foundry) builds web search queries from your ICP, searches the live web, and scores which companies match.
3. **Researcher** (Groq) turns each company into structured facts.
4. **Fit Scorer** (Foundry) grades the prospect 0 to 100 against your ICP.
5. **Pain Mapper** (Foundry) finds the top problems you can solve and names your best proof case study.
6. **Hook Finder** (Groq) picks one personalization angle.
7. **Email Drafter** (Foundry) writes the email in your voice, cites the proof, and signs with your name.

Azure AI Foundry provides the reasoning model (`gpt-4.1-mini`), a vector-store knowledge base built from your profile and uploaded docs, and grounded answers with citations through the Responses API file-search tool. A cost ledger records the Azure vs Groq split per run.

## Tech stack

- **Backend:** Python, FastAPI, SQLAlchemy + SQLite, server-sent events for live run streaming.
- **Frontend:** React, Vite, Tailwind.
- **AI:** Azure AI Foundry (gpt-4.1-mini, text-embedding-3-small, vector store, Responses API) and Groq for bulk steps.
- **Discovery:** Serper (fast Google search) with an Apify Google-search fallback.
- **Scraping:** Playwright driving local headless Chrome, so JavaScript-heavy sites render.
- **Sending:** Google OAuth + the Gmail API.

## Requirements

- Python 3.11 or newer
- Node.js 18 or newer
- Google Chrome installed (the scraper drives your local Chrome)
- Accounts and keys: Azure AI Foundry, Groq, Serper (recommended), and a Google Cloud OAuth client if you want Gmail sending. See `.env.example` for every key.

## Setup

Clone, then set up the backend:

```bash
git clone https://github.com/maneesh-30/OutreachIQ.git
cd OutreachIQ

python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
python -m playwright install chromium   # browser engine for the scraper
```

Copy the env template and fill in your real keys:

```bash
# Windows
copy .env.example .env
# macOS / Linux
cp .env.example .env
```

Open `.env` and set the Azure, Groq, Serper, and (optional) Gmail values. What each key is for is described in `.env.example`.

Build the starter knowledge base from the sample docs in `data/company/` (optional; the app also rebuilds the knowledge base automatically whenever you analyze a site):

```bash
python backend/kb_build.py build
```

## Run

Two servers. Run both, each in its own terminal, with the virtualenv active for the backend.

Backend (port 8000):

```bash
cd backend
uvicorn api:app --reload
```

Frontend (port 5173):

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

Run the frontend on port 5173 specifically. The Gmail OAuth redirect is configured for `localhost:8000` on the backend and the app returns you to `localhost:5173`, so other ports break the sign-in flow.

## Using it

1. On the Setup screen, paste your company URL and click Analyze. Review the extracted profile and ICP and edit anything that is off.
2. Optionally upload your own docs (case studies, decks) so emails can cite real proof.
3. Enter the name to sign emails with, and connect Gmail if you want to send.
4. Start a run: choose how many prospects to find and the geography scope.
5. Watch the live run, then review each prospect's research, fit score, pains, hook, and email. Send from your own Gmail.

## Gmail setup (optional)

To send emails you need a Google Cloud OAuth client:

1. In Google Cloud Console, create an OAuth client of type Web application.
2. Add `http://localhost:8000/api/auth/google/callback` as an authorized redirect URI.
3. Put the client ID and secret in `.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).
4. While the OAuth consent screen is in testing, add each sender's Google address as a test user.

OAuth stores no password. Only a refresh token is saved locally (`backend/gmail_token.json`), and nothing is sent without your review.

## Backend API

- `POST /api/analyze` `{"url": "..."}` analyze a company site and rebuild the knowledge base
- `POST /api/runs` `{"top_n": 3, "scope": "both"}` start a discovery and pipeline batch, returns `run_id`
- `GET  /api/runs` list runs
- `GET  /api/runs/{id}` full detail: prospects, fit, emails, citations, cost split
- `GET  /api/runs/{id}/stream` server-sent live agent events
- `POST /api/company/docs` upload docs into the knowledge base
- `GET  /api/gmail/status`, `GET /api/auth/google`, `POST /api/emails/{id}/send` Gmail connect and send

## Notes

- SQLite database (`backend/outreachiq.db`) and the knowledge-base state (`backend/.kb_state.json`) are created on first use.
- Discovery works best with a Serper key. Without one it falls back to Apify, which is slower.
- The scraper needs a real Chrome install because many sites render their content with JavaScript.
