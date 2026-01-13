from exa_py import Exa
from typing import List, Optional, Dict
import os
import re
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

exa = Exa(api_key=os.environ.get("EXA_API_KEY"))

def search_candidates(role: str, skills: List[str], target_companies: Optional[List[str]] = None, min_years: Optional[int] = None, platform: Optional[str] = None, university: Optional[str] = None, degree_level: Optional[str] = None):
    """Search for candidates using Exa's semantic search."""
    skills_str = ", ".join(skills)
    query = f"personal website or LinkedIn profile or GitHub profile of a {role} with experience in {skills_str}"
    
    if min_years:
        query += f" with {min_years}+ years of experience"
    
    if target_companies:
        companies_str = " or ".join(target_companies)
        query += f" who has worked at {companies_str}"
    
    if university:
        query += f" who studied at {university}"
    
    if degree_level:
        degree_map = {
            'phd': 'PhD or Doctorate',
            'masters': "Master's degree",
            'bachelors': "Bachelor's degree"
        }
        query += f" with {degree_map.get(degree_level, degree_level)}"
    
    # Platform filtering
    domains = []
    if platform == "linkedin":
        domains = ["linkedin.com"]
    elif platform == "github":
        domains = ["github.com", "gitlab.com"]
    elif platform == "academic":
        domains = ["scholar.google.com", "researchgate.net", "arxiv.org", "semanticscholar.org"]
    elif platform == "portfolios":
        domains = ["vercel.app", "netlify.app", "github.io", "gitlab.io", "pages.dev", "notion.site"]
    else:
        domains = [
            "linkedin.com", "github.com", "gitlab.com",
            "dev.to", "medium.com", "substack.com", "hashnode.dev",
            "scholar.google.com", "researchgate.net", "arxiv.org", "semanticscholar.org",
            "vercel.app", "netlify.app", "github.io", "gitlab.io", "pages.dev",
            "notion.site", "webflow.io", "wixsite.com", "squarespace.com"
        ]
    
    results = exa.search_and_contents(
        query, 
        type="neural", 
        num_results=20,
        include_domains=domains
    )
    
    return results

def extract_years_experience(text: str) -> str:
    """Extract years of experience from text with better accuracy."""
    text_lower = text.lower()
    
    # Pattern 1: "X years of experience" or "X+ years"
    patterns = [
        r'(\d+)\+?\s*years?\s+(?:of\s+)?experience',
        r'(\d+)\+?\s*years?\s+(?:in|as|working)',
        r'experience[:\s]+(\d+)\+?\s*years?',
        r'(\d+)\+?\s*yrs?\s+(?:exp|experience)',
    ]
    
    max_years = 0
    for pattern in patterns:
        matches = re.findall(pattern, text_lower)
        for match in matches:
            years = int(match)
            if years > max_years and years < 50:  # Sanity check
                max_years = years
    
    # Pattern 2: Count job positions/roles mentioned
    job_indicators = ['senior', 'lead', 'principal', 'staff', 'architect', 'manager', 'director']
    job_count = sum(1 for indicator in job_indicators if indicator in text_lower)
    
    # Estimate based on seniority
    if 'principal' in text_lower or 'director' in text_lower or 'vp' in text_lower:
        max_years = max(max_years, 10)
    elif 'senior' in text_lower or 'lead' in text_lower or 'staff' in text_lower:
        max_years = max(max_years, 5)
    elif 'engineer' in text_lower or 'developer' in text_lower or 'analyst' in text_lower:
        max_years = max(max_years, 2)
    
    return str(max_years) if max_years > 0 else "2"

def extract_education(text: str) -> str:
    """Extract education information with better accuracy."""
    text_lower = text.lower()
    
    # University patterns
    universities = []
    uni_patterns = [
        r'(?:university of|uc |mit|stanford|harvard|carnegie mellon|berkeley|caltech|cornell|columbia|yale|princeton)\s+[\w\s]+',
        r'[\w\s]+\s+university',
        r'[\w\s]+\s+institute of technology',
        r'[\w\s]+\s+college'
    ]
    
    for pattern in uni_patterns:
        matches = re.findall(pattern, text_lower)
        universities.extend(matches[:2])  # Take first 2 matches
    
    # Degree patterns
    degrees = []
    if 'ph.d' in text_lower or 'phd' in text_lower or 'doctorate' in text_lower or 'doctoral' in text_lower:
        degrees.append('PhD')
    elif 'master' in text_lower or 'm.s.' in text_lower or 'm.sc' in text_lower or 'msc' in text_lower:
        degrees.append("Master's")
    elif 'bachelor' in text_lower or 'b.s.' in text_lower or 'b.sc' in text_lower or 'bsc' in text_lower or 'b.a.' in text_lower:
        degrees.append("Bachelor's")
    
    # Combine
    if degrees and universities:
        return f"{degrees[0]} - {universities[0].title()}"
    elif degrees:
        return degrees[0]
    elif universities:
        return universities[0].title()
    
    return ""

def extract_contact_info(text: str, url: str) -> Dict[str, str]:
    """Extract contact information from text and URL."""
    contact = {
        "email": "",
        "linkedin": "",
        "github": "",
        "twitter": ""
    }
    
    # Email
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    emails = re.findall(email_pattern, text)
    if emails:
        contact["email"] = emails[0]
    
    # LinkedIn
    if 'linkedin.com' in url:
        contact["linkedin"] = url
    linkedin_pattern = r'linkedin\.com/in/[\w-]+'
    linkedin_matches = re.findall(linkedin_pattern, text.lower())
    if linkedin_matches and not contact["linkedin"]:
        contact["linkedin"] = f"https://{linkedin_matches[0]}"
    
    # GitHub
    if 'github.com' in url:
        contact["github"] = url
    github_pattern = r'github\.com/[\w-]+'
    github_matches = re.findall(github_pattern, text.lower())
    if github_matches and not contact["github"]:
        contact["github"] = f"https://{github_matches[0]}"
    
    # Twitter
    twitter_pattern = r'twitter\.com/[\w-]+'
    twitter_matches = re.findall(twitter_pattern, text.lower())
    if twitter_matches:
        contact["twitter"] = f"https://{twitter_matches[0]}"
    
    return contact

def detect_profile_type(url: str) -> str:
    """Detect the type of profile based on URL."""
    url_lower = url.lower()
    
    if 'linkedin.com' in url_lower:
        return 'LinkedIn'
    elif 'github.com' in url_lower or 'gitlab.com' in url_lower:
        return 'GitHub'
    elif 'medium.com' in url_lower or 'substack.com' in url_lower or 'dev.to' in url_lower:
        return 'Blog'
    elif 'scholar.google' in url_lower or 'researchgate.net' in url_lower or 'arxiv.org' in url_lower:
        return 'Academic'
    else:
        return 'Portfolio'

def extract_projects(text: str) -> List[str]:
    """Extract project descriptions from text."""
    projects = []
    
    # Look for project indicators
    project_patterns = [
        r'(?:built|created|developed|designed)\s+([^.!?]{20,100})',
        r'(?:project|work):\s*([^.!?]{20,100})',
    ]
    
    for pattern in project_patterns:
        matches = re.findall(pattern, text.lower())
        projects.extend(matches[:3])
    
    return projects[:3]  # Return top 3

def summarize_candidate(result, required_skills: List[str], role: str) -> dict:
    """Enhanced candidate summarization with better data extraction."""
    text = result.text if hasattr(result, 'text') else ""
    url = result.url
    title = result.title if hasattr(result, 'title') else url
    
    # Extract years of experience
    years_exp = extract_years_experience(text)
    
    # Extract education
    education = extract_education(text)
    
    # Extract contact info
    contact = extract_contact_info(text, url)
    
    # Detect profile type
    profile_type = detect_profile_type(url)
    
    # Match skills
    matched_skills = []
    text_lower = text.lower()
    for skill in required_skills:
        if skill.lower() in text_lower:
            matched_skills.append(skill)
    
    skill_match = (len(matched_skills) / len(required_skills) * 100) if required_skills else 0
    
    # Extract projects
    projects = extract_projects(text)
    
    # Build summary
    summary = [
        f"Role: {role}",
        f"Experience: {years_exp}+ years",
    ]
    
    if education:
        summary.append(f"Education: {education}")
    
    if projects:
        summary.append(f"Projects: {', '.join(projects[:2])}")
    
    if matched_skills:
        summary.append(f"Skills: {', '.join(matched_skills[:5])}")
    
    summary.append(f"Platform: {profile_type}")
    
    # Publications (placeholder - would need specific extraction)
    publications = []
    
    return {
        "name": title,
        "url": url,
        "summary": summary,
        "score": result.score if hasattr(result, 'score') else 0.0,
        "skill_match": round(skill_match, 1),
        "publications": publications,
        "education": education,
        "years_experience": years_exp,
        "contact": contact,
        "profile_type": profile_type,
        "matched_skills": matched_skills
    }