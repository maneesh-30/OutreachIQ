"""Fetch a company's website and extract readable text.

Uses a local headless Chromium (Playwright) so JavaScript is rendered — modern
single-page company sites (React/Vue) read correctly — and it's fast and reliable
(no external crawler latency). Reads the homepage plus a couple of key pages.
"""
from __future__ import annotations

import re
from urllib.parse import urljoin, urlparse

SUBPATHS = ["about", "pricing"]
MAX_CHARS = 9000
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/125.0 Safari/537.36")
NAV_TIMEOUT = 15000   # ms per page
IDLE_TIMEOUT = 4000   # ms extra wait for SPA content


def _normalize(url: str) -> str:
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url.rstrip("/")


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def fetch_site(url: str) -> dict:
    from playwright.sync_api import sync_playwright

    base = _normalize(url)
    host = urlparse(base).netloc
    texts, title, pages = [], host, 0

    def render(page, u: str) -> str:
        page.goto(u, wait_until="domcontentloaded", timeout=NAV_TIMEOUT)
        try:
            page.wait_for_load_state("networkidle", timeout=IDLE_TIMEOUT)
        except Exception:
            pass
        return _clean(page.evaluate("() => document.body ? document.body.innerText : ''"))

    with sync_playwright() as pw:
        # use the system-installed Google Chrome (no Playwright browser download)
        try:
            browser = pw.chromium.launch(headless=True, channel="chrome")
        except Exception:
            browser = pw.chromium.launch(headless=True)
        ctx = browser.new_context(user_agent=UA)
        page = ctx.new_page()
        try:
            # homepage (with a www toggle retry)
            home = ""
            for cand in (base, _www_toggle(base)):
                try:
                    home = render(page, cand)
                    if len(home) > 50:
                        base = cand.rstrip("/"); host = urlparse(base).netloc
                        title = page.title() or host
                        break
                except Exception:
                    continue
            if len(home) > 50:
                texts.append(home); pages += 1

            # a couple of key subpages
            for sub in SUBPATHS:
                if sum(len(t) for t in texts) >= MAX_CHARS:
                    break
                u = urljoin(base + "/", sub)
                if urlparse(u).netloc != host:
                    continue
                try:
                    t = render(page, u)
                    if len(t) > 200:
                        texts.append(t); pages += 1
                except Exception:
                    pass
        finally:
            browser.close()

    text = " ".join(texts)[:MAX_CHARS]
    if len(text) < 50:
        raise RuntimeError("couldn't read this site (it may block automated browsers) — try another URL")
    return {"url": base, "title": title, "text": text, "pages_fetched": pages}


def _www_toggle(base: str) -> str:
    scheme, rest = base.split("://", 1)
    return f"{scheme}://www.{rest}" if not rest.startswith("www.") else f"{scheme}://{rest[4:]}"


if __name__ == "__main__":
    import sys, json
    print(json.dumps({k: (v[:300] if k == "text" else v) for k, v in fetch_site(sys.argv[1]).items()}, indent=2))
