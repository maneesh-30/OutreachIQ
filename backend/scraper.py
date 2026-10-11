"""Fetch a company's website and extract readable text.

Uses Apify's website-content-crawler, which renders JavaScript — so modern
single-page apps (React/Vue sites) are read correctly, unlike a plain HTTP GET.
Returns homepage + a couple of key pages, concatenated and capped.
"""
from __future__ import annotations

import os
from urllib.parse import urlparse

import requests
from dotenv import load_dotenv

load_dotenv()

APIFY_TOKEN = os.environ.get("APIFY_TOKEN", "")
ACTOR = "apify~website-content-crawler"
ENDPOINT = f"https://api.apify.com/v2/acts/{ACTOR}/run-sync-get-dataset-items"
MAX_CHARS = 9000


def _normalize(url: str) -> str:
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url.rstrip("/")


def fetch_site(url: str) -> dict:
    """Return {url, title, text, pages_fetched}."""
    base = _normalize(url)
    if not APIFY_TOKEN:
        raise RuntimeError("APIFY_TOKEN not set")

    body = {
        "startUrls": [{"url": base}],
        "crawlerType": "playwright:adaptive",  # renders JS; adaptive = fast when possible
        "maxCrawlPages": 3,
        "maxCrawlDepth": 1,
        "maxResults": 3,
        "readableTextCharThreshold": 50,
        "proxyConfiguration": {"useApifyProxy": True},
    }
    try:
        r = requests.post(f"{ENDPOINT}?token={APIFY_TOKEN}", json=body, timeout=180)
        r.raise_for_status()
        items = r.json()
    except Exception as e:  # noqa: BLE001
        raise RuntimeError(f"could not fetch {base}: {e}")

    host = urlparse(base).netloc
    texts, title, pages = [], host, 0
    for it in items:
        t = (it.get("text") or "").strip()
        if t:
            texts.append(t)
            pages += 1
        if title == host:
            title = ((it.get("metadata") or {}).get("title") or title)

    text = " ".join(texts)[:MAX_CHARS]
    if len(text) < 50:
        raise RuntimeError(f"{base} returned no readable content (site may block crawlers)")
    return {"url": base, "title": title, "text": text, "pages_fetched": pages}


if __name__ == "__main__":
    import sys, json
    print(json.dumps({k: (v[:300] if k == "text" else v) for k, v in fetch_site(sys.argv[1]).items()}, indent=2))
