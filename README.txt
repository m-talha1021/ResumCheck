# ResumCheck - Vercel

AI-powered resume ATS checker using Google Gemini with automatic model failover.

## Deploy to Vercel

1. Push this project to GitHub and import it into Vercel.
2. Add these Environment Variables in Vercel:

- `GEMINI_API_KEY` = your Google AI Studio API key
- `GEMINI_MODELS` = comma-separated Gemini models in priority order

Example:
`gemini-2.5-flash,gemini-2.5-flash-lite,gemini-2.0-flash,gemini-2.0-flash-lite`

The server tries each configured model in order. If a model is unavailable, rate-limited, overloaded, or returns an unusable response, it automatically moves to the next model. If all models fail, the deterministic local ATS analysis still returns a score and qualitative fallback feedback.

The numeric ATS score is deterministic and does not depend on which Gemini model succeeds.

## Local development

```bash
npm install
npm start
```

## API

- `POST /api/analyze`
- `POST /api/contact`
- `GET /api/health`

The Gemini API key is server-side only and is never exposed to the browser.

## Supported files

- PDF
- DOCX
- TXT
