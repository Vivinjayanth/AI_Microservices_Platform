"""
Utility functions for AI Microservices
"""
import os
import uuid
from typing import Dict, Any
from pathlib import Path
from app.config import get_settings


def validate_file_type(filename: str) -> bool:
    """Validate if the file type is allowed"""
    settings = get_settings()
    file_extension = Path(filename).suffix.lower()
    return file_extension in settings.allowed_file_types


def validate_file_size(file_size: int) -> bool:
    """Validate if the file size is within limits"""
    settings = get_settings()
    return file_size <= settings.max_file_size


def generate_unique_filename(original_filename: str) -> str:
    """Generate a unique filename to prevent collisions"""
    name = Path(original_filename).stem
    extension = Path(original_filename).suffix
    unique_id = str(uuid.uuid4())[:8]
    return f"{name}_{unique_id}{extension}"


def ensure_upload_directory():
    """Ensure the upload directory exists"""
    settings = get_settings()
    os.makedirs(settings.upload_path, exist_ok=True)


def create_api_response(success: bool, data: Any = None, error: str = None, message: str = None) -> Dict[str, Any]:
    """Create a standardized API response"""
    response = {"success": success}
    
    if data is not None:
        response["data"] = data
    if error:
        response["error"] = error
    if message:
        response["message"] = message
    
    return response


def clean_text(text: str) -> str:
    """Clean and normalize text content"""
    # Remove excessive whitespace
    text = ' '.join(text.split())
    
    # Remove special characters that might cause issues
    text = text.replace('\x00', '')  # Remove null bytes
    
    return text.strip()


def calculate_reading_time(text: str, words_per_minute: int = 200) -> int:
    """Calculate estimated reading time in minutes"""
    word_count = len(text.split())
    return max(1, word_count // words_per_minute)


def truncate_text(text: str, max_length: int = 500) -> str:
    """Truncate text to a maximum length with ellipsis"""
    if len(text) <= max_length:
        return text
    
    # Try to truncate at a word boundary
    truncated = text[:max_length].rsplit(' ', 1)[0]
    return truncated + "..."


def get_file_info(file_path: str) -> Dict[str, Any]:
    """Get information about a file"""
    path = Path(file_path)
    
    if not path.exists():
        return {"error": "File not found"}
    
    stat = path.stat()
    
    return {
        "name": path.name,
        "size": stat.st_size,
        "extension": path.suffix.lower(),
        "created": stat.st_ctime,
        "modified": stat.st_mtime,
        "size_mb": round(stat.st_size / (1024 * 1024), 2)
    }
