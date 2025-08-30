"""
Text Summarization Service using LangChain
"""
import asyncio
from typing import Dict, List, Optional
from langchain_openai import OpenAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import PromptTemplate
from langchain.chains.summarize import load_summarize_chain
from langchain_core.documents import Document

from app.config import get_settings, get_llm_config
from app.models.schemas import SummarizationOptions, SummarizationResult, BatchSummarizationResult


class MockLLM:
    """Mock LLM for demonstration when no API key is provided"""
    
    async def apredict(self, text: str) -> str:
        """Mock prediction method"""
        # Simple extractive summary for demo
        sentences = text.split('. ')
        if len(sentences) > 3:
            summary = '. '.join(sentences[:3]) + '.'
        else:
            summary = text[:200] + "..." if len(text) > 200 else text
        return f"Mock Summary: {summary}"
    
    def predict(self, text: str) -> str:
        """Sync version of predict"""
        return asyncio.run(self.apredict(text))


class SummarizationService:
    """Service for text summarization using LangChain"""
    
    def __init__(self):
        self.settings = get_settings()
        self.llm = None
        self._initialize_llm()
    
    def _initialize_llm(self):
        """Initialize the LLM based on available configuration"""
        llm_config = get_llm_config()
        
        try:
            if llm_config["provider"] == "openai":
                self.llm = OpenAI(
                    openai_api_key=llm_config["api_key"],
                    model_name="gpt-3.5-turbo-instruct",
                    temperature=0.3,
                    max_tokens=500
                )
            elif llm_config["provider"] == "openrouter":
                self.llm = OpenAI(
                    openai_api_key=llm_config["api_key"],
                    openai_api_base=llm_config["base_url"],
                    model_name=llm_config["model"],
                    temperature=0.3,
                    max_tokens=500
                )
            else:
                print("No API key provided. Using mock LLM for demonstration.")
                self.llm = MockLLM()
                
        except Exception as e:
            print(f"Error initializing LLM: {e}")
            print("Falling back to mock LLM.")
            self.llm = MockLLM()
    
    def _create_summarization_prompt(self, style: str, language: str, max_length: int) -> PromptTemplate:
        """Create summarization prompt based on style and parameters"""
        style_instructions = {
            "concise": "Create a brief, to-the-point summary",
            "detailed": "Create a comprehensive summary with key details",
            "bullet": "Create a summary in bullet point format",
            "executive": "Create an executive summary focusing on key insights and decisions"
        }
        
        instruction = style_instructions.get(style, style_instructions["concise"])
        
        return PromptTemplate(
            template=f"""{instruction} of the following text in {language}.
Keep the summary under {max_length} characters while preserving the most important information.

Text: {{text}}

Summary:""",
            input_variables=["text"]
        )
    
    async def summarize_text(self, text: str, options: SummarizationOptions) -> SummarizationResult:
        """Summarize a single text"""
        try:
            # Split text if it's too long
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=self.settings.chunk_size * 4,  # Larger chunks for summarization
                chunk_overlap=self.settings.chunk_overlap
            )
            
            docs = text_splitter.create_documents([text])
            
            if len(docs) == 1:
                # Single document summarization
                prompt = self._create_summarization_prompt(
                    options.style, 
                    options.language, 
                    options.max_length
                )
                formatted_prompt = prompt.format(text=docs[0].page_content)
                
                if hasattr(self.llm, 'apredict'):
                    summary = await self.llm.apredict(formatted_prompt)
                else:
                    summary = self.llm.predict(formatted_prompt)
                
                return SummarizationResult(
                    summary=summary.strip(),
                    original_length=len(text),
                    summary_length=len(summary.strip()),
                    compression_ratio=f"{(len(summary.strip()) / len(text) * 100):.2f}%"
                )
            else:
                # Multi-document summarization using map-reduce
                if isinstance(self.llm, MockLLM):
                    # Handle mock LLM case
                    combined_text = " ".join([doc.page_content for doc in docs])
                    summary = await self.llm.apredict(combined_text[:1000])
                else:
                    chain = load_summarize_chain(self.llm, chain_type="map_reduce")
                    summary = chain.run(docs)
                
                return SummarizationResult(
                    summary=summary.strip(),
                    original_length=len(text),
                    summary_length=len(summary.strip()),
                    compression_ratio=f"{(len(summary.strip()) / len(text) * 100):.2f}%",
                    chunks_processed=len(docs)
                )
                
        except Exception as e:
            raise Exception(f"Summarization failed: {str(e)}")
    
    async def summarize_batch(self, texts: List[str], options: SummarizationOptions) -> BatchSummarizationResult:
        """Summarize multiple texts"""
        try:
            # Process all texts concurrently
            tasks = [self.summarize_text(text, options) for text in texts]
            summaries = await asyncio.gather(*tasks)
            
            # Calculate average compression ratio
            compression_ratios = [float(s.compression_ratio.rstrip('%')) for s in summaries]
            avg_compression = sum(compression_ratios) / len(compression_ratios)
            
            return BatchSummarizationResult(
                summaries=summaries,
                total_texts=len(texts),
                avg_compression_ratio=f"{avg_compression:.2f}%"
            )
            
        except Exception as e:
            raise Exception(f"Batch summarization failed: {str(e)}")
    
    def get_service_info(self) -> Dict[str, str]:
        """Get information about the summarization service"""
        llm_config = get_llm_config()
        return {
            "service": "Text Summarization",
            "provider": llm_config["provider"],
            "model": llm_config["model"],
            "status": "active"
        }
