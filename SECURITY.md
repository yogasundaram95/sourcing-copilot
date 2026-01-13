# Security Protocol

This document outlines the security measures implemented in Sourcing Copilot.

## Security Measures Implemented

### 1. API Key Protection
- **Environment Variables**: API keys stored in `.env` files, never in code
- **Git Ignored**: All `.env` files excluded via `.gitignore`
- **Template Provided**: `.env.example` shows required variables without real values

### 2. Backend Security
- **CORS Configuration**: Restricted origins in production mode
- **Input Validation**: Pydantic models validate all API inputs
  - Role: 2-100 characters
  - Skills: 1-20 items max
  - Companies: 10 max
  - Years: 0-50 range
  - Degree level: Whitelist validation
- **Error Handling**: Generic error messages to users, detailed logs server-side
- **Rate Limiting**: Inherits from Exa API limits

### 3. Frontend Security
- **No Secrets**: API URL configurable via environment variable
- **XSS Prevention**: React's built-in escaping
- **External Links**: `rel="noopener noreferrer"` on all external links
- **Input Sanitization**: Skills trimmed and filtered before API call

### 4. Data Privacy
- **No Data Storage**: Application doesn't store candidate data
- **Search History**: Stored in browser localStorage only (user-controlled)
- **No Tracking**: No analytics or tracking implemented

## Environment Setup

### Required Environment Variables

**Backend (`backend/.env`):**
```
EXA_API_KEY=your_key_here
ENVIRONMENT=development|production
ALLOWED_ORIGINS=https://yourdomain.com
```

**Frontend (`frontend-react/.env`):**
```
REACT_APP_API_URL=http://localhost:8005
```

## Production Checklist

Before deploying to production:

- [ ] Set `ENVIRONMENT=production` in backend
- [ ] Configure specific `ALLOWED_ORIGINS` (not wildcard)
- [ ] Use HTTPS for all connections
- [ ] Set up proper logging and monitoring
- [ ] Review API key permissions in Exa dashboard
- [ ] Enable rate limiting at infrastructure level

## Reporting Security Issues

If you discover a security vulnerability, please email the repository owner directly rather than opening a public issue.

## Security Best Practices for Users

1. **Never commit `.env` files** - Always use `.env.example` as template
2. **Rotate API keys** periodically
3. **Use environment-specific keys** - Different keys for dev/staging/prod
4. **Monitor API usage** in Exa dashboard for unusual activity
