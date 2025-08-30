"""
Configuration module for AI Microservices
"""
import os
from typing import List, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Server Configuration
    app_name: str = "AI Microservices with Flowise + LangChain"
    version: str = "1.0.0"
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True
    
    # API Keys
    openai_api_key: Optional[str] = None
    openrouter_api_key: Optional[str] = None
    
    # Ollama Configuration
    ollama_base_url: str = "http://localhost:11434"
    
    # File Upload Configuration
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    upload_path: str = "./uploads"
    allowed_file_types: List[str] = [".pdf", ".docx", ".txt", ".md"]
    
    # Vector Store Configuration
    vector_store_path: str = "./vector_store"
    chroma_persist_directory: str = "./chroma_db"
    
    # CORS Configuration
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:8080",
        "http://127.0.0.1:8000"
    ]
    
    # LLM Configuration
    default_model: str = "gpt-3.5-turbo"
    max_tokens: int = 1500
    temperature: float = 0.7
    
    # Text Splitting Configuration
    chunk_size: int = 1000
    chunk_overlap: int = 200
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings"""
    return settings


def create_directories():
    """Create necessary directories if they don't exist"""
    directories = [
        settings.upload_path,
        settings.vector_store_path,
        settings.chroma_persist_directory
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)


def get_llm_config():
    """Get LLM configuration based on available API keys"""
    if settings.openai_api_key:
        return {
            "provider": "openai",
            "api_key": settings.openai_api_key,
            "model": settings.default_model
        }
    elif settings.openrouter_api_key:
        return {
            "provider": "openrouter",
            "api_key": settings.openrouter_api_key,
            "base_url": "https://openrouter.ai/api/v1",
            "model": "microsoft/wizardlm-2-8x22b"
        }
    else:
        return {
            "provider": "mock",
            "api_key": None,
            "model": "mock-model"
        }
