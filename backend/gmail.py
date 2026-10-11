"""Gmail OAuth + send. Connect one Google account; send emails from it via the
Gmail API. No password is stored — only an OAuth refresh token (token.json).
"""
from __future__ import annotations

import base64
import os
import pathlib
from email.mime.text import MIMEText

from dotenv import load_dotenv

load_dotenv()

# allow the http://localhost redirect + minor scope variance from Google
os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")
os.environ.setdefault("OAUTHLIB_RELAX_TOKEN_SCOPE", "1")

CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")
SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid",
]
TOKEN_FILE = pathlib.Path(__file__).resolve().parent / "gmail_token.json"


def configured() -> bool:
    return bool(CLIENT_ID and CLIENT_SECRET)


def _client_config():
    return {"web": {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": [REDIRECT_URI],
    }}


_PENDING: dict = {}  # holds the PKCE code_verifier between auth_url and the callback


def auth_url() -> str:
    from google_auth_oauthlib.flow import Flow
    flow = Flow.from_client_config(_client_config(), scopes=SCOPES, redirect_uri=REDIRECT_URI)
    url, _ = flow.authorization_url(access_type="offline", prompt="consent",
                                    include_granted_scopes="true")
    _PENDING["verifier"] = getattr(flow, "code_verifier", None)
    return url


def exchange_code(code: str) -> str:
    """Exchange the auth code for tokens, persist them, return the connected email."""
    from google_auth_oauthlib.flow import Flow
    flow = Flow.from_client_config(_client_config(), scopes=SCOPES, redirect_uri=REDIRECT_URI)
    if _PENDING.get("verifier"):
        flow.code_verifier = _PENDING["verifier"]
    flow.fetch_token(code=code)
    creds = flow.credentials
    TOKEN_FILE.write_text(creds.to_json())
    return _email_of(creds)


def _load_creds():
    if not TOKEN_FILE.exists():
        return None
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    import json
    creds = Credentials.from_authorized_user_info(json.loads(TOKEN_FILE.read_text()), SCOPES)
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        TOKEN_FILE.write_text(creds.to_json())
    return creds


def _email_of(creds) -> str:
    try:
        import requests
        r = requests.get("https://www.googleapis.com/oauth2/v2/userinfo",
                         headers={"Authorization": f"Bearer {creds.token}"}, timeout=10)
        return r.json().get("email", "")
    except Exception:
        return ""


def status() -> dict:
    creds = _load_creds()
    if not creds:
        return {"connected": False, "configured": configured()}
    return {"connected": True, "configured": True, "email": _email_of(creds)}


def disconnect() -> None:
    TOKEN_FILE.unlink(missing_ok=True)


def send(to: str, subject: str, body: str) -> dict:
    creds = _load_creds()
    if not creds:
        raise RuntimeError("Gmail not connected")
    from googleapiclient.discovery import build
    service = build("gmail", "v1", credentials=creds, cache_discovery=False)
    msg = MIMEText(body)
    msg["to"] = to
    msg["subject"] = subject
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    sent = service.users().messages().send(userId="me", body={"raw": raw}).execute()
    return {"id": sent.get("id"), "from": _email_of(creds)}
