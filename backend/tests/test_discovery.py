"""Lightweight discovery tests. No API calls — scoring + ICP are stubbed, so this
checks the ranking/selection logic cheaply and deterministically.

Run: python backend/tests/test_discovery.py
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import prospector
from router import Ledger


def test_pool_loads():
    pool = prospector.load_pool()
    assert isinstance(pool, list) and len(pool) >= 10
    names = {c["name"] for c in pool}
    assert "Walmart" in names          # anti-fit present
    assert "Height" in names           # good-fit present
    for c in pool:
        assert {"name", "domain", "blurb"} <= c.keys()


def test_discover_ranks_and_limits(monkeypatch):
    # stub ICP + the batch scoring call so no network calls happen
    import json
    monkeypatch.setattr(prospector, "_icp_summary", lambda ledger: "stub ICP")

    def fake_cheap(prompt, **kw):
        arr = [{"name": c["name"], "score": 90 if "SaaS" in c["blurb"] else 10, "reason": "stub"}
               for c in prospector.load_pool()]
        return json.dumps(arr)

    monkeypatch.setattr(prospector, "ask_cheap", fake_cheap)

    ranked = prospector.discover(top_n=3, ledger=Ledger())
    assert len(ranked) == 3
    scores = [r["score"] for r in ranked]
    assert scores == sorted(scores, reverse=True)   # sorted desc
    assert scores[0] == 90                           # best first


# tiny monkeypatch shim so this runs without pytest installed
class _MP:
    def __init__(self):
        self._undo = []

    def setattr(self, obj, name, val):
        self._undo.append((obj, name, getattr(obj, name)))
        setattr(obj, name, val)

    def undo(self):
        for obj, name, val in reversed(self._undo):
            setattr(obj, name, val)


if __name__ == "__main__":
    test_pool_loads()
    mp = _MP()
    try:
        test_discover_ranks_and_limits(mp)
    finally:
        mp.undo()
    print("discovery tests passed")
