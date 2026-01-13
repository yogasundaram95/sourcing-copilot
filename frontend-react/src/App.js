import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, ExternalLink, Mail, Linkedin, Github, Twitter,
  GraduationCap, Briefcase, Code, ArrowLeft, Copy,
  FileDown, X, AlertCircle
} from 'lucide-react';
import axios from 'axios';
import './App.css';

// API Configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8005';

// Helper to get match badge class
const getMatchClass = (score) => {
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
};

// Extract clean name from title
const extractName = (fullName) => {
  return fullName
    .replace(/^GitHub - /, '')
    .replace(/^Medium - /, '')
    .replace(/ – Medium$/, '')
    .split(':')[0]
    .split('|')[0]
    .trim();
};

export default function SourcingCopilot() {
  // State
  const [activeTab, setActiveTab] = useState('search');
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    role: '',
    skills: '',
    years: '',
    platform: 'all',
    degree: '',
    university: ''
  });

  // Selection state
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());

  // Sorting/filtering state
  const [sortBy, setSortBy] = useState('match');
  const [filterPlatform, setFilterPlatform] = useState('all');

  // Search history
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('sourcingSearchHistory');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && activeTab === 'search') {
        document.querySelector('form')?.requestSubmit();
      }
      if (e.key === 'Escape' && activeTab === 'results') {
        setActiveTab('search');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Form handler
  const handleInputChange = useCallback((e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  }, []);

  // Search handler
  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSelectedCandidates(new Set());

    try {
      const response = await axios.post(`${API_URL}/search`, {
        role: formData.role,
        skills: formData.skills.split(',').map(s => s.trim()).filter(s => s),
        min_years: formData.years ? parseInt(formData.years) : null,
        platform: formData.platform || null,
        university: formData.university || null,
        degree_level: formData.degree || null
      });

      setCandidates(response.data);
      setActiveTab('results');

      // Save to history
      const newSearch = {
        ...formData,
        timestamp: Date.now(),
        resultCount: response.data.length
      };
      const newHistory = [newSearch, ...searchHistory.filter(h =>
        h.role !== formData.role || h.skills !== formData.skills
      ).slice(0, 4)];
      setSearchHistory(newHistory);
      localStorage.setItem('sourcingSearchHistory', JSON.stringify(newHistory));

    } catch (err) {
      const message = err.response?.data?.detail || err.message || 'Search failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Load search from history
  const loadFromHistory = (search) => {
    setFormData({
      role: search.role || '',
      skills: search.skills || '',
      years: search.years || '',
      platform: search.platform || 'all',
      degree: search.degree || '',
      university: search.university || ''
    });
  };

  // Toggle candidate selection
  const toggleSelect = useCallback((url) => {
    setSelectedCandidates(prev => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  }, []);

  // Copy emails
  const copyEmails = useCallback(() => {
    const emails = candidates
      .filter(c => selectedCandidates.has(c.url) && c.contact?.email)
      .map(c => c.contact.email)
      .join(', ');

    if (emails) {
      navigator.clipboard.writeText(emails);
      setToast('Emails copied to clipboard!');
    } else {
      setToast('No emails found for selected candidates');
    }
  }, [candidates, selectedCandidates]);

  // Export to CSV
  const exportCSV = useCallback(() => {
    const selected = candidates.filter(c => selectedCandidates.has(c.url));
    const headers = ['Name', 'Profile URL', 'Email', 'LinkedIn', 'GitHub', 'Education', 'Experience', 'Skills', 'Match %'];
    const rows = selected.map(c => [
      extractName(c.name),
      c.url,
      c.contact?.email || '',
      c.contact?.linkedin || '',
      c.contact?.github || '',
      c.education || '',
      c.years_experience || '',
      c.matched_skills?.join('; ') || '',
      c.skill_match
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidates-${formData.role.replace(/\s+/g, '-')}-${Date.now()}.csv`;
    a.click();
    setToast(`Exported ${selected.length} candidates`);
  }, [candidates, selectedCandidates, formData.role]);

  // Sorted and filtered candidates
  const displayCandidates = useMemo(() => {
    let result = [...candidates];

    // Filter by platform
    if (filterPlatform !== 'all') {
      result = result.filter(c => c.profile_type?.toLowerCase() === filterPlatform);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'match') return (b.skill_match || 0) - (a.skill_match || 0);
      if (sortBy === 'experience') {
        const aYears = parseInt(a.years_experience) || 0;
        const bYears = parseInt(b.years_experience) || 0;
        return bYears - aYears;
      }
      return 0;
    });

    return result;
  }, [candidates, sortBy, filterPlatform]);

  // Get unique platforms for filter
  const platforms = useMemo(() => {
    const types = [...new Set(candidates.map(c => c.profile_type?.toLowerCase()).filter(Boolean))];
    return types;
  }, [candidates]);

  return (
    <div className="app">
      <div className="app-background" />

      <div className="container">
        {/* Search View */}
        {activeTab === 'search' && (
          <>
            <header className="header">
              <div className="header-badge">Powered by Exa AI</div>
              <h1 className="header-title">Sourcing Copilot</h1>
              <p className="header-subtitle">
                Find exceptional talent using AI-powered semantic search across LinkedIn, GitHub, and more.
              </p>
              <div className="header-stats">
                <div className="header-stat">
                  <div className="header-stat-value">Semantic</div>
                  <div className="header-stat-label">Search</div>
                </div>
                <div className="header-stat">
                  <div className="header-stat-value">Multi</div>
                  <div className="header-stat-label">Platform</div>
                </div>
                <div className="header-stat">
                  <div className="header-stat-value">Smart</div>
                  <div className="header-stat-label">Matching</div>
                </div>
              </div>
            </header>

            <div className="form-card">
              {error && (
                <div className="error-alert" role="alert">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                  <button onClick={() => setError(null)} aria-label="Dismiss">×</button>
                </div>
              )}

              <form onSubmit={handleSearch}>
                {/* Row 1: Role + Experience */}
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label htmlFor="role" className="form-label">Role Title</label>
                    <input
                      id="role"
                      type="text"
                      className="form-input"
                      placeholder="e.g., Senior Data Engineer"
                      required
                      value={formData.role}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="years" className="form-label">Experience</label>
                    <select id="years" className="form-select" value={formData.years} onChange={handleInputChange}>
                      <option value="">Any</option>
                      <option value="2">2+ years</option>
                      <option value="5">5+ years</option>
                      <option value="10">10+ years</option>
                      <option value="15">15+ years</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: Skills */}
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="skills" className="form-label">Skills (comma-separated)</label>
                    <input
                      id="skills"
                      type="text"
                      className="form-input"
                      placeholder="e.g., Python, SQL, AWS, Spark"
                      required
                      value={formData.skills}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Row 3: Platform + Degree */}
                <div className="form-row form-row-equal">
                  <div className="form-group">
                    <label htmlFor="platform" className="form-label">Platform</label>
                    <select id="platform" className="form-select" value={formData.platform} onChange={handleInputChange}>
                      <option value="all">All Platforms</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="github">GitHub</option>
                      <option value="academic">Academic</option>
                      <option value="portfolios">Portfolios</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="degree" className="form-label">Degree Level</label>
                    <select id="degree" className="form-select" value={formData.degree} onChange={handleInputChange}>
                      <option value="">Any</option>
                      <option value="phd">PhD</option>
                      <option value="masters">Master's</option>
                      <option value="bachelors">Bachelor's</option>
                    </select>
                  </div>
                </div>

                {/* Row 4: University */}
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="university" className="form-label">University (Optional)</label>
                    <select id="university" className="form-select" value={formData.university} onChange={handleInputChange}>
                      <option value="">Any University</option>
                      <optgroup label="Top US Universities">
                        <option value="MIT">MIT</option>
                        <option value="Stanford">Stanford</option>
                        <option value="Harvard">Harvard</option>
                        <option value="Carnegie Mellon">Carnegie Mellon</option>
                        <option value="UC Berkeley">UC Berkeley</option>
                        <option value="CalTech">CalTech</option>
                      </optgroup>
                      <optgroup label="Other Top Schools">
                        <option value="Georgia Tech">Georgia Tech</option>
                        <option value="University of Michigan">U of Michigan</option>
                        <option value="UT Austin">UT Austin</option>
                        <option value="UIUC">UIUC</option>
                      </optgroup>
                      <optgroup label="International">
                        <option value="Oxford">Oxford</option>
                        <option value="Cambridge">Cambridge</option>
                        <option value="IIT">IIT</option>
                      </optgroup>
                    </select>
                  </div>
                </div>

                {/* Submit */}
                <button type="submit" className="search-button" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="spinner" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search size={20} />
                      Find Candidates
                    </>
                  )}
                </button>

                <div className="keyboard-hint">
                  Press <kbd>Cmd</kbd>+<kbd>Enter</kbd> to search
                </div>
              </form>

              {/* Search History */}
              {searchHistory.length > 0 && (
                <div className="search-history">
                  <div className="search-history-title">Recent Searches</div>
                  <div className="search-history-list">
                    {searchHistory.slice(0, 5).map((search, i) => (
                      <button
                        key={i}
                        className="search-history-item"
                        onClick={() => loadFromHistory(search)}
                      >
                        {search.role} ({search.resultCount} results)
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Results View */}
        {activeTab === 'results' && (
          <div>
            <div className="results-header">
              <button className="back-button" onClick={() => setActiveTab('search')}>
                <ArrowLeft size={16} />
                Back to Search
              </button>

              <h2 className="results-title" aria-live="polite">
                {displayCandidates.length} Candidate{displayCandidates.length !== 1 ? 's' : ''} Found
              </h2>
            </div>

            {/* Search Context */}
            <div className="search-context">
              <span className="search-context-label">Searching:</span>
              <span className="search-context-value">{formData.role}</span>
              <span className="search-context-divider">with</span>
              <span className="search-context-value">{formData.skills}</span>
              {formData.years && (
                <>
                  <span className="search-context-divider">•</span>
                  <span className="search-context-tag">{formData.years}+ yrs</span>
                </>
              )}
              {formData.platform !== 'all' && (
                <>
                  <span className="search-context-divider">•</span>
                  <span className="search-context-tag">{formData.platform}</span>
                </>
              )}
            </div>

            {/* Controls */}
            {candidates.length > 0 && (
              <div className="results-controls">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="match">Sort by Match %</option>
                  <option value="experience">Sort by Experience</option>
                </select>

                {platforms.length > 1 && (
                  <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}>
                    <option value="all">All Platforms</option>
                    {platforms.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Empty State */}
            {candidates.length === 0 && (
              <div className="empty-state">
                <Search size={64} className="empty-state-icon" />
                <h3>No candidates found</h3>
                <p>Try adjusting your search criteria:</p>
                <ul>
                  <li>Use broader skill terms</li>
                  <li>Remove university filter</li>
                  <li>Lower experience requirement</li>
                  <li>Try "All Platforms"</li>
                </ul>
                <button className="search-button" onClick={() => setActiveTab('search')}>
                  Modify Search
                </button>
              </div>
            )}

            {/* Candidate Cards */}
            {displayCandidates.map((c, i) => (
              <article key={c.url} className="candidate-card">
                <div className="candidate-card-header">
                  <input
                    type="checkbox"
                    className="candidate-checkbox"
                    checked={selectedCandidates.has(c.url)}
                    onChange={() => toggleSelect(c.url)}
                    aria-label={`Select ${extractName(c.name)}`}
                  />

                  <div className="candidate-info">
                    <h3 className="candidate-name">{extractName(c.name)}</h3>

                    {c.education && (
                      <div className="candidate-meta">
                        <GraduationCap size={16} />
                        <span>{c.education}</span>
                      </div>
                    )}

                    {c.years_experience && c.years_experience !== "0" && (
                      <div className="candidate-meta">
                        <Briefcase size={16} />
                        <span>{c.years_experience}+ years experience</span>
                      </div>
                    )}
                  </div>

                  <div className="candidate-badges">
                    <span className={`candidate-badge badge-match ${getMatchClass(c.skill_match)}`}>
                      {c.skill_match}% Match
                    </span>
                    <span className="candidate-badge badge-platform">
                      {c.profile_type}
                    </span>
                  </div>
                </div>

                <div className="candidate-card-body">
                  {/* Highlights */}
                  {c.summary && c.summary.length > 0 && (
                    <div className="highlights-section">
                      <div className="section-title">
                        <Code size={14} />
                        Profile Highlights
                      </div>
                      <table className="highlights-table">
                        <tbody>
                          {c.summary.slice(0, 4).map((item, idx) => {
                            const [key, ...rest] = item.split(':');
                            const value = rest.join(':').trim();
                            return (
                              <tr key={idx}>
                                <td>{key}</td>
                                <td>{value}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Contact */}
                  {(c.contact?.email || c.contact?.linkedin || c.contact?.github || c.contact?.twitter) && (
                    <div className="contact-section">
                      <div className="section-title">Contact</div>
                      <div className="contact-grid">
                        {c.contact.email && (
                          <a href={`mailto:${c.contact.email}`} className="contact-link">
                            <Mail size={14} />
                            <span>{c.contact.email}</span>
                          </a>
                        )}
                        {c.contact.linkedin && (
                          <a href={c.contact.linkedin} target="_blank" rel="noopener noreferrer" className="contact-link">
                            <Linkedin size={14} />
                            <span>LinkedIn</span>
                          </a>
                        )}
                        {c.contact.github && (
                          <a href={c.contact.github} target="_blank" rel="noopener noreferrer" className="contact-link">
                            <Github size={14} />
                            <span>GitHub</span>
                          </a>
                        )}
                        {c.contact.twitter && (
                          <a href={c.contact.twitter} target="_blank" rel="noopener noreferrer" className="contact-link">
                            <Twitter size={14} />
                            <span>Twitter</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Matched Skills */}
                  {c.matched_skills && c.matched_skills.length > 0 && (
                    <div className="skills-section">
                      <div className="section-title">Matched Skills</div>
                      <div className="skills-list">
                        {c.matched_skills.map((skill, idx) => (
                          <span key={idx} className="skill-tag">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="quick-actions">
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="quick-action-btn view-profile-btn"
                    >
                      <ExternalLink size={14} />
                      View Profile
                    </a>

                    {c.contact?.email && (
                      <>
                        <button
                          className="quick-action-btn"
                          onClick={() => {
                            navigator.clipboard.writeText(c.contact.email);
                            setToast('Email copied!');
                          }}
                        >
                          <Copy size={14} />
                          Copy Email
                        </button>
                        <a
                          href={`mailto:${c.contact.email}?subject=Opportunity: ${formData.role}`}
                          className="quick-action-btn"
                        >
                          <Mail size={14} />
                          Draft Email
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Selection Bar */}
      {selectedCandidates.size > 0 && (
        <div className="selection-bar">
          <span className="selection-count">{selectedCandidates.size} selected</span>
          <button onClick={copyEmails}>
            <Copy size={14} /> Copy Emails
          </button>
          <button onClick={exportCSV} className="primary">
            <FileDown size={14} /> Export CSV
          </button>
          <button onClick={() => setSelectedCandidates(new Set())}>
            <X size={14} /> Clear
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
