from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./healthdesk.db"
    secret_key: str = "dev-only-secret-change-me-before-any-deployment-0123456789"
    token_hours: int = 8
    upload_dir: str = "./uploads"
    max_upload_mb: int = 5
    cors_origins: str = "http://localhost:5173"
    seed_demo_data: bool = True


settings = Settings()
