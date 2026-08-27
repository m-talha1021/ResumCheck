export type AreaBreakdown = {
  formatting: number;
  keywords: number;
  experience: number;
  projects: number;
  education: number;
  professionalism: number;
};

export type AnalysisResult = {
  score: number;
  scoreLabel: string;
  strengths: string[];
  weaknesses: string[];
  missing_skills: string[];
  suggestions: string[];
  breakdown: AreaBreakdown;
  wordCount: number;
  engine: "gemini" | "heuristic";
};

export const LIMITS: AreaBreakdown = {
  formatting: 20,
  keywords: 25,
  experience: 20,
  projects: 15,
  education: 10,
  professionalism: 10,
};

export function calculateFinalScore(breakdown: Partial<AreaBreakdown>): number {
  return (Object.entries(LIMITS) as [keyof AreaBreakdown, number][])
    .reduce((total, [key, max]) => {
      const n = Number(breakdown[key]);
      return total + (Number.isFinite(n) ? Math.max(0, Math.min(max, Math.round(n))) : 0);
    }, 0);
}

function scoreLabel(score: number) {
  return score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 55 ? "Fair" : "Needs Improvement";
}

const SECTION_KEYWORDS = ["summary", "experience", "work experience", "education", "skills", "projects", "certifications"];
const SKILL_POOL = ["javascript", "typescript", "react", "node", "python", "sql", "git", "docker", "aws", "api", "testing", "agile", "communication", "leadership", "problem solving", "teamwork"];
const ACTION_VERBS = ["led", "built", "designed", "developed", "improved", "managed", "launched", "optimized", "increased", "reduced", "implemented", "created"];

export function heuristicAnalyze(resume: string): AnalysisResult {
  const text = resume.toLowerCase();
  const words = resume.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const sections = SECTION_KEYWORDS.filter(s => text.includes(s));
  const skills = SKILL_POOL.filter(s => text.includes(s));
  const verbs = ACTION_VERBS.filter(v => text.includes(v));
  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.]+/.test(resume);
  const hasPhone = /(\+?\d[\d\s()-]{7,}\d)/.test(resume);
  const hasLinks = /(linkedin|github|portfolio|https?:\/\/)/i.test(resume);
  const hasNumbers = /\d+%|\$\d|\b\d{2,}\b/.test(resume);

  const formatting = Math.round(Math.min(20, sections.length / SECTION_KEYWORDS.length * 20) + (hasEmail ? 1 : 0) + (hasPhone ? 1 : 0) + (hasLinks ? 1 : 0));
  const keywords = Math.round(Math.min(25, skills.length / SKILL_POOL.length * 25));
  const experience = Math.round(Math.min(20, verbs.length / 8 * 10 + (hasNumbers ? 10 : 3)));
  const projects = Math.round(Math.min(15, (text.includes("project") ? 8 : 2) + (hasNumbers ? 4 : 0) + (verbs.length >= 3 ? 3 : 0)));
  const education = Math.round(Math.min(10, (text.includes("education") ? 6 : 2) + (text.includes("certif") ? 4 : 0)));
  const professionalism = Math.round(Math.min(10, (wordCount >= 300 && wordCount <= 900 ? 5 : wordCount >= 150 ? 3 : 1) + (hasEmail ? 2 : 0) + (hasLinks ? 2 : 0) + (sections.length >= 5 ? 1 : 0)));

  const breakdown = { formatting, keywords, experience, projects, education, professionalism };
  const strengths: string[] = [];
  if (sections.length >= 5) strengths.push("Clear standard resume sections are present.");
  if (skills.length >= 5) strengths.push(`Relevant skills and keywords detected: ${skills.slice(0, 7).join(", ")}.`);
  if (hasNumbers) strengths.push("Quantified results or measurable details were detected.");
  if (verbs.length >= 4) strengths.push("Strong action verbs are used across the resume.");
  if (hasEmail && hasPhone) strengths.push("Contact information appears easy for ATS software to parse.");
  if (!strengths.length) strengths.push("Resume text was successfully parsed for ATS evaluation.");

  const weaknesses: string[] = [];
  if (sections.length < 5) weaknesses.push("Some standard resume sections are missing or unclear.");
  if (skills.length < 4) weaknesses.push("The resume contains relatively few recognizable skills/keywords.");
  if (!hasNumbers) weaknesses.push("Add measurable results to experience and project bullets.");
  if (!hasLinks) weaknesses.push("Consider adding a LinkedIn, GitHub, or portfolio link.");
  if (!hasPhone) weaknesses.push("No phone number was detected in the contact area.");
  if (wordCount < 250) weaknesses.push("The resume appears short and may need more evidence of impact.");
  if (!weaknesses.length) weaknesses.push("No major ATS weakness was detected by the fallback rules.");

  const missing_skills = SKILL_POOL.filter(s => !text.includes(s)).slice(0, 6);
  const suggestions = [
    "Mirror important keywords from the target job description in relevant sections.",
    "Start bullets with strong action verbs and include measurable outcomes where possible.",
    "Use standard section headings and a simple single-column layout for reliable ATS parsing.",
    "Keep dates, job titles, company names, and education details consistently formatted.",
    "Submit a text-based PDF rather than a scanned image whenever possible.",
  ];

  const score = calculateFinalScore(breakdown);
  return { score, scoreLabel: scoreLabel(score), strengths: strengths.slice(0, 6), weaknesses: weaknesses.slice(0, 6), missing_skills, suggestions, breakdown, wordCount, engine: "heuristic" };
}

function safeArray(value: unknown, fallback: string[]) {
  return Array.isArray(value) && value.length ? value.map(v => String(v)).slice(0, 8) : fallback;
}

function normalizeAreas(input: unknown, fallback: AreaBreakdown): AreaBreakdown {
  const source = (input && typeof input === "object") ? input as Record<string, unknown> : {};
  return {
    formatting: clamp(source.formatting, LIMITS.formatting, fallback.formatting),
    keywords: clamp(source.keywords, LIMITS.keywords, fallback.keywords),
    experience: clamp(source.experience, LIMITS.experience, fallback.experience),
    projects: clamp(source.projects, LIMITS.projects, fallback.projects),
    education: clamp(source.education, LIMITS.education, fallback.education),
    professionalism: clamp(source.professionalism, LIMITS.professionalism, fallback.professionalism),
  };
}

function clamp(value: unknown, max: number, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(max, Math.round(n))) : fallback;
}

export async function geminiAnalyze(resume: string): Promise<AnalysisResult | null> {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) return null;

  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const base = heuristicAnalyze(resume);

  const prompt = `You are an expert ATS resume evaluator.

Evaluate ONLY the six scoring areas below. Do not calculate or return an overall ATS score. The application will calculate the final score by summing the six area scores.

Maximum points:
- formatting: 20
- keywords: 25
- experience: 20
- projects: 15
- education: 10
- professionalism: 10

Scoring rules:
1. Award points only for evidence present in the resume.
2. Use whole numbers only.
3. Never exceed the maximum for any area.
4. Be conservative when evidence is borderline.
5. Do not invent skills, achievements, certifications, experience, or education.
6. Evaluate the resume itself, not hidden assumptions about the candidate.
7. Return exactly 5 concise strengths, 5 concise weaknesses, up to 6 missing skills, and 5 actionable suggestions.
8. Do NOT return an overall score or any field named score.

Return ONLY JSON:
{"breakdown":{"formatting":0,"keywords":0,"experience":0,"projects":0,"education":0,"professionalism":0},"strengths":[],"weaknesses":[],"missing_skills":[],"suggestions":[]}

RESUME:
${resume.slice(0, 24000)}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                breakdown: {
                  type: "OBJECT",
                  properties: {
                    formatting: { type: "INTEGER" },
                    keywords: { type: "INTEGER" },
                    experience: { type: "INTEGER" },
                    projects: { type: "INTEGER" },
                    education: { type: "INTEGER" },
                    professionalism: { type: "INTEGER" },
                  },
                  required: ["formatting", "keywords", "experience", "projects", "education", "professionalism"],
                },
                strengths: { type: "ARRAY", items: { type: "STRING" } },
                weaknesses: { type: "ARRAY", items: { type: "STRING" } },
                missing_skills: { type: "ARRAY", items: { type: "STRING" } },
                suggestions: { type: "ARRAY", items: { type: "STRING" } },
              },
              required: ["breakdown", "strengths", "weaknesses", "missing_skills", "suggestions"],
            },
            thinkingConfig: { thinkingLevel: "low" },
          },
        }),
      },
    );

    if (!response.ok) {
      console.error("Gemini API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const breakdown = normalizeAreas(parsed.breakdown, base.breakdown);
    const score = calculateFinalScore(breakdown);

    return {
      score,
      scoreLabel: scoreLabel(score),
      strengths: safeArray(parsed.strengths, base.strengths).slice(0, 5),
      weaknesses: safeArray(parsed.weaknesses, base.weaknesses).slice(0, 5),
      missing_skills: safeArray(parsed.missing_skills, base.missing_skills).slice(0, 6),
      suggestions: safeArray(parsed.suggestions, base.suggestions).slice(0, 5),
      breakdown,
      wordCount: base.wordCount,
      engine: "gemini",
    };
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return null;
  }
}
