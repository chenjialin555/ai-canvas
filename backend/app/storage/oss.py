from __future__ import annotations

import base64
import hashlib
import mimetypes
import random
import string
import tempfile
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING, Optional, Tuple

import alibabacloud_oss_v2 as oss

if TYPE_CHECKING:
    from backend.app.core.settings import Settings


class OSSUploadError(Exception):
    pass


def is_data_url(value: Optional[str]) -> bool:
    return bool(value and value.startswith("data:image/") and "," in value)


def is_http_url(value: Optional[str]) -> bool:
    return bool(value and (value.startswith("http://") or value.startswith("https://")))


def parse_data_url(data_url: str) -> Tuple[bytes, str, str]:
    header, b64 = data_url.split(",", 1)

    mime_type = header.split(";")[0].replace("data:", "").strip()
    ext = mimetypes.guess_extension(mime_type) or ".png"

    if ext == ".jpe":
        ext = ".jpg"

    raw = base64.b64decode(b64)

    return raw, mime_type, ext


def generate_oss_object_key(
    *,
    ext: str = ".png",
    minio_path: str = "ai-canvas",
    trace_id: str = "default",
    api_name: str = "image",
    client_id: str = "web",
    object_prefix: str,
) -> str:
    prefix = (object_prefix or "public/images").strip("/")
    now_date = datetime.now().strftime("%Y%m%d")

    hex_chars = string.hexdigits[:16]
    random_md5 = "".join(random.choices(hex_chars, k=32))

    path_name = (
        f"{minio_path}/{now_date}/{trace_id}/"
        f"{api_name}_{client_id}_RES_{random_md5}{ext}"
    )

    md5str = hashlib.md5(path_name.encode("utf-8")).hexdigest()

    str1 = md5str[:2]
    str2 = md5str[2:4]

    return f"{prefix}/{str1}/{str2}/{md5str}{ext}"


class OSSStorage:
    def __init__(self, settings: "Settings"):
        self._settings = settings

        if not settings.oss_access_key_id or not settings.oss_access_key_secret:
            raise OSSUploadError("Missing OSS_ACCESS_KEY_ID or OSS_ACCESS_KEY_SECRET")

        if not settings.oss_endpoint:
            raise OSSUploadError("Missing OSS_ENDPOINT")

        credentials_provider = oss.credentials.StaticCredentialsProvider(
            settings.oss_access_key_id,
            settings.oss_access_key_secret,
        )

        cfg = oss.config.load_default()
        cfg.credentials_provider = credentials_provider
        cfg.region = settings.oss_region
        cfg.endpoint = settings.oss_endpoint
        cfg.use_cname = settings.oss_use_cname

        self.client = oss.Client(cfg)
        bucket = settings.oss_bucket_resolved()
        if not bucket:
            raise OSSUploadError("Missing OSS_BUCKET or OSS_BUCKET_NAME")

        self.bucket = bucket
        base = settings.oss_public_base_url or settings.oss_endpoint
        self.public_base_url = base.rstrip("/")

    def upload_bytes(
        self,
        data: bytes,
        *,
        mime_type: str = "image/png",
        ext: str = ".png",
        trace_id: str = "default",
        api_name: str = "image",
        client_id: str = "web",
    ) -> str:
        prefix = (
            self._settings.oss_object_prefix
            or self._settings.oss_path
            or "public/images"
        )
        key = generate_oss_object_key(
            ext=ext,
            trace_id=trace_id,
            api_name=api_name,
            client_id=client_id,
            object_prefix=prefix,
        )

        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(data)
            tmp_path = tmp.name

        try:
            result = self.client.put_object_from_file(
                oss.PutObjectRequest(
                    bucket=self.bucket,
                    key=key,
                    acl="public-read",
                    content_type=mime_type,
                    content_disposition="inline",
                ),
                tmp_path,
            )

            status_code = getattr(result, "status_code", None)

            if status_code and not (200 <= int(status_code) < 300):
                raise OSSUploadError(f"OSS upload failed, status_code={status_code}")

            return f"{self.public_base_url}/{key}"

        finally:
            try:
                Path(tmp_path).unlink(missing_ok=True)
            except Exception:
                pass

    def upload_data_url(
        self,
        data_url: str,
        *,
        trace_id: str = "default",
        api_name: str = "image",
        client_id: str = "web",
    ) -> str:
        data, mime_type, ext = parse_data_url(data_url)

        return self.upload_bytes(
            data=data,
            mime_type=mime_type,
            ext=ext,
            trace_id=trace_id,
            api_name=api_name,
            client_id=client_id,
        )


_oss_storage: Optional[OSSStorage] = None


def get_oss_storage(settings: "Settings") -> OSSStorage:
    global _oss_storage
    if _oss_storage is None:
        _oss_storage = OSSStorage(settings)
    return _oss_storage


def reset_oss_storage_for_tests() -> None:
    global _oss_storage
    _oss_storage = None


def ensure_url(
    value: Optional[str],
    *,
    settings: "Settings",
    trace_id: str = "default",
    api_name: str = "image",
    client_id: str = "web",
) -> Optional[str]:
    if not value:
        return None

    if is_http_url(value):
        return value

    if is_data_url(value):
        storage = get_oss_storage(settings)
        return storage.upload_data_url(
            value,
            trace_id=trace_id,
            api_name=api_name,
            client_id=client_id,
        )

    return value
