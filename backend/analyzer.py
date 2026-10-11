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
  "country": str,                    // HQ country name, "" if not stated
  "country_code": str,               // ISO 3166-1 alpha-2 lowercase (e.g. us, gb, in), "" if unknown
  "what_you_sell": str,              // 2-3 sentences
  "value_props": [ {"title": str, "desc": str} ],   // 3 items
  "icp": {
    "industry": str, "company_size": str, "stage": str,
    "geography": str, "signals": str, "anti_signals": str
  }
}
Infer the HQ country carefully from ANY of: a street address, the footer, a phone
country code (e.g. +91 = India, +44 = UK), the currency on pricing (₹/INR = India,
£ = UK, € = EU), "based in"/"headquartered in" text, or an obvious regional focus.
If genuinely unknown, use "" for country and country_code (do NOT guess the US).
Infer the ICP (who they likely sell TO) from what they do. Be concise and specific.

WEBSITE TEXT:
"""

# crude TLD -> ISO country fallback when the site doesn't state a location
TLD_COUNTRY = {
    "uk": ("United Kingdom", "gb"), "co.uk": ("United Kingdom", "gb"),
    "in": ("India", "in"), "de": ("Germany", "de"), "fr": ("France", "fr"),
    "ca": ("Canada", "ca"), "au": ("Australia", "au"), "nl": ("Netherlands", "nl"),
    "sg": ("Singapore", "sg"), "ie": ("Ireland", "ie"), "es": ("Spain", "es"),
    "it": ("Italy", "it"), "br": ("Brazil", "br"), "jp": ("Japan", "jp"),
}


def _tld_fallback(domain: str):
    parts = domain.lower().split(".")
    for key in (".".join(parts[-2:]), parts[-1]):
        if key in TLD_COUNTRY:
            return TLD_COUNTRY[key]
    return ("", "")


def analyze(url: str, ledger: Ledger | None = None) -> dict:
    import time
    ledger = ledger or Ledger()
    t0 = time.time()
    site = fetch_site(url)
    t1 = time.time()
    raw = ask_smart(PROMPT + site["text"], agent="self_analyzer", ledger=ledger,
                    system="You are a precise B2B analyst. Output only JSON.",
                    max_tokens=900)
    t2 = time.time()
    print(f"[analyze] scrape={t1-t0:.1f}s  llm={t2-t1:.1f}s  ({site['pages_fetched']} pages)")
    profile = _json(raw)
    profile.setdefault("company_name", site["title"])
    # fill country from TLD if the model couldn't find one (leave blank if still unknown)
    if not profile.get("country_code"):
        from urllib.parse import urlparse
        country, code = _tld_fallback(urlparse(site["url"]).netloc)
        if code:
            profile["country"] = profile.get("country") or country
            profile["country_code"] = code
        else:
            profile.setdefault("country", "")
            profile["country_code"] = ""
    profile["source_url"] = site["url"]
    profile["_site_text"] = site["text"]
    profile["_pages_fetched"] = site["pages_fetched"]
    return profile


if __name__ == "__main__":
    import sys
    p = analyze(sys.argv[1] if len(sys.argv) > 1 else "vercel.com")
    p.pop("_site_text", None)
    print(json.dumps(p, indent=2))
