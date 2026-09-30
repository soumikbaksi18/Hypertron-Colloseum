from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    app_name: str = "Hypertron Agents"
    host: str = "0.0.0.0"
    port: int = 8000

    # Hypertron's programmable private financial layer.
    hypertron_api_url: str = "http://localhost:4000"
    hypertron_api_key: str = ""

    # How long the agent waits for private settlement to finish before giving up
    # and letting the caller poll instead.
    settlement_poll_timeout_s: float = 30.0
    settlement_poll_interval_s: float = 0.5


settings = Settings()
