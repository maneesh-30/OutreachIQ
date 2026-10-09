"""Run the agent pipeline: one prospect, or the top-N discovered prospects.

An optional `emit(event: dict)` callback receives progress events so callers
(the API/SSE layer) can persist + stream live. CLI usage is unchanged.
"""
import json
import sys

from router import Ledger
import agents
from prospector import discover

# Fallback single prospect (stand-in). Used by `python orchestrator.py single`.
PROSPECT = {
    "name": "Brightwheel Labs",
    "domain": "brightwheellabs.com",
    "blurb": (
        "Brightwheel Labs is a Series B B2B SaaS company (~140 employees) offering a "
        "self-serve project collaboration tool for product teams. They recently launched "
        "a freemium tier and are hiring two senior product managers and a growth lead. "
        "Their blog mentions struggling to understand where trial users drop off."
    ),
}


def _noop(_event):
    pass


def run_pipeline(prospect: dict, ledger: Ledger, emit=_noop, verbose: bool = True) -> dict:
    """Full per-prospect chain: research -> fit -> pain -> hook -> email.
    Emits a 'step' event after each agent with its output + the ledger entry.
    """
    out = {"prospect": prospect}

    def step(agent_name, fn):
        emit({"type": "step", "prospect": prospect["name"], "agent": agent_name,
              "status": "running"})
        result = fn()
        last = ledger.steps[-1] if ledger.steps else {}
        emit({"type": "step", "prospect": prospect["name"], "agent": agent_name,
              "status": "done", "output": result, "ledger": last})
        if verbose:
            print(f"  {agent_name}:", json.dumps(result) if not isinstance(result, str) else result)
        return result

    emit({"type": "prospect_start", "prospect": prospect["name"]})
    facts = step("researcher", lambda: agents.researcher(prospect, ledger))
    fit = step("fit_scorer", lambda: agents.fit_scorer(prospect, facts, ledger))
    pains = step("pain_mapper", lambda: agents.pain_mapper(prospect, facts, ledger))
    hook = step("hook_finder", lambda: agents.hook_finder(prospect, facts, ledger))
    email = step("email_drafter", lambda: agents.email_drafter(prospect, pains, hook, ledger))

    out.update({"facts": facts, "fit": fit, "pains": pains, "hook": hook, "email": email})
    emit({"type": "prospect_done", "prospect": prospect["name"], "result": out})
    return out


def run_batch(top_n: int = 3, emit=_noop, source: str = "pool") -> dict:
    ledger = Ledger()
    emit({"type": "discovery_start", "top_n": top_n})
    print(f"Discovering top {top_n} prospects (source={source})...")
    ranked = discover(top_n=top_n, ledger=ledger, source=source)
    emit({"type": "discovered",
          "prospects": [{"name": r["prospect"]["name"], "domain": r["prospect"].get("domain", ""),
                         "score": r["score"], "reason": r["reason"]} for r in ranked]})
    print("Selected:", ", ".join(f"{r['prospect']['name']}({r['score']})" for r in ranked))

    results = []
    for r in ranked:
        res = run_pipeline(r["prospect"], ledger, emit=emit)
        res["discovery_score"] = r["score"]
        results.append(res)

    summary = {"results": results, "cost": ledger.by_provider(),
               "total_cost": ledger.total_cost(), "steps": ledger.steps}
    emit({"type": "run_done", "cost": ledger.by_provider(), "total_cost": ledger.total_cost()})

    print("\n==== BATCH COST ====")
    print("by provider:", ledger.by_provider(), " total $", ledger.total_cost())
    print(f"prospects: {len(results)}  "
          f"avg $/prospect: {ledger.total_cost()/max(len(results),1):.6f}")
    return summary


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "single":
        run_pipeline(PROSPECT, Ledger())
    else:
        n = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 3
        run_batch(top_n=n)
