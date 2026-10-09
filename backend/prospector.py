"""Discovery: find fitting prospects from the seed pool, ranked against OUR ICP.

ICP is pulled ONCE from the Foundry knowledge base (grounded), then each pool
company is scored by the cheap model (bulk) — the orchestration thesis applied
to discovery.
"""
from __future__ import annotations

import json
import pathlib

from router import ask_cheap, ask_kb, Ledger
from agents import _json

POOL = pathlib.Path(__file__).resolve().parent.parent / "data" / "prospects" / "pool.json"


def load_pool() -> list[dict]:
    return json.loads(POOL.read_text(encoding="utf-8"))


def _icp_summary(ledger: Ledger) -> str:
    text, _ = ask_kb(
        "Summarize OUR Ideal Customer Profile from the knowledge base in 4-6 bullet "
        "points: industry, size, stage, growth signals, and clear anti-signals.",
        agent="prospector_icp", ledger=ledger,
    )
    return text


def _score_one(company: dict, icp: str, ledger: Ledger) -> dict:
    prompt = (
        "Score how well this company matches the ICP below, 0-100, and give a one-line "
        "reason. Return JSON: {\"score\": int, \"reason\": str}.\n\n"
        f"ICP:\n{icp}\n\n"
        f"Company: {company['name']}\nDescription: {company['blurb']}"
    )
    d = _json(ask_cheap(prompt, agent="prospector_score", ledger=ledger,
                        system="You are a precise B2B qualification analyst. Output only JSON.",
                        max_tokens=400))
    return {"prospect": company, "score": int(d.get("score", 0)), "reason": d.get("reason", "")}


def discover(top_n: int = 3, ledger: Ledger | None = None) -> list[dict]:
    ledger = ledger or Ledger()
    pool = load_pool()
    icp = _icp_summary(ledger)
    scored = [_score_one(c, icp, ledger) for c in pool]
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_n]


if __name__ == "__main__":
    import sys
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    led = Ledger()
    ranked = discover(top_n=n, ledger=led)
    print(f"\nTop {n} prospects:")
    for i, r in enumerate(ranked, 1):
        print(f"{i:>2}. {r['score']:>3}  {r['prospect']['name']:<22} {r['reason']}")
    print("\ndiscovery cost by provider:", led.by_provider(), " total $", led.total_cost())
