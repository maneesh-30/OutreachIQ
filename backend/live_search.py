"""Live prospect discovery via Apify Google Search, with geo scoping.

ICP (+ optional location) -> search queries -> Apify Google Search Scraper ->
organic results -> LLM extracts real prospect companies {name, domain, blurb,
country}. Each company is tagged region = local | international.

scope:
  local         -> only the company's own country
  international -> global (no country bias)
  both          -> ~60% local, ~40% international (default)
"""
from __future__ import annotations

import math
import os

import requests

from router import ask_cheap, Ledger
from prospector import _json_array

APIFY_TOKEN = os.environ.get("APIFY_TOKEN", "")
ACTOR = "apify~google-search-scraper"
ENDPOINT = f"https://api.apify.com/v2/acts/{ACTOR}/run-sync-get-dataset-items"


def generate_queries(icp: str, ledger: Ledger, n: int = 3, location: str = "") -> list[str]:
    loc = f" located in {location}" if location else ""
    prompt = (
        f"We sell to companies matching this ICP:\n{icp}\n\n"
        f"Write {n} plain Google search queries that surface LISTS of REAL individual "
        f"companies{loc} that fit this ICP as potential CUSTOMERS. Rules: natural phrasing, "
        "NO quotation marks, NO boolean operators, 4-8 words each. "
        f'Prefer forms like "fast growing <industry> companies{loc}". '
        "Return ONLY a JSON array of query strings."
    )
    arr = _json_array(ask_cheap(prompt, agent="query_gen", ledger=ledger, max_tokens=300))
    qs = [q.replace('"', "").strip() for q in arr if isinstance(q, str) and q.strip()][:n]
    return qs or [f"fast growing B2B companies{loc}"]


def apify_search(queries: list[str], country_code: str = "") -> list[dict]:
    if not APIFY_TOKEN:
        raise RuntimeError("APIFY_TOKEN not set")
    body = {"queries": "\n".join(queries), "resultsPerPage": 10, "maxPagesPerQuery": 1}
    if country_code:
        body["countryCode"] = country_code
    r = requests.post(f"{ENDPOINT}?token={APIFY_TOKEN}", json=body, timeout=150)
    r.raise_for_status()
    results = []
    for serp in r.json():
        for o in serp.get("organicResults", []):
            results.append({"title": o.get("title", ""), "url": o.get("url", ""),
                            "description": o.get("description", "")})
    return results


def extract_companies(results: list[dict], icp: str, ledger: Ledger, want: int,
                      hint_country: str = "") -> list[dict]:
    listing = "\n".join(f"- {r['title']} | {r['url']} | {r['description']}" for r in results)
    prompt = (
        f"From these Google results, extract up to {want} REAL individual companies that "
        "match our ICP as potential customers. Use the company's own domain. IGNORE blog "
        "posts, listicles ('top N ...'), directories, review sites, and vendor tools. "
        'Return ONLY a JSON array: [{"name": str, "domain": str, "blurb": str, "country": str}].'
        f"{(' Most are based in ' + hint_country + '.') if hint_country else ''}\n\n"
        f"ICP:\n{icp}\n\nResults:\n{listing}"
    )
    arr = _json_array(ask_cheap(prompt, agent="company_extract", ledger=ledger, max_tokens=1300))
    out, seen = [], set()
    for c in arr:
        if not isinstance(c, dict):
            continue
        dom = str(c.get("domain", "")).lower().replace("https://", "").replace("http://", "").strip("/")
        name = str(c.get("name", "")).strip()
        if not name or dom in seen:
            continue
        seen.add(dom)
        out.append({"name": name, "domain": dom, "blurb": c.get("blurb", ""),
                    "country": c.get("country", hint_country)})
    return out


def _search_tag(icp, ledger, want, region, location, country_code):
    try:
        queries = generate_queries(icp, ledger, location=location)
        results = apify_search(queries, country_code=country_code)
        if not results:
            return []
        comps = extract_companies(results, icp, ledger, want, hint_country=location)
        for c in comps:
            c["region"] = region
        return comps[:want]
    except Exception:
        return []


def live_companies(icp: str, ledger: Ledger, want: int = 10, *,
                   country: str = "", country_code: str = "", scope: str = "both") -> list[dict]:
    """Returns tagged companies ([] on total failure -> caller falls back to pool)."""
    if scope == "local":
        return _search_tag(icp, ledger, want, "local", country, country_code)
    if scope == "international":
        return _search_tag(icp, ledger, want, "international", "", "")

    # both: ~60% local, ~40% international
    local_want = max(1, math.ceil(want * 0.6))
    intl_want = max(1, want - local_want)
    local = _search_tag(icp, ledger, local_want, "local", country, country_code) if country else []
    intl = _search_tag(icp, ledger, intl_want, "international", "", "")
    seen = {c["domain"] for c in local}
    merged = local + [c for c in intl if c["domain"] not in seen]
    return merged or local or intl
