"""Model router: single interface for all agents.

- ask_cheap  -> Groq (bulk: fetch/summarize/extract)
- ask_smart  -> Azure gpt-4.1-mini (judgment: score/reason/write)
- ask_kb     -> Azure Responses API + file_search (grounded in the Foundry KB)

Every call records tokens + estimated cost into a run-level Ledger so the
dashboard can show the Azure-vs-Groq split.
"""
from __future__ import annotations

import json
import pathlib
from dataclasses import dataclass, field

from config import foundry_client, cheap_client, AZURE_CHAT_DEPLOYMENT, CHEAP_MODEL

# rough USD per 1M tokens (edit to match current pricing)
PRICING = {
    "azure": {"in": 0.40, "out": 1.60},
    "groq": {"in": 0.0, "out": 0.0},  # free tier -> treat as free
}

_KB_STATE = pathlib.Path(__file__).resolve().parent / ".kb_state.json"


def _vector_store_id() -> str:
    return json.loads(_KB_STATE.read_text())["vector_store_id"]


@dataclass
class Ledger:
    """Accumulates usage across one pipeline run."""
    steps: list = field(default_factory=list)

    def add(self, agent, provider, model, pin, pout):
        rate = PRICING[provider]
        cost = pin / 1e6 * rate["in"] + pout / 1e6 * rate["out"]
        self.steps.append(
            {"agent": agent, "provider": provider, "model": model,
             "tokens_in": pin, "tokens_out": pout, "cost": round(cost, 6)}
        )
        return cost

    def total_cost(self):
        return round(sum(s["cost"] for s in self.steps), 6)

    def by_provider(self):
        out = {}
        for s in self.steps:
            out[s["provider"]] = round(out.get(s["provider"], 0) + s["cost"], 6)
        return out


def ask_cheap(prompt: str, *, agent: str, ledger: Ledger | None = None,
              system: str | None = None, max_tokens: int = 800) -> str:
    msgs = ([{"role": "system", "content": system}] if system else []) + \
           [{"role": "user", "content": prompt}]
    r = cheap_client().chat.completions.create(
        model=CHEAP_MODEL, messages=msgs, max_tokens=max_tokens, temperature=0.3,
        reasoning_effort="low")  # cut hidden reasoning tokens (speed + stay under TPM)
    if ledger and r.usage:
        ledger.add(agent, "groq", CHEAP_MODEL,
                   r.usage.prompt_tokens, r.usage.completion_tokens)
    return r.choices[0].message.content.strip()


def ask_smart(prompt: str, *, agent: str, ledger: Ledger | None = None,
              system: str | None = None, max_tokens: int = 800) -> str:
    msgs = ([{"role": "system", "content": system}] if system else []) + \
           [{"role": "user", "content": prompt}]
    r = foundry_client().chat.completions.create(
        model=AZURE_CHAT_DEPLOYMENT, messages=msgs, max_tokens=max_tokens, temperature=0.4)
    if ledger and r.usage:
        ledger.add(agent, "azure", AZURE_CHAT_DEPLOYMENT,
                   r.usage.prompt_tokens, r.usage.completion_tokens)
    return r.choices[0].message.content.strip()


def ask_kb(prompt: str, *, agent: str, ledger: Ledger | None = None) -> tuple[str, list[str]]:
    """Grounded answer from the Foundry knowledge base. Returns (text, source filenames)."""
    client = foundry_client()
    r = client.responses.create(
        model=AZURE_CHAT_DEPLOYMENT,
        input=prompt,
        tools=[{"type": "file_search", "vector_store_ids": [_vector_store_id()]}],
    )
    cites = set()
    for item in r.output:
        for content in getattr(item, "content", []) or []:
            for ann in getattr(content, "annotations", []) or []:
                fn = getattr(ann, "filename", None) or getattr(ann, "file_id", None)
                if fn:
                    cites.add(fn)
    if ledger and getattr(r, "usage", None):
        ledger.add(agent, "azure", AZURE_CHAT_DEPLOYMENT,
                   r.usage.input_tokens, r.usage.output_tokens)
    return r.output_text.strip(), sorted(cites)
