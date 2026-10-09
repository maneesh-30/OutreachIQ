"""Central config + client factories for OutreachIQ."""
import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()

# ---- Azure Foundry ----
# base host, e.g. https://outreachiq-resource.services.ai.azure.com
AZURE_OPENAI_ENDPOINT = os.environ["AZURE_OPENAI_ENDPOINT"].rstrip("/")
AZURE_OPENAI_API_KEY = os.environ["AZURE_OPENAI_API_KEY"]
AZURE_CHAT_DEPLOYMENT = os.environ["AZURE_CHAT_DEPLOYMENT"]
AZURE_EMBED_DEPLOYMENT = os.environ.get("AZURE_EMBED_DEPLOYMENT", "text-embedding-3-small")

# Foundry "v1" OpenAI surface (Responses API, vector stores, chat all live here)
FOUNDRY_V1_BASE = f"{AZURE_OPENAI_ENDPOINT}/openai/v1/"

# ---- Cheap bulk provider (Groq, OpenAI-compatible) ----
CHEAP_API_KEY = os.environ["CHEAP_API_KEY"]
CHEAP_BASE_URL = os.environ["CHEAP_BASE_URL"]
CHEAP_MODEL = os.environ["CHEAP_MODEL"]


@lru_cache
def foundry_client():
    """OpenAI client on the Foundry account v1 surface: responses, vector_stores, chat."""
    from openai import OpenAI

    return OpenAI(
        base_url=FOUNDRY_V1_BASE,
        api_key=AZURE_OPENAI_API_KEY,
        default_query={"api-version": "preview"},
    )


@lru_cache
def cheap_client():
    from openai import OpenAI

    # free tier is rate-limited; let the client retry 429s with backoff
    return OpenAI(base_url=CHEAP_BASE_URL, api_key=CHEAP_API_KEY, max_retries=5)
