"use client";

import { useRef, useState } from "react";

type Breakdown = {
  formatting: number;
  keywords: number;
  experience: number;
  projects: number;
  education: number;
  professionalism: number;
};

type Result = {
  score?: number;
  scoreLabel?: string;
  strengths: string[];
  weaknesses: string[];
  missing_skills: string[];
  suggestions: string[];
  breakdown: Breakdown;
  wordCount?: number;
  engine?: string;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED = new Set(["pdf", "docx", "txt"]);
const LIMITS: Breakdown = {
  formatting: 20,
  keywords: 25,
  experience: 20,
  projects: 15,
  education: 10,
  professionalism: 10,
};

function calculateScore(b: Breakdown): number {
  return Object.entries(LIMITS).reduce((sum, [key, max]) => {
    const n = Number(b?.[key as keyof Breakdown]);
    return sum + (Number.isFinite(n) ? Math.max(0, Math.min(max, Math.round(n))) : 0);
  }, 0);
}

function scoreLabel(score: number) {
  return score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 55 ? "Fair" : "Needs Improvement";
}

async function readPDF(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs`;
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => ("str" in item ? item.str : "")).join(" ") + "\n";
  }
  return text;
}

async function readDOCX(file: File): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser");
  return (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
}

async function readTXT(file: File): Promise<string> {
  return file.text();
}

async function downloadReport(result: Result, fileName: string) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  const score = calculateScore(result.breakdown);
  let y = 18;

  const pageBreak = (needed = 12) => {
    if (y + needed > 278) {
      pdf.addPage();
      y = 18;
    }
  };

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text("ResumCheck - ATS Resume Analysis Report", 15, y);
  y += 9;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(`Resume: ${fileName}`, 15, y);
  y += 5;
  pdf.text(`Generated: ${new Date().toLocaleString()}`, 15, y);

  y += 13;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(`ATS Score: ${score}/100`, 15, y);
  y += 9;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(scoreLabel(score), 15, y);

  y += 12;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("Score Breakdown", 15, y);
  y += 8;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  const metrics: [string, keyof Breakdown, number][] = [
    ["ATS Formatting & Structure", "formatting", 20],
    ["Skills & Keyword Relevance", "keywords", 25],
    ["Work Experience", "experience", 20],
    ["Projects & Achievements", "projects", 15],
    ["Education & Certifications", "education", 10],
    ["Content Quality & Professionalism", "professionalism", 10],
  ];

  for (const [label, key, max] of metrics) {
    pageBreak(7);
    pdf.text(`${label}: ${result.breakdown[key]}/${max}`, 15, y);
    y += 6;
  }

  const addList = (title: string, items: string[]) => {
    y += 5;
    pageBreak(12);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text(title, 15, y);
    y += 7;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    for (const item of items?.length ? items : ["None identified"]) {
      const lines = pdf.splitTextToSize(`• ${String(item)}`, 178);
      pageBreak(lines.length * 5 + 5);
      pdf.text(lines, 15, y);
      y += lines.length * 5 + 3;
    }
  };

  addList("Strengths", result.strengths);
  addList("Areas to Fix", result.weaknesses);
  addList("Missing Skills", result.missing_skills);
  addList("Actionable Suggestions", result.suggestions);

  const clean = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-");
  pdf.save(`ResumCheck-${clean || "Resume"}-ATS-Report.pdf`);
}

export default function UploadAnalyzer() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("Reading document structure...");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  function validateFile(f: File | null | undefined) {
    if (!f) return false;
    const ext = f.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED.has(ext)) {
      setError("Please upload a PDF, DOCX, or TXT file.");
      return false;
    }
    if (!f.size) {
      setError("The selected file is empty. Please choose a valid resume.");
      return false;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError("Please upload a resume smaller than 5 MB.");
      return false;
    }
    setError("");
    setFile(f);
    return true;
  }

  async function analyze(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Please select a resume file (PDF, DOCX, or TXT).");
      return;
    }

    setLoading(true);
    setLoadingStep("Reading document structure...");
    setResult(null);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const text = ext === "pdf" ? await readPDF(file) : ext === "docx" ? await readDOCX(file) : await readTXT(file);
      if (text.trim().length < 50) throw new Error("Could not extract enough text from this resume.");

      setLoadingStep("Running AI & ATS evaluation...");
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ resume: text, fileName: file.name }),
      });

      const raw = await response.text();
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch {
        throw new Error(`The analysis server returned an invalid response (HTTP ${response.status}).`);
      }
      if (!response.ok) throw new Error(data?.error || `Request failed (HTTP ${response.status}).`);

      const normalized: Result = {
        strengths: Array.isArray(data.strengths) ? data.strengths : [],
        weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses : [],
        missing_skills: Array.isArray(data.missing_skills) ? data.missing_skills : [],
        suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        breakdown: {
          formatting: Number(data.breakdown?.formatting) || 0,
          keywords: Number(data.breakdown?.keywords) || 0,
          experience: Number(data.breakdown?.experience) || 0,
          projects: Number(data.breakdown?.projects) || 0,
          education: Number(data.breakdown?.education) || 0,
          professionalism: Number(data.breakdown?.professionalism) || 0,
        },
        wordCount: data.wordCount,
        engine: data.engine,
      };
      setLoadingStep("Computing your ATS score...");
      setResult(normalized);
      setTimeout(() => document.getElementById("resultSection")?.scrollIntoView({ behavior: "smooth" }), 80);
    } catch (err) {
      setError((err as Error).message || "An error occurred while analyzing your resume.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setFile(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
    document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" });
  }

  const score = result ? calculateScore(result.breakdown) : 0;
  const metrics: [string, keyof Breakdown, number][] = [
    ["ATS Formatting & Structure", "formatting", 20],
    ["Skills & Keyword Relevance", "keywords", 25],
    ["Work Experience", "experience", 20],
    ["Projects & Achievements", "projects", 15],
    ["Education & Certifications", "education", 10],
    ["Content Quality & Professionalism", "professionalism", 10],
  ];

  return (
    <>
      {loading && (
        <div className="loading-overlay">
          <div className="loader" />
          <h3>Analyzing Resume...</h3>
          <p>{loadingStep}</p>
        </div>
      )}

      <section id="upload" className="section white">
        <div className="container narrow">
          <div className="section-head">
            <span>START YOUR ANALYSIS</span>
            <h2>Check Your Resume ATS Score</h2>
            <p>Upload your resume or drag and drop the file. Our analyzer will evaluate it and generate a detailed report.</p>
          </div>
          <div className="upload-card">
            <form onSubmit={analyze}>
              <div
                className={`upload-box${dragging ? " dragging" : ""}`}
                role="button"
                tabIndex={0}
                aria-label="Upload resume"
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); validateFile(e.dataTransfer.files?.[0]); }}
              >
                <i className="fa-solid fa-cloud-arrow-up" />
                <h3>{file ? "File Selected" : "Drag & Drop Resume"}</h3>
                <p>{file ? file.name : "or click here to browse files (.pdf, .docx, .txt)"}</p>
                <div className="file-name">{file ? `${file.name} (${(file.size / 1024).toFixed(1)} KB)` : "No file selected"}</div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  hidden
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => validateFile(e.target.files?.[0])}
                />
              </div>

              {error && <div className="alert error">{error}</div>}
              <button type="submit" className="analyze-btn" disabled={loading}>
                <i className="fa-solid fa-magnifying-glass" /> {loading ? "Analyzing..." : "Analyze Resume Now"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {result && (
        <section id="resultSection" className="section gray">
          <div className="container results">
            <div className="section-head">
              <span>AI RESUME ANALYSIS</span>
              <h2>Your Resume Analysis</h2>
              <p>Detailed evaluation against top ATS software standards and resume quality metrics.</p>
            </div>

            <div className="score-card">
              <div className="score-ring" style={{ ["--score" as string]: `${score}%` }}>
                <div><strong>{score}%</strong><small>ATS Score</small></div>
              </div>
              <h3>{scoreLabel(score)}</h3>
              <p>
                {score >= 80
                  ? "Great job! Your resume aligns well with ATS requirements. Review the recommendations below for final improvements."
                  : score >= 60
                    ? "Your resume has a workable ATS foundation, but keyword, structure, and achievement improvements can raise the score."
                    : "Your resume needs improvement. Apply the recommendations below to make it easier for ATS software and recruiters to evaluate."}
              </p>
            </div>

            <div className="breakdown">
              <h3><i className="fa-solid fa-sliders" /> Score Breakdown</h3>
              <div className="breakdown-grid">
                {metrics.map(([label, key, max]) => {
                  const points = Math.max(0, Math.min(max, Math.round(Number(result.breakdown[key]) || 0)));
                  return (
                    <div className="metric" key={key}>
                      <div className="metric-top"><span>{label}</span><b>{points}/{max}</b></div>
                      <div className="metric-bar"><i style={{ width: `${(points / max) * 100}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="insight-grid">
              <Insight className="strengths" icon="fa-solid fa-circle-check" title="Strengths" sub="What your resume does well" items={result.strengths} />
              <Insight className="weaknesses" icon="fa-solid fa-triangle-exclamation" title="Areas to Fix" sub="Weaknesses that hinder ATS scoring" items={result.weaknesses} />
              <Insight className="missing" icon="fa-solid fa-code" title="Missing Skills" sub="Keywords to consider adding" items={result.missing_skills} chips />
              <Insight className="suggestions" icon="fa-solid fa-lightbulb" title="Actionable Suggestions" sub="Step-by-step recommendations" items={result.suggestions} />
            </div>

            <div className="result-cta">
              <div>
                <i className="fa-solid fa-rocket" />
                <div>
                  <h3>Ready to improve your resume?</h3>
                  <p>Apply these suggestions, then download your PDF report or run another check to track progress.</p>
                </div>
              </div>
              <div className="cta-actions">
                <button className="white-btn" type="button" onClick={() => downloadReport(result, file?.name || "Resume")}>
                  <i className="fa-solid fa-file-pdf" /> Download Report
                </button>
                <button className="blue-btn" type="button" onClick={reset}>
                  <i className="fa-solid fa-rotate-right" /> Analyze Another Resume
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function Insight({
  className, icon, title, sub, items, chips = false,
}: { className: string; icon: string; title: string; sub: string; items: string[]; chips?: boolean }) {
  return (
    <article className={`insight ${className}`}>
      <header>
        <div><i className={icon} /></div>
        <span><h3>{title}</h3><small>{sub}</small></span>
      </header>
      {chips ? (
        <div className="chips">
          {(items?.length ? items : ["No obvious keyword gaps detected"]).map((item, i) => <span key={i}>+ {item}</span>)}
        </div>
      ) : (
        <ul>{(items?.length ? items : ["No items were identified."]).map((item, i) => <li key={i}>{item}</li>)}</ul>
      )}
    </article>
  );
}
