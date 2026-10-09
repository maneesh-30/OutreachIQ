"""Live prospect discovery via Apify Google Search.

ICP -> search queries -> Apify Google Search Scraper -> organic results ->
LLM extracts real prospect companies {name, domain, blurb}. Noisy results
(listicles, blogs, directories, the seller's own competitors) are filtered out.
"""
from __future__ import annotations

import json
import os

import requests

from router import ask_cheap, Ledger
from prospector import _json_array

APIFY_TOKEN = os.environ.get("APIFY_TOKEN", "")
ACTOR = "apify~google-search-scraper"
ENDPOINT = f"https://api.apify.com/v2/acts/{ACTOR}/run-sync-get-dataset-items"


def generate_queries(icp: str, ledger: Ledger, n: int = 3) -> list[str]:
    prompt = (
        f"We sell to companies matching this ICP:\n{icp}\n\n"
        f"Write {n} plain Google search queries that surface LISTS of REAL individual "
        "companies that fit this ICP as potential CUSTOMERS. Rules: natural phrasing, "
        "NO quotation marks, NO boolean operators (AND/OR), 4-8 words each. Prefer forms "
        'like "fast growing <industry> companies" or "top <segment> startups <year>". '
        "Return ONLY a JSON array of query strings."
    )
    arr = _json_array(ask_cheap(prompt, agent="query_gen", ledger=ledger, max_tokens=300))
    qs = [q.replace('"', "").strip() for q in arr if isinstance(q, str) and q.strip()][:n]
    return qs or ["fast growing B2B SaaS companies"]


def apify_search(queries: list[str]) -> list[dict]:
    if not APIFY_TOKEN:
        raise RuntimeError("APIFY_TOKEN not set")
    body = {
        "queries": "\n".join(queries),
        "resultsPerPage": 10,
        "maxPagesPerQuery": 1,
        "countryCode": "us",
    }
    r = requests.post(f"{ENDPOINT}?token={APIFY_TOKEN}", json=body, timeout=150)
    r.raise_for_status()
    results = []
    for serp in r.json():
        for o in serp.get("organicResults", []):
            results.append({"title": o.get("title", ""), "url": o.get("url", ""),
                            "description": o.get("description", "")})
    return results


def extract_companies(results: list[dict], icp: str, ledger: Ledger, want: int) -> list[dict]:
    listing = "\n".join(f"- {r['title']} | {r['url']} | {r['description']}" for r in results)
    prompt = (
        "From these Google results, extract up to "
        f"{want} REAL individual companies that match our ICP as potential customers. "
        "Use the company's own domain. IGNORE blog posts, listicles ('top N ...'), "
        "directories, review sites, and pure analytics/vendor tools. "
        'Return ONLY a JSON array: [{"name": str, "domain": str, "blurb": str}].\n\n'
        f"ICP:\n{icp}\n\nResults:\n{listing}"
    )
    arr = _json_array(ask_cheap(prompt, agent="company_extract", ledger=ledger, max_tokens=1200))
    out = []
    seen = set()
    for c in arr:
        if not isinstance(c, dict):
            continue
        dom = str(c.get("domain", "")).lower().replace("https://", "").replace("http://", "").strip("/")
        name = str(c.get("name", "")).strip()
        if not name or dom in seen:
            continue
        seen.add(dom)
        out.append({"name": name, "domain": dom, "blurb": c.get("blurb", "")})
    return out


def live_companies(icp: str, ledger: Ledger, want: int = 10) -> list[dict]:
    """Full live path. Returns [] on any failure so the caller can fall back to the pool."""
    try:
        queries = generate_queries(icp, ledger)
        results = apify_search(queries)
        if not results:
            return []
        return extract_companies(results, icp, ledger, want)
    except Exception:
        return []
