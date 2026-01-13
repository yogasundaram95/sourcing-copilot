# Sourcing Copilot

AI-powered candidate sourcing tool that uses semantic search to find professionals across LinkedIn, GitHub, academic profiles, and portfolios.

![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)
![React](https://img.shields.io/badge/React-19-61DAFB.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

## Features

- **Semantic Search**: Goes beyond keyword matching using Exa AI to understand context and relationships
- **Multi-Platform Search**: Find candidates on LinkedIn, GitHub, academic sites, and personal portfolios
- **Smart Filtering**: Filter by experience level, education, skills, and target companies
- **Skill Matching**: Automatic skill extraction and match percentage calculation
- **Contact Discovery**: Extracts email, LinkedIn, GitHub, and Twitter profiles
- **Modern UI**: Clean, responsive interface with real-time results

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Python, FastAPI, Pydantic |
| Frontend | React 19, Axios, Lucide Icons |
| Search API | [Exa AI](https://exa.ai) |
| Styling | CSS-in-JS |

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- Exa API Key ([Get one here](https://exa.ai))

### 1. Clone the Repository

```bash
git clone https://github.com/yogasundaram95/sourcing-copilot.git
cd sourcing-copilot
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp ../.env.example .env
# Edit .env and add your EXA_API_KEY

# Run the server
uvicorn main:app --reload --port 8005
```

### 3. Frontend Setup

```bash
cd frontend-react

# Install dependencies
npm install

# Start development server
npm start
```

### 4. Open the App

Visit `http://localhost:3000` in your browser.

## API Endpoints

### `POST /search`

Search for candidates matching specified criteria.

**Request Body:**
```json
{
  "role": "Senior Data Engineer",
  "skills": ["Python", "SQL", "AWS"],
  "companies": ["Google", "Meta"],
  "min_years": 5,
  "platform": "linkedin",
  "university": "MIT",
  "degree_level": "masters"
}
```

**Response:**
```json
[
  {
    "name": "John Doe",
    "url": "https://linkedin.com/in/johndoe",
    "summary": ["10+ years in data engineering", "AWS certified"],
    "score": 0.95,
    "skill_match": 100.0,
    "education": "Master's - MIT",
    "years_experience": "10",
    "contact": {
      "email": "john@example.com",
      "linkedin": "https://linkedin.com/in/johndoe"
    },
    "profile_type": "LinkedIn",
    "matched_skills": ["Python", "SQL", "AWS"]
  }
]
```

### `GET /health`

Health check endpoint.

### `GET /docs`

Interactive API documentation (Swagger UI).

## Configuration

Environment variables (in `.env`):

| Variable | Description | Default |
|----------|-------------|---------|
| `EXA_API_KEY` | Your Exa API key | Required |
| `API_PORT` | Backend server port | 8005 |
| `MAX_RESULTS` | Maximum candidates returned | 12 |
| `ENVIRONMENT` | `development` or `production` | development |
| `ALLOWED_ORIGINS` | CORS allowed origins | localhost:3000 |

## Project Structure

```
sourcing-copilot/
├── backend/
│   ├── main.py           # FastAPI application
│   ├── exa_client.py     # Exa API client & data extraction
│   └── requirements.txt  # Python dependencies
├── frontend-react/
│   ├── src/
│   │   ├── App.js        # Main React component
│   │   └── App.css       # Styles
│   └── package.json      # Node dependencies
├── .env.example          # Environment template
└── README.md
```

## Search Platforms

| Platform | Sources |
|----------|---------|
| LinkedIn | linkedin.com profiles |
| GitHub | github.com, gitlab.com profiles |
| Academic | Google Scholar, ResearchGate, arXiv |
| Portfolios | Personal websites, Notion, GitHub Pages |
| All | Combination of all sources |

## Skills & Features

**Built with:**
- Python
- FastAPI
- React
- Semantic Search
- REST API
- Data Extraction
- NLP

## Roadmap

- [ ] User authentication
- [ ] Saved searches & favorites
- [ ] Export to CSV
- [ ] Advanced filtering (location, salary)
- [ ] ATS integration
- [ ] Browser extension

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Author

**Yoga Sundaram**
- GitHub: [@yogasundaram95](https://github.com/yogasundaram95)

---

Built with [Exa AI](https://exa.ai) semantic search.
