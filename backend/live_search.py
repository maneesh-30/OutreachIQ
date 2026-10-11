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
SERPER_KEY = os.environ.get("SERPER_API_KEY", "")
ACTOR = "apify~google-search-scraper"
ENDPOINT = f"https://api.apify.com/v2/acts/{ACTOR}/run-sync-get-dataset-items"


def generate_queries(icp: str, ledger: Ledger, n: int = 3, location: str = "") -> list[str]:
    loc = f" in {location}" if location else ""
    prompt = (
        f"We sell to companies matching this ICP:\n{icp}\n\n"
        f"Write {n} plain web-search queries that surface LISTS of REAL individual "
        f"companies{loc} that fit this ICP as potential CUSTOMERS. Rules: natural phrasing, "
        "NO quotation marks, NO boolean operators, 4-8 words each. Avoid vague adjectives "
        "like 'fast' or 'best'. "
        f'Prefer forms like "list of <industry> companies{loc}" or "<segment> startups{loc}". '
        "Return ONLY a JSON array of query strings."
    )
    arr = _json_array(ask_cheap(prompt, agent="query_gen", ledger=ledger, max_tokens=300))
    qs = [q.replace('"', "").strip() for q in arr if isinstance(q, str) and q.strip()][:n]
    return qs or [f"fast growing B2B companies{loc}"]


UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/125.0 Safari/537.36")


def _bing_one(query: str, cc: str) -> list[dict]:
    from bs4 import BeautifulSoup
    try:
        r = requests.get("https://www.bing.com/search",
                         params={"q": query, "count": 10, "cc": cc or "us", "setlang": "en"},
                         headers={"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"},
                         timeout=12)
        if r.status_code != 200:
            return []
        soup = BeautifulSoup(r.text, "lxml")
        out = []
        for li in soup.select("li.b_algo")[:10]:
            a = li.select_one("h2 a")
            if not a:
                continue
            cite = li.select_one("cite")
            url = cite.get_text(" ", strip=True) if cite else (a.get("href") or "")
            cap = li.select_one(".b_caption p") or li.select_one("p")
            out.append({"title": a.get_text(" ", strip=True), "url": url,
                        "description": cap.get_text(" ", strip=True) if cap else ""})
        return out
    except Exception:
        return []


def _apify_google(queries: list[str], country_code: str = "") -> list[dict]:
    if not APIFY_TOKEN:
        return []
    body = {"queries": "\n".join(queries), "resultsPerPage": 10, "maxPagesPerQuery": 1}
    if country_code:
        body["countryCode"] = country_code
    try:
        r = requests.post(f"{ENDPOINT}?token={APIFY_TOKEN}", json=body, timeout=150)
        r.raise_for_status()
    except Exception:
        return []
    out = []
    for serp in r.json():
        for o in serp.get("organicResults", []):
            out.append({"title": o.get("title", ""), "url": o.get("url", ""),
                        "description": o.get("description", "")})
    return out


def web_search(queries: list[str], country_code: str = "") -> list[dict]:
    """Search for prospect lists. Prefers Serper (fast Google SERP API) when a key
    is set, otherwise falls back to the Apify Google Search Scraper (slower)."""
    if SERPER_KEY:
        return _serper(queries, country_code)
    return _apify_google(queries, country_code)


def _serper(queries: list[str], country_code: str = "") -> list[dict]:
    """Google results via serper.dev — fast (~1-2s). Needs SERPER_API_KEY."""
    from concurrent.futures import ThreadPoolExecutor

    def one(q):
        try:
            r = requests.post("https://google.serper.dev/search",
                              headers={"X-API-KEY": SERPER_KEY, "Content-Type": "application/json"},
                              json={"q": q, "gl": country_code or "us", "num": 10}, timeout=15)
            r.raise_for_status()
            return [{"title": o.get("title", ""), "url": o.get("link", ""),
                     "description": o.get("snippet", "")} for o in r.json().get("organic", [])]
        except Exception:
            return []

    results = []
    with ThreadPoolExecutor(max_workers=3) as ex:
        for rs in ex.map(one, queries):
            results.extend(rs)
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
        results = web_search(queries, country_code=country_code)
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
