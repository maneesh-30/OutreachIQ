"""Self-analyzer: turn a company's scraped website into a structured profile
(what they sell, value props, inferred ICP) using the Azure smart model.
"""
from __future__ import annotations

import json

from router import ask_smart, Ledger
from agents import _json
from scraper import fetch_site

PROMPT = """From the company website text below, produce a JSON profile of THIS company
(the one selling), to power a B2B outreach tool. Return ONLY JSON:
{
  "company_name": str,
  "what_you_sell": str,              // 2-3 sentences
  "value_props": [ {"title": str, "desc": str} ],   // 3 items
  "icp": {
    "industry": str, "company_size": str, "stage": str,
    "geography": str, "signals": str, "anti_signals": str
  }
}
Infer the ICP (who they likely sell TO) from what they do. Be concise and specific.

WEBSITE TEXT:
"""


def analyze(url: str, ledger: Ledger | None = None) -> dict:
    ledger = ledger or Ledger()
    site = fetch_site(url)
    raw = ask_smart(PROMPT + site["text"], agent="self_analyzer", ledger=ledger,
                    system="You are a precise B2B analyst. Output only JSON.",
                    max_tokens=900)
    profile = _json(raw)
    profile.setdefault("company_name", site["title"])
    profile["source_url"] = site["url"]
    profile["_site_text"] = site["text"]
    profile["_pages_fetched"] = site["pages_fetched"]
    return profile


if __name__ == "__main__":
    import sys
    p = analyze(sys.argv[1] if len(sys.argv) > 1 else "vercel.com")
    p.pop("_site_text", None)
    print(json.dumps(p, indent=2))
