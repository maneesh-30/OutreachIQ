"""Phase 0 smoke test: prove both Azure (gpt-4.1-mini) and Featherless (Llama-3.1-8B) respond."""
import os
from dotenv import load_dotenv
from openai import AzureOpenAI, OpenAI

load_dotenv()


def test_azure() -> None:
    client = AzureOpenAI(
        azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
        api_key=os.environ["AZURE_OPENAI_API_KEY"],
        api_version=os.environ["AZURE_OPENAI_API_VERSION"],
    )
    resp = client.chat.completions.create(
        model=os.environ["AZURE_CHAT_DEPLOYMENT"],
        messages=[{"role": "user", "content": "Reply with exactly: AZURE OK"}],
        max_tokens=10,
    )
    print("Azure  ->", resp.choices[0].message.content.strip())


def test_featherless() -> None:
    client = OpenAI(
        base_url=os.environ["FEATHERLESS_BASE_URL"],
        api_key=os.environ["FEATHERLESS_API_KEY"],
    )
    resp = client.chat.completions.create(
        model=os.environ["FEATHERLESS_MODEL"],
        messages=[{"role": "user", "content": "Reply with exactly: FEATHERLESS OK"}],
        max_tokens=10,
    )
    print("Feather->", resp.choices[0].message.content.strip())


if __name__ == "__main__":
    test_azure()
    test_featherless()
    print("\nPhase 0 done if both printed OK.")
