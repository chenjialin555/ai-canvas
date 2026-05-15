from __future__ import annotations

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """集中读取环境变量（pydantic-settings 默认匹配如 `BANANA_API_KEY` → `banana_api_key`）。"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        env_nested_delimiter="__",
    )

    # --- HTTP / CORS ---
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            # Electron 安装包从 file:// 加载时，跨域请求 Origin 常为字符串 "null"
            "null",
        ],
    )

    # --- 网关 Base URL ---
    comfly_base_url: str = Field(default="https://ai.comfly.chat")
    gemini_base_url: str = Field(default="")
    ksyun_base_url: str = Field(default="")

    # --- API Keys ---
    banana_api_key: str = Field(default="")
    gemini_api_key: str = Field(default="")
    doubao_api_key: str = Field(default="")
    flux_api_key: str = Field(default="")
    qwen_api_key: str = Field(default="")
    ksyun_api_key: str = Field(default="")

    # --- OSS ---
    oss_access_key_id: str = Field(default="")
    oss_access_key_secret: str = Field(default="")
    oss_region: str = Field(default="cn-shenzhen")
    oss_endpoint: str = Field(default="")
    oss_use_cname: bool = Field(default=False)
    oss_bucket: str = Field(default="")
    oss_bucket_name: str = Field(default="")
    oss_public_base_url: str = Field(default="")
    oss_object_prefix: str = Field(default="")
    oss_path: str = Field(default="")

    # --- 日志 ---
    log_dir: str = Field(default="")
    log_level: str = Field(default="INFO")
    log_max_bytes: int = Field(default=10_485_760)
    log_backup_count: int = Field(default=5)

    return_raw_response: bool = Field(default=False)

    def project_root(self) -> Path:
        return Path(__file__).resolve().parent.parent.parent

    def resolved_log_dir(self) -> Path:
        raw = self.log_dir.strip()
        d = Path(raw).resolve() if raw else self.project_root() / "logs"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def log_level_name(self) -> str:
        return self.log_level.strip().upper()

    def comfly_base_normalized(self) -> str:
        return self.comfly_base_url.rstrip("/")

    def gemini_base_normalized(self) -> str:
        raw = (self.gemini_base_url or self.comfly_base_url).strip()
        if raw and not raw.startswith("http://") and not raw.startswith("https://"):
            raw = "https://" + raw
        return raw.rstrip("/")

    def ksyun_base_normalized(self) -> str:
        raw = self.ksyun_base_url.strip()
        if raw and not raw.startswith("http://") and not raw.startswith("https://"):
            raw = "https://" + raw
        return raw.rstrip("/")

    def oss_bucket_resolved(self) -> str:
        return self.oss_bucket or self.oss_bucket_name

    def api_key_for_provider(self, provider: str) -> str:
        key_map: dict[str, str] = {
            "banana": self.banana_api_key,
            "gemini": self.gemini_api_key,
            "doubao": self.doubao_api_key,
            "flux": self.flux_api_key,
            "qwen": self.qwen_api_key,
            "gpt-image": self.gemini_api_key,
            "ksyun": self.ksyun_api_key,
        }
        k = key_map.get(provider, "")
        if not k:
            env_hint = {
                "banana": "BANANA_API_KEY",
                "gemini": "GEMINI_API_KEY",
                "doubao": "DOUBAO_API_KEY",
                "flux": "FLUX_API_KEY",
                "qwen": "QWEN_API_KEY",
                "gpt-image": "GEMINI_API_KEY",
                "ksyun": "KSYUN_API_KEY",
            }.get(provider, "API_KEY")
            raise RuntimeError(f"Missing env: {env_hint}")
        return k

    def base_url_for_images_provider(self, provider: str) -> str:
        if provider in ("banana", "doubao", "flux", "gpt-image"):
            return self.comfly_base_normalized()
        if provider == "gemini":
            return self.gemini_base_normalized()
        if provider == "ksyun":
            u = self.ksyun_base_normalized()
            if not u:
                raise RuntimeError("Missing env: KSYUN_BASE_URL")
            return u
        return ""


settings = Settings()
