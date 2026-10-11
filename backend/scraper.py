"""Fetch a company's website and extract readable text.

Uses Apify's website-content-crawler, which renders JavaScript — so modern
single-page apps (React/Vue sites) are read correctly, unlike a plain HTTP GET.
Returns homepage + a couple of key pages, concatenated and capped.
"""
from __future__ import annotations

import os
import time
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
    items = None
    last_kind = ""
    for attempt in range(2):
        try:
            r = requests.post(f"{ENDPOINT}?token={APIFY_TOKEN}", json=body, timeout=180)
            r.raise_for_status()
            items = r.json()
            break
        except requests.exceptions.ConnectionError:
            last_kind = "network"
        except requests.exceptions.Timeout:
            last_kind = "timeout"
        except Exception:  # noqa: BLE001
            last_kind = "crawler"
        if attempt == 0:
            time.sleep(1.5)
    if items is None:
        if last_kind == "network":
            raise RuntimeError("couldn't reach the web crawler — check your internet connection and try again")
        if last_kind == "timeout":
            raise RuntimeError("the site took too long to read — try again")
        raise RuntimeError("couldn't read this site right now — try again")

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
