"""
Pydantic models for API requests and responses
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# === COMMON MODELS ===
class APIResponse(BaseModel):
    """Standard API response format"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    message: Optional[str] = None


class HealthCheck(BaseModel):
    """Health check response"""
    status: str
    timestamp: str
    version: str
    services: Dict[str, str]


# === SUMMARIZATION MODELS ===
class SummarizationOptions(BaseModel):
    """Options for text summarization"""
    max_length: int = Field(default=500, ge=50, le=2000)
    style: str = Field(default="concise", pattern="^(concise|detailed|bullet|executive)$")
    language: str = Field(default="english")


class SummarizeRequest(BaseModel):
    """Request model for text summarization"""
    text: str = Field(..., min_length=10)
    options: Optional[SummarizationOptions] = SummarizationOptions()


class BatchSummarizeRequest(BaseModel):
    """Request model for batch summarization"""
    texts: List[str] = Field(..., min_items=1, max_items=10)
    options: Optional[SummarizationOptions] = SummarizationOptions()


class SummarizationResult(BaseModel):
    """Response model for summarization"""
    summary: str
    original_length: int
    summary_length: int
    compression_ratio: str
    chunks_processed: Optional[int] = None


class BatchSummarizationResult(BaseModel):
    """Response model for batch summarization"""
    summaries: List[SummarizationResult]
    total_texts: int
    avg_compression_ratio: str


# === DOCUMENT Q&A MODELS ===
class DocumentUploadResponse(BaseModel):
    """Response model for document upload"""
    message: str
    file_name: str
    chunks_created: int
    collection_name: str


class QuestionRequest(BaseModel):
    """Request model for asking questions"""
    question: str = Field(..., min_length=3)
    collection_name: str = Field(default="default")
    options: Optional[Dict[str, Any]] = None


class DocumentSource(BaseModel):
    """Document source information"""
    content: str
    metadata: Dict[str, Any]
    relevance_score: Optional[float] = None


class QuestionResponse(BaseModel):
    """Response model for Q&A"""
    answer: str
    question: str
    collection_name: str
    sources: Optional[List[DocumentSource]] = None
    confidence: Optional[str] = None


class SearchRequest(BaseModel):
    """Request model for document search"""
    query: str = Field(..., min_length=1)
    collection_name: str = Field(default="default")
    limit: int = Field(default=5, ge=1, le=20)


class SearchResult(BaseModel):
    """Response model for document search"""
    query: str
    results: List[DocumentSource]
    total_results: int
    collection_name: str


class CollectionInfo(BaseModel):
    """Information about a document collection"""
    name: str
    document_count: int


# === LEARNING PATH MODELS ===
class UserProfile(BaseModel):
    """User profile for learning path generation"""
    goal: str = Field(..., min_length=5)
    current_skills: List[str] = Field(default=[])
    experience: str = Field(default="beginner", pattern="^(beginner|intermediate|advanced)$")
    time_commitment: str = Field(default="10 hours/week")
    learning_style: str = Field(default="mixed", pattern="^(visual|hands-on|theoretical|mixed)$")
    interests: List[str] = Field(default=[])


class LearningPhase(BaseModel):
    """A phase in the learning path"""
    title: str
    topics: List[str]
    duration: str


class LearningResource(BaseModel):
    """A learning resource"""
    type: str
    description: str
    recommended: bool = True


class LearningProject(BaseModel):
    """A learning project"""
    title: str
    difficulty: str
    estimated_time: str


class LearningMilestone(BaseModel):
    """A learning milestone"""
    title: str
    target_date: str
    completed: bool = False


class LearningPath(BaseModel):
    """Complete learning path"""
    id: str
    title: str
    description: str
    phases: List[LearningPhase]
    resources: List[LearningResource]
    projects: List[LearningProject]
    milestones: List[LearningMilestone]
    created_at: str


class EstimatedTime(BaseModel):
    """Estimated completion time"""
    total_hours: int
    estimated_weeks: int
    time_commitment: str


class LearningPathResponse(BaseModel):
    """Response model for learning path generation"""
    user_profile: UserProfile
    learning_path: LearningPath
    estimated_completion_time: EstimatedTime
    recommendations: List[str]


class PopularPath(BaseModel):
    """Popular learning path"""
    title: str
    description: str
    difficulty: str
    estimated_time: str
    popularity: int


class PopularPathsResponse(BaseModel):
    """Response model for popular paths"""
    popular_paths: List[PopularPath]


class ProgressUpdateRequest(BaseModel):
    """Request model for progress update"""
    path_id: str = Field(..., min_length=1)
    milestone_id: str = Field(..., min_length=1)
    completed: bool = True


class ProgressUpdateResponse(BaseModel):
    """Response model for progress update"""
    path_id: str
    milestone_id: str
    completed: bool
    updated_at: str
    message: str
