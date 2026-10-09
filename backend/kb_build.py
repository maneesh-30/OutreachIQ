"""Phase 1: build a Foundry knowledge base (vector store) from company docs,
then ask a grounded question via the Responses API + file_search tool.

Usage:
    python backend/kb_build.py build      # create vector store + upload docs
    python backend/kb_build.py ask "..."   # grounded query against it
"""
import sys
import glob
import json
import pathlib

from config import foundry_client, AZURE_CHAT_DEPLOYMENT

DATA_DIR = pathlib.Path(__file__).resolve().parent.parent / "data" / "company"
STATE = pathlib.Path(__file__).resolve().parent / ".kb_state.json"
VS_NAME = "outreachiq-kb"


def _save_state(d: dict) -> None:
    STATE.write_text(json.dumps(d, indent=2))


def _load_state() -> dict:
    return json.loads(STATE.read_text()) if STATE.exists() else {}


def _profile_to_docs(profile: dict) -> list[tuple[str, str]]:
    """Turn a scraped company profile into named markdown docs for the KB."""
    vp = "\n".join(f"- **{v.get('title','')}**: {v.get('desc','')}"
                   for v in profile.get("value_props", []))
    icp = profile.get("icp", {})
    icp_md = "\n".join(f"- {k.replace('_',' ').title()}: {v}" for k, v in icp.items())
    name = profile.get("company_name", "Company")
    return [
        ("company_profile.md",
         f"# {name}\n\n## What we sell\n{profile.get('what_you_sell','')}\n\n## Value props\n{vp}\n\nSource: {profile.get('source_url','')}"),
        ("icp.md", f"# {name} — Ideal Customer Profile\n{icp_md}"),
        ("website.md", f"# {name} — website content\n{profile.get('_site_text','')}"),
    ]


def build_from_profile(profile: dict) -> str:
    """Rebuild the KB vector store from a scraped company profile. Returns vector_store_id."""
    client = foundry_client()
    # best-effort: delete the previous store so they don't accumulate
    old = _load_state().get("vector_store_id")
    if old:
        try:
            client.vector_stores.delete(old)
        except Exception:
            pass

    name = profile.get("company_name", "company")
    vs = client.vector_stores.create(name=f"oiq-{name}-kb"[:60])
    files = [(fname, content.encode("utf-8")) for fname, content in _profile_to_docs(profile)]
    client.vector_stores.file_batches.upload_and_poll(vector_store_id=vs.id, files=files)
    _save_state({"vector_store_id": vs.id, "company": name})
    return vs.id


def build() -> None:
    client = foundry_client()
    files = sorted(glob.glob(str(DATA_DIR / "*.md")))
    if not files:
        sys.exit(f"No docs in {DATA_DIR}")

    print(f"Creating vector store '{VS_NAME}'...")
    vs = client.vector_stores.create(name=VS_NAME)

    print(f"Uploading {len(files)} docs...")
    streams = [open(f, "rb") for f in files]
    try:
        batch = client.vector_stores.file_batches.upload_and_poll(
            vector_store_id=vs.id, files=streams
        )
    finally:
        for s in streams:
            s.close()

    print(f"  status={batch.status}  counts={batch.file_counts}")
    _save_state({"vector_store_id": vs.id})
    print(f"Saved vector_store_id={vs.id} -> {STATE.name}")


def ask(question: str) -> None:
    client = foundry_client()
    state = _load_state()
    vs_id = state.get("vector_store_id")
    if not vs_id:
        sys.exit("No vector store. Run: python backend/kb_build.py build")

    resp = client.responses.create(
        model=AZURE_CHAT_DEPLOYMENT,
        input=question,
        tools=[{"type": "file_search", "vector_store_ids": [vs_id]}],
    )

    print("\nQ:", question)
    print("A:", resp.output_text)

    # pull file_search citations
    cites = set()
    for item in resp.output:
        for content in getattr(item, "content", []) or []:
            for ann in getattr(content, "annotations", []) or []:
                fn = getattr(ann, "filename", None) or getattr(ann, "file_id", None)
                if fn:
                    cites.add(fn)
    if cites:
        print("Sources:", ", ".join(sorted(cites)))


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ("build", "ask"):
        sys.exit("Usage: kb_build.py build | ask \"question\"")
    if sys.argv[1] == "build":
        build()
    else:
        ask(" ".join(sys.argv[2:]) or "What does Acme Analytics sell and who is it for?")
