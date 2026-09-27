from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    app_name: str = "Hypertron Agents"
    host: str = "0.0.0.0"
    port: int = 8000


settings = Settings()
