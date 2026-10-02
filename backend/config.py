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

# ---- Featherless (cheap bulk model) ----
FEATHERLESS_API_KEY = os.environ["FEATHERLESS_API_KEY"]
FEATHERLESS_BASE_URL = os.environ["FEATHERLESS_BASE_URL"]
FEATHERLESS_MODEL = os.environ["FEATHERLESS_MODEL"]


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
def featherless_client():
    from openai import OpenAI

    return OpenAI(base_url=FEATHERLESS_BASE_URL, api_key=FEATHERLESS_API_KEY)
