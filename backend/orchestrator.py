"""Phase 2: run the full agent pipeline on one prospect, in the terminal."""
import json

from router import Ledger
import agents

# Hardcoded prospect (stand-in for discovery output). A plausible Acme Analytics target.
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


def run(prospect: dict) -> dict:
    ledger = Ledger()
    print(f"\n=== Prospect: {prospect['name']} ===")

    print("[1/5] researcher (cheap)...")
    facts = agents.researcher(prospect, ledger)
    print("   ", json.dumps(facts))

    print("[2/5] fit_scorer (smart+KB)...")
    fit = agents.fit_scorer(prospect, facts, ledger)
    print("   ", json.dumps(fit))

    print("[3/5] pain_mapper (smart+KB)...")
    pains = agents.pain_mapper(prospect, facts, ledger)
    print("   ", json.dumps(pains))

    print("[4/5] hook_finder (cheap)...")
    hook = agents.hook_finder(prospect, facts, ledger)
    print("   ", hook)

    print("[5/5] email_drafter (smart+KB)...")
    email = agents.email_drafter(prospect, pains, hook, ledger)

    print("\n--- EMAIL ---")
    print("Subject:", email.get("subject", "(none)"))
    print(email.get("body", email.get("_raw", "")))
    print("Sources:", email.get("sources", []))

    print("\n--- COST ---")
    print("per step:")
    for s in ledger.steps:
        print(f"   {s['agent']:<13} {s['provider']:<12} "
              f"in={s['tokens_in']:<6} out={s['tokens_out']:<6} ${s['cost']:.6f}")
    print("by provider:", ledger.by_provider())
    print("total: $", ledger.total_cost())

    return {"facts": facts, "fit": fit, "pains": pains, "hook": hook,
            "email": email, "cost": ledger.by_provider(), "steps": ledger.steps}


if __name__ == "__main__":
    run(PROSPECT)
