# ResumCheck — TypeScript + Next.js + Netlify

This version keeps the TypeScript/Next.js architecture from the uploaded design while matching the earlier ResumCheck UI.

## Stack

- Next.js App Router
- TypeScript
- React
- Gemini 3.5 Flash
- PDF.js / Mammoth for client-side resume text extraction
- jsPDF for PDF report downloads

## ATS scoring

Gemini evaluates only six area scores:

- ATS Formatting & Structure — 20
- Skills & Keyword Relevance — 25
- Work Experience — 20
- Projects & Achievements — 15
- Education & Certifications — 10
- Content Quality & Professionalism — 10

The final score is calculated in application code by summing those six values. Gemini is not allowed to return an overall score.

## Netlify deployment

Netlify supports Next.js App Router and route handlers with its current OpenNext adapter.

Set:

- Build command: `npm run build`
- Publish directory: `.next`

Environment variables:

```text
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-3.5-flash
```

No database is required by this version.

## Local development

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
npm run start
```
