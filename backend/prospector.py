"""Discovery: find fitting prospects from the seed pool, ranked against OUR ICP.

ICP is pulled ONCE from the Foundry knowledge base (grounded). The whole pool is
then scored in a SINGLE cheap-model call (batch) — fast, and well under the free
Groq token-per-minute limit that many small calls would blow through.
"""
from __future__ import annotations

import json
import pathlib

from router import ask_cheap, ask_kb, Ledger

POOL = pathlib.Path(__file__).resolve().parent.parent / "data" / "prospects" / "pool.json"


def load_pool() -> list[dict]:
    return json.loads(POOL.read_text(encoding="utf-8"))


def _icp_summary(ledger: Ledger) -> str:
    text, _ = ask_kb(
        "Summarize OUR Ideal Customer Profile from the knowledge base in 4-6 short "
        "bullets: industry, size, stage, growth signals, anti-signals. Be concise.",
        agent="prospector_icp", ledger=ledger,
    )
    return text


def _json_array(text: str) -> list:
    """Extract the first balanced JSON array from a model reply."""
    try:
        v = json.loads(text)
        return v if isinstance(v, list) else []
    except Exception:
        pass
    start = text.find("[")
    if start != -1:
        depth = 0
        for i in range(start, len(text)):
            if text[i] == "[":
                depth += 1
            elif text[i] == "]":
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start:i + 1])
                    except Exception:
                        break
    return []


def _score_companies(companies: list[dict], icp: str, ledger: Ledger) -> list[dict]:
    """Batch-score a list of companies against the ICP in one cheap-model call."""
    if not companies:
        return []
    listing = "\n".join(f"{i+1}. {c['name']} — {c.get('blurb','')}" for i, c in enumerate(companies))
    prompt = (
        "Score how well EACH company matches the ICP below, 0-100, with a one-line reason. "
        "Return ONLY a JSON array, one object per company IN THE SAME ORDER as listed: "
        '[{"name": str, "score": int, "reason": str}, ...].\n\n'
        f"ICP:\n{icp}\n\nCompanies:\n{listing}"
    )
    rows = _json_array(ask_cheap(prompt, agent="prospector_score", ledger=ledger,
                                 system="You are a precise B2B qualification analyst. Output only a JSON array.",
                                 max_tokens=2000))
    by_name = {str(r.get("name", "")).lower(): r for r in rows if isinstance(r, dict)}
    scored = []
    for i, c in enumerate(companies):
        r = by_name.get(c["name"].lower()) or (rows[i] if i < len(rows) and isinstance(rows[i], dict) else {})
        scored.append({"prospect": c, "score": int(r.get("score", 0) or 0),
                       "reason": r.get("reason", "")})
    return scored


def discover(top_n: int = 3, ledger: Ledger | None = None, source: str = "pool"):
    """Returns (ranked, source_used). source_used is 'pool', 'live', or 'live→pool'
    when a live search was requested but yielded nothing and the pool was used."""
    ledger = ledger or Ledger()
    icp = _icp_summary(ledger)

    companies = []
    used = source
    if source == "live":
        from live_search import live_companies
        companies = live_companies(icp, ledger, want=max(top_n * 3, 8))
        if not companies:
            used = "live→pool"
    if not companies:
        companies = load_pool()

    scored = _score_companies(companies, icp, ledger)
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_n], used


if __name__ == "__main__":
    import sys
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    led = Ledger()
    ranked, used = discover(top_n=n, ledger=led, source=(sys.argv[2] if len(sys.argv) > 2 else "pool"))
    print(f"\nTop {n} prospects (source={used}):")
    for i, r in enumerate(ranked, 1):
        print(f"{i:>2}. {r['score']:>3}  {r['prospect']['name']:<22} {r['reason']}")
    print("\ndiscovery cost by provider:", led.by_provider(), " total $", led.total_cost())
