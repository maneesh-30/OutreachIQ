"""Agents. Each takes a prospect (+ prior results) and returns structured output.
Model choice per agent encodes the orchestration thesis:
  researcher / hook  -> cheap (Featherless)
  fit / pain / email -> smart + KB-grounded (Azure)
"""
from __future__ import annotations

import json
import re

from router import ask_cheap, ask_smart, ask_kb, Ledger


def _json(text: str) -> dict:
    """Best-effort JSON extraction from a model reply."""
    m = re.search(r"\{.*\}", text, re.DOTALL)
    try:
        return json.loads(m.group(0) if m else text)
    except Exception:
        return {"_raw": text}


def researcher(prospect: dict, ledger: Ledger) -> dict:
    """Cheap model: turn a raw prospect blurb into structured facts."""
    prompt = (
        "Extract facts about this company as JSON with keys: "
        "industry, size_estimate, what_they_do, growth_signals (list). "
        "Only use the text given; use \"unknown\" if absent.\n\n"
        f"Company: {prospect['name']}\nDomain: {prospect.get('domain','')}\n"
        f"Description: {prospect['blurb']}"
    )
    out = ask_cheap(prompt, agent="researcher", ledger=ledger,
                    system="You are a precise B2B research analyst. Output only JSON.")
    return _json(out)


def fit_scorer(prospect: dict, facts: dict, ledger: Ledger) -> dict:
    """KB-grounded: score prospect against OUR ICP (stored in the knowledge base)."""
    prompt = (
        "Using OUR Ideal Customer Profile from the knowledge base, score this "
        "prospect's fit 0-100 and justify in one sentence. "
        "Return JSON: {\"score\": int, \"reason\": str}.\n\n"
        f"Prospect: {prospect['name']}\nFacts: {json.dumps(facts)}"
    )
    text, cites = ask_kb(prompt, agent="fit_scorer", ledger=ledger)
    d = _json(text)
    d["sources"] = cites
    return d


def pain_mapper(prospect: dict, facts: dict, ledger: Ledger) -> dict:
    """KB-grounded: map the prospect's likely pains to OUR proof (case studies/product)."""
    prompt = (
        "Based on OUR product and case studies in the knowledge base, identify the "
        "top 2 problems this prospect likely has that WE solve, and name the single "
        "most relevant case study as proof. "
        "Return JSON: {\"pains\": [str, str], \"proof_case_study\": str}.\n\n"
        f"Prospect: {prospect['name']}\nFacts: {json.dumps(facts)}"
    )
    text, cites = ask_kb(prompt, agent="pain_mapper", ledger=ledger)
    d = _json(text)
    d["sources"] = cites
    return d


def hook_finder(prospect: dict, facts: dict, ledger: Ledger) -> str:
    """Cheap model: pick the single best personalization angle."""
    prompt = (
        "Give ONE short personalization hook (max 12 words) for a cold email to "
        f"{prospect['name']}, based on these facts: {json.dumps(facts)}. "
        "Reply with the hook text only, no quotes."
    )
    return ask_cheap(prompt, agent="hook_finder", ledger=ledger, max_tokens=40)


def email_drafter(prospect: dict, pains: dict, hook: str, ledger: Ledger) -> dict:
    """KB-grounded: write the outreach email in OUR voice (sample emails in KB)."""
    prompt = (
        "Write a cold outreach email to the prospect, matching the TONE and STRUCTURE "
        "of OUR winning sample emails in the knowledge base (short, 3 short paragraphs, "
        "one named proof point, one low-friction question, no attachments). "
        "Use the hook and pains provided. Cite the proof case study naturally. "
        "Return JSON: {\"subject\": str, \"body\": str}.\n\n"
        f"Prospect: {prospect['name']}\nHook: {hook}\n"
        f"Pains: {json.dumps(pains.get('pains', []))}\n"
        f"Proof: {pains.get('proof_case_study','')}"
    )
    text, cites = ask_kb(prompt, agent="email_drafter", ledger=ledger)
    d = _json(text)
    d["sources"] = cites
    return d
