from backend.app.core.settings import settings
from backend.app.services.generation_service import GenerationService
from backend.app.services.upload_service import UploadService

upload_service = UploadService(settings)
generation_service = GenerationService(settings, upload_service)

__all__ = ["upload_service", "generation_service", "settings"]
