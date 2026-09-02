import os
from dotenv import load_dotenv

# Load .env file from project root or backend_fastapi folder
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

class Settings:
    FIREWORKS_API_KEY: str = os.getenv("FIREWORKS_API_KEY", "")
    PORT: int = int(os.getenv("PORT", 5000))
    REQUEST_DELAY_MS: int = int(os.getenv("REQUEST_DELAY_MS", 800))
    BATCH_SIZE: int = int(os.getenv("BATCH_SIZE", 100))
    QDRANT_URL: str = os.getenv("QDRANT_URL", "")
    QDRANT_API_KEY: str = os.getenv("QDRANT_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    FW_BASE_URL: str = "https://api.fireworks.ai/inference/v1"
    CHAT_MODEL: str = os.getenv("CHAT_MODEL", "accounts/fireworks/models/deepseek-v4-pro-0813")
    EMBED_MODEL: str = "nomic-ai/nomic-embed-text-v1.5"

settings = Settings()
