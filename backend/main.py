import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict
from exa_client import search_candidates, summarize_candidate
import traceback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration from environment
MAX_RESULTS = int(os.getenv("MAX_RESULTS", "12"))
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# CORS configuration - restrict in production
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
if ENVIRONMENT == "development":
    ALLOWED_ORIGINS = ["*"]  # Allow all in development only

app = FastAPI(
    title="Sourcing Copilot",
    description="AI-powered candidate sourcing using semantic search",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True if ENVIRONMENT == "production" else False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

class SearchRequest(BaseModel):
    role: str = Field(..., min_length=2, max_length=100, description="Job role/title")
    skills: List[str] = Field(..., min_items=1, max_items=20, description="Required skills")
    companies: Optional[List[str]] = Field(None, max_items=10, description="Target companies")
    min_years: Optional[int] = Field(None, ge=0, le=50, description="Minimum years experience")
    platform: Optional[str] = Field(None, description="Sourcing platform")
    university: Optional[str] = Field(None, max_length=100, description="University filter")
    degree_level: Optional[str] = Field(None, description="Degree level filter")

    @validator('skills', pre=True, each_item=True)
    def clean_skills(cls, v):
        return v.strip() if isinstance(v, str) else v

    @validator('degree_level')
    def validate_degree(cls, v):
        if v and v.lower() not in ['phd', 'masters', 'bachelors', 'any', '']:
            raise ValueError('Invalid degree level')
        return v

class CandidateResponse(BaseModel):
    name: str
    url: str
    summary: List[str]
    score: float
    skill_match: float
    publications: List[Dict[str, str]]
    education: str
    years_experience: str
    contact: Dict[str, str]
    profile_type: str
    matched_skills: List[str]

@app.post("/search", response_model=List[CandidateResponse])
async def search(req: SearchRequest):
    """
    Search for candidates using Exa semantic search API.

    Returns up to 12 candidates matching the specified criteria,
    sorted by skill match percentage and relevance score.
    """
    logger.info(f"Search request: role={req.role}, skills={req.skills}, platform={req.platform}")

    try:
        # Call Exa API with error handling
        try:
            results = search_candidates(
                role=req.role,
                skills=req.skills,
                target_companies=req.companies,
                min_years=req.min_years,
                platform=req.platform,
                university=req.university,
                degree_level=req.degree_level
            )
        except Exception as api_error:
            logger.error(f"Exa API error: {api_error}")
            raise HTTPException(
                status_code=503,
                detail="Search service temporarily unavailable. Please try again."
            )

        if not results or not results.results:
            logger.info("No results found")
            return []

        candidates = []
        for r in results.results:
            try:
                candidate = summarize_candidate(r, req.skills, req.role)

                # Filter by min years if specified
                if req.min_years and candidate["years_experience"]:
                    try:
                        years_str = candidate["years_experience"]
                        # Handle "Unknown" or non-numeric values
                        if years_str.lower() not in ["unknown", "n/a", ""]:
                            years = int(years_str)
                            if years < req.min_years:
                                continue
                    except (ValueError, TypeError):
                        pass  # Keep candidate if years can't be parsed

                # Filter by university if specified
                if req.university and candidate["education"]:
                    if req.university.lower() not in candidate["education"].lower():
                        continue

                # Filter by degree level if specified
                if req.degree_level and req.degree_level.lower() != 'any' and candidate["education"]:
                    degree_keywords = {
                        'phd': ['phd', 'ph.d', 'doctorate', 'doctoral'],
                        'masters': ['master', 'm.s', 'ms', 'msc', 'm.sc', 'mba'],
                        'bachelors': ['bachelor', 'b.s', 'bs', 'bsc', 'b.sc', 'b.a', 'ba']
                    }
                    keywords = degree_keywords.get(req.degree_level.lower(), [])
                    if keywords and not any(kw in candidate["education"].lower() for kw in keywords):
                        continue

                candidates.append(candidate)

            except Exception as e:
                logger.warning(f"Error processing candidate: {e}")
                continue

        # Sort by skill match, then score
        candidates.sort(key=lambda x: (x["skill_match"], x["score"]), reverse=True)

        result_count = min(len(candidates), MAX_RESULTS)
        logger.info(f"Returning {result_count} candidates")

        return candidates[:MAX_RESULTS]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Search error: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while searching. Please try again."
        )

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "version": "1.0.0",
        "environment": ENVIRONMENT
    }

@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "Sourcing Copilot API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }
