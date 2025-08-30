import os
import shutil
from datetime import datetime
from typing import Optional
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import uvicorn

# Import services and models
from app.config import get_settings, create_directories
from app.models.schemas import (
    APIResponse, HealthCheck, SummarizeRequest, BatchSummarizeRequest,
    QuestionRequest, UserProfile, ProgressUpdateRequest
)
from app.services.summarization import SummarizationService
from app.services.document_qa import DocumentQAService
from app.services.learning_path import LearningPathService
from app.utils.helpers import (
    validate_file_type, validate_file_size, generate_unique_filename,
    create_api_response, ensure_upload_directory
)

settings = get_settings()
create_directories()
ensure_upload_directory()

app = FastAPI(
    title=settings.app_name,
    description="Modular AI microservices using Flowise and LangChain",
    version=settings.version,
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

summarization_service = SummarizationService()
document_qa_service = DocumentQAService()
learning_path_service = LearningPathService()

if Path("frontend").exists():
    app.mount("/static", StaticFiles(directory="frontend"), name="static")


@app.get("/", response_class=HTMLResponse)
async def root():
    """Root endpoint serving the frontend"""
    frontend_path = Path("frontend/index.html")
    if frontend_path.exists():
        return frontend_path.read_text(encoding='utf-8')
    else:
        return """
        <html>
            <head><title>AI Microservices API</title></head>
            <body>
                <h1>🤖 AI Microservices API</h1>
                <p>Welcome to the AI Microservices API built with Flowise + LangChain</p>
                <ul>
                    <li><a href="/docs">📚 API Documentation (Swagger)</a></li>
                    <li><a href="/redoc">📋 API Documentation (ReDoc)</a></li>
                    <li><a href="/health">🏥 Health Check</a></li>
                </ul>
                <h2>Available Services:</h2>
                <ul>
                    <li>📄 Text Summarization</li>
                    <li>❓ Document Q&A</li>
                    <li>🎯 Learning Path Generation</li>
                </ul>
            </body>
        </html>
        """


@app.get("/health", response_model=APIResponse)
async def health_check():
    """Health check endpoint"""
    try:
        health_data = HealthCheck(
            status="healthy",
            timestamp=datetime.now().isoformat(),
            version=settings.version,
            services={
                "summarization": "active",
                "document_qa": "active",
                "learning_path": "active"
            }
        )
        return create_api_response(success=True, data=health_data.dict())
    except Exception as e:
        return create_api_response(success=False, error=str(e))


@app.get("/api", response_model=APIResponse)
async def api_overview():
    """API overview endpoint"""
    endpoints = {
        "summarization": {
            "POST /api/summarize": "Summarize text content",
            "POST /api/summarize/batch": "Batch text summarization"
        },
        "document_qa": {
            "POST /api/documents/upload": "Upload and process documents",
            "POST /api/documents/ask": "Ask questions about documents",
            "GET /api/documents/search": "Search through documents",
            "GET /api/documents/collections": "List document collections",
            "DELETE /api/documents/collections/{name}": "Delete document collection"
        },
        "learning_path": {
            "POST /api/learning-path/generate": "Generate personalized learning path",
            "GET /api/learning-path/popular": "Get popular learning paths",
            "PUT /api/learning-path/progress": "Update learning progress"
        }
    }
    
    return create_api_response(
        success=True,
        data={
            "message": "AI Microservices API",
            "version": settings.version,
            "endpoints": endpoints
        }
    )


@app.post("/api/summarize", response_model=APIResponse)
async def summarize_text(request: SummarizeRequest):
    """Summarize text content"""
    try:
        result = await summarization_service.summarize_text(request.text, request.options)
        return create_api_response(success=True, data=result.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/summarize/batch", response_model=APIResponse)
async def summarize_batch(request: BatchSummarizeRequest):
    """Batch text summarization"""
    try:
        result = await summarization_service.summarize_batch(request.texts, request.options)
        return create_api_response(success=True, data=result.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/documents/upload", response_model=APIResponse)
async def upload_document(
    document: UploadFile = File(...),
    collection_name: str = Form("default")
):
    """Upload and process a document"""
    try:
        if not validate_file_type(document.filename):
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type. Allowed types: {settings.allowed_file_types}"
            )
        
        content = await document.read()
        if not validate_file_size(len(content)):
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Max size: {settings.max_file_size / (1024*1024):.1f}MB"
            )
        
        filename = generate_unique_filename(document.filename)
        file_path = os.path.join(settings.upload_path, filename)
        
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        result = await document_qa_service.process_document(file_path, collection_name)
        return create_api_response(success=True, data=result.dict())
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/documents/ask", response_model=APIResponse)
async def ask_question(request: QuestionRequest):
    """Ask a question about uploaded documents"""
    try:
        result = await document_qa_service.answer_question(
            request.question, 
            request.collection_name, 
            request.options or {}
        )
        return create_api_response(success=True, data=result.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/documents/search", response_model=APIResponse)
async def search_documents(
    query: str,
    collection_name: str = "default",
    limit: int = 5
):
    """Search through document content"""
    try:
        result = await document_qa_service.search_documents(query, collection_name, limit)
        return create_api_response(success=True, data=result.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/documents/collections", response_model=APIResponse)
async def list_collections():
    """List all document collections"""
    try:
        collections = document_qa_service.get_collections()
        return create_api_response(success=True, data={"collections": collections})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/documents/collections/{collection_name}", response_model=APIResponse)
async def delete_collection(collection_name: str):
    """Delete a document collection"""
    try:
        result = await document_qa_service.delete_collection(collection_name)
        return create_api_response(success=True, data=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/learning-path/generate", response_model=APIResponse)
async def generate_learning_path(user_profile: UserProfile):
    """Generate a personalized learning path"""
    try:
        result = await learning_path_service.generate_learning_path(user_profile)
        return create_api_response(success=True, data=result.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/learning-path/popular", response_model=APIResponse)
async def get_popular_paths():
    """Get popular learning paths"""
    try:
        result = await learning_path_service.get_popular_paths()
        return create_api_response(success=True, data=result.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/learning-path/progress", response_model=APIResponse)
async def update_progress(request: ProgressUpdateRequest):
    """Update learning progress"""
    try:
        result = await learning_path_service.update_user_progress(
            request.path_id, 
            request.milestone_id, 
            request.completed
        )
        return create_api_response(success=True, data=result.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/style.css")
async def get_style():
    """Serve CSS file"""
    css_path = Path("frontend/style.css")
    if css_path.exists():
        content = css_path.read_text(encoding='utf-8')
        from fastapi.responses import Response
        return Response(content=content, media_type="text/css")
    raise HTTPException(status_code=404, detail="CSS file not found")


@app.get("/script.js")
async def get_script():
    """Serve JavaScript file"""
    js_path = Path("frontend/script.js")
    if js_path.exists():
        content = js_path.read_text(encoding='utf-8')
        from fastapi.responses import Response
        return Response(content=content, media_type="application/javascript")
    raise HTTPException(status_code=404, detail="JavaScript file not found")


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    print(f"🚀 {settings.app_name} starting up...")
    print(f"📝 API Documentation: http://{settings.host}:{settings.port}/docs")
    print(f"🏥 Health Check: http://{settings.host}:{settings.port}/health")
    print("")
    print("Available Services:")
    print("  📄 Text Summarization")
    print("  ❓ Document Q&A")
    print("  🎯 Learning Path Generation")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info"
    )
