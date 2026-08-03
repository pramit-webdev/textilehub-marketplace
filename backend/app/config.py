from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "TextileHub"
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/textilehub"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    FRONTEND_URL: str = "http://localhost:5173"
    HF_TOKEN: str = ""
    HF_CHAT_MODEL: str = "Qwen/Qwen3-4B-Instruct-2507"
    HF_EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    HF_API_URL: str = "https://router.huggingface.co"
    PUBLIC_BASE_URL: str = "http://localhost:8000"
    MAX_UPLOAD_MB: int = 5

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
