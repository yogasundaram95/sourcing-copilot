from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from exa_client import search_candidates, summarize_candidate
import traceback
import re

app = FastAPI(title="Sourcing Copilot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SearchRequest(BaseModel):
    role: str
    skills: List[str]
    companies: Optional[List[str]] = None
    min_years: Optional[int] = None
    platform: Optional[str] = None
    university: Optional[str] = None
    degree_level: Optional[str] = None

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
    """Search for candidates using Exa API."""
    if not req.role or not req.skills:
        raise HTTPException(status_code=400, detail="Role and skills required")
    
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

        candidates = []
        for r in results.results:
            try:
                candidate = summarize_candidate(r, req.skills, req.role)
                
                # Filter by min years if specified (skip if years_experience is 0 or empty)
                if req.min_years and candidate["years_experience"] and candidate["years_experience"] != "0":
                    try:
                        years = int(candidate["years_experience"])
                        if years < req.min_years:
                            continue
                    except:
                        pass
                
                # Filter by university if specified
                if req.university and candidate["education"]:
                    if req.university.lower() not in candidate["education"].lower():
                        continue
                
                # Filter by degree level if specified
                if req.degree_level and candidate["education"]:
                    degree_keywords = {
                        'phd': ['phd', 'ph.d', 'doctorate', 'doctoral'],
                        'masters': ['master', 'm.s', 'ms', 'msc', 'm.sc'],
                        'bachelors': ['bachelor', 'b.s', 'bs', 'bsc', 'b.sc', 'b.a', 'ba']
                    }
                    keywords = degree_keywords.get(req.degree_level, [])
                    if not any(kw in candidate["education"].lower() for kw in keywords):
                        continue
                
                candidates.append(candidate)
            except Exception as e:
                print(f"Error summarizing result: {e}")
                continue
        
        # Sort by skill match, then score
        candidates.sort(key=lambda x: (x["skill_match"], x["score"]), reverse=True)
        
        return candidates[:12]
    
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"ERROR: {error_details}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok"}