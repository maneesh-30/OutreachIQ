"""Fetch a company's website and extract readable text.

Grabs the homepage plus a few likely-informative pages (about/product/pricing/...),
strips boilerplate, and returns concatenated text capped to a sane size.
"""
from __future__ import annotations

import re
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "Mozilla/5.0 (OutreachIQ research bot)"}
SUBPATHS = ["about", "product", "products", "platform", "features", "pricing", "solutions", "customers"]
MAX_CHARS = 12000
TIMEOUT = 12


def _normalize(url: str) -> str:
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url.rstrip("/")


def _page_text(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "nav", "footer", "header", "noscript", "svg"]):
        tag.decompose()
    text = soup.get_text(" ", strip=True)
    return re.sub(r"\s+", " ", text)


def fetch_site(url: str) -> dict:
    """Return {url, title, text, pages_fetched}."""
    base = _normalize(url)
    host = urlparse(base).netloc
    collected = []
    title = host
    pages = 0

    def grab(u):
        nonlocal title, pages
        try:
            r = requests.get(u, headers=HEADERS, timeout=TIMEOUT)
            if r.status_code != 200 or "text/html" not in r.headers.get("content-type", ""):
                return ""
            pages += 1
            soup = BeautifulSoup(r.text, "lxml")
            if u == base and soup.title and soup.title.string:
                title = soup.title.string.strip()
            return _page_text(r.text)
        except Exception:
            return ""

    home = grab(base)
    if not home:
        raise RuntimeError(f"Could not fetch {base}")
    collected.append(home)

    # follow a few likely-informative subpages on the same host
    for sub in SUBPATHS:
        if sum(len(c) for c in collected) >= MAX_CHARS:
            break
        u = urljoin(base + "/", sub)
        if urlparse(u).netloc != host:
            continue
        t = grab(u)
        if t and len(t) > 200:
            collected.append(t)

    text = " ".join(collected)[:MAX_CHARS]
    return {"url": base, "title": title, "text": text, "pages_fetched": pages}


if __name__ == "__main__":
    import sys, json
    print(json.dumps({k: (v[:300] if k == "text" else v)
                      for k, v in fetch_site(sys.argv[1]).items()}, indent=2))
