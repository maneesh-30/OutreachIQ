"""Persist the active company profile (from the self-analyzer) to a JSON file."""
import json
import pathlib

FILE = pathlib.Path(__file__).resolve().parent / "company_profile.json"


def save_company(profile: dict) -> None:
    FILE.write_text(json.dumps(profile, indent=2, ensure_ascii=False), encoding="utf-8")


def load_company() -> dict | None:
    return json.loads(FILE.read_text(encoding="utf-8")) if FILE.exists() else None
