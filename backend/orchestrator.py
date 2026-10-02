"""Run the agent pipeline: on one prospect, or on the top-N discovered prospects."""
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


def run_pipeline(prospect: dict, ledger: Ledger, verbose: bool = True) -> dict:
    """Full per-prospect chain: research -> fit -> pain -> hook -> email."""
    def log(*a):
        if verbose:
            print(*a)

    log(f"\n=== {prospect['name']} ===")
    facts = agents.researcher(prospect, ledger)
    log("  researcher:", json.dumps(facts))
    fit = agents.fit_scorer(prospect, facts, ledger)
    log("  fit:", json.dumps(fit))
    pains = agents.pain_mapper(prospect, facts, ledger)
    log("  pains:", json.dumps(pains))
    hook = agents.hook_finder(prospect, facts, ledger)
    log("  hook:", hook)
    email = agents.email_drafter(prospect, pains, hook, ledger)
    log("  EMAIL:", email.get("subject", ""))
    log("  " + email.get("body", email.get("_raw", "")).replace("\n", "\n  "))

    return {"prospect": prospect, "facts": facts, "fit": fit,
            "pains": pains, "hook": hook, "email": email}


def run_batch(top_n: int = 3) -> list[dict]:
    ledger = Ledger()
    print(f"Discovering top {top_n} prospects...")
    ranked = discover(top_n=top_n, ledger=ledger)
    print("Selected:", ", ".join(f"{r['prospect']['name']}({r['score']})" for r in ranked))

    results = []
    for r in ranked:
        out = run_pipeline(r["prospect"], ledger)
        out["discovery_score"] = r["score"]
        results.append(out)

    print("\n==== BATCH COST ====")
    print("by provider:", ledger.by_provider(), " total $", ledger.total_cost())
    print(f"prospects: {len(results)}  "
          f"avg $/prospect: {ledger.total_cost()/max(len(results),1):.6f}")
    return results


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "single":
        run_pipeline(PROSPECT, Ledger())
    else:
        n = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 3
        run_batch(top_n=n)
