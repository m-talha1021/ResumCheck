const API = {
  analyze: "/api/analyze",
  contact: "/api/contact"
};

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "txt"]);

let selectedFile = null;
let currentResult = null;
let inputMode = "file";
let lastSourceName = "Resume";

const $ = (id) => document.getElementById(id);
const fileInput = $("fileInput");
const dropzone = $("dropzone");
const analyzeButton = $("analyzeBtn");
const menuButton = $("menuBtn");
const mobileNav = $("mobileNav");
const fileModeBtn = $("fileModeBtn");
const textModeBtn = $("textModeBtn");

function showError(message) {
  $("errorMsg").textContent = message;
  $("errorMsg").classList.remove("hidden");
}

function clearError() {
  $("errorMsg").textContent = "";
  $("errorMsg").classList.add("hidden");
}

function setLoading(on, step = "Reading document structure...") {
  $("loadingOverlay").classList.toggle("hidden", !on);
  $("loadingStep").textContent = step;
  analyzeButton.disabled = on;
  analyzeButton.setAttribute("aria-busy", String(on));
}

function closeMobileNav() {
  mobileNav.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open navigation menu");
  menuButton.innerHTML = '<i class="fa-solid fa-bars"></i>';
}

menuButton.addEventListener("click", () => {
  const open = mobileNav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
  menuButton.innerHTML = open ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
});

document.querySelectorAll(".mobile-nav a").forEach((link) => link.addEventListener("click", closeMobileNav));
window.addEventListener("resize", () => { if (window.innerWidth > 760) closeMobileNav(); });

function handleSelectedFile(file) {
  if (file) validateFile(file);
}

function openFilePicker(event) {
  event?.preventDefault();
  fileInput.click();
}

dropzone.addEventListener("click", openFilePicker);
dropzone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});
fileInput.addEventListener("click", (event) => event.stopPropagation());
fileInput.addEventListener("change", (event) => handleSelectedFile(event.target.files?.[0]));

["dragenter", "dragover"].forEach((type) => dropzone.addEventListener(type, (event) => {
  event.preventDefault();
  event.stopPropagation();
  dropzone.classList.add("dragging");
}));
["dragleave", "drop"].forEach((type) => dropzone.addEventListener(type, (event) => {
  event.preventDefault();
  event.stopPropagation();
  dropzone.classList.remove("dragging");
}));
dropzone.addEventListener("drop", (event) => handleSelectedFile(event.dataTransfer?.files?.[0]));

function setInputMode(mode) {
  inputMode = mode;
  $("fileMode").classList.toggle("hidden", mode !== "file");
  $("textMode").classList.toggle("hidden", mode !== "text");
  fileModeBtn.classList.toggle("active", mode === "file");
  textModeBtn.classList.toggle("active", mode === "text");
  fileModeBtn.setAttribute("aria-selected", String(mode === "file"));
  textModeBtn.setAttribute("aria-selected", String(mode === "text"));
  clearError();
}

fileModeBtn.addEventListener("click", () => setInputMode("file"));
textModeBtn.addEventListener("click", () => setInputMode("text"));

function validateFile(file) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    showError("Please upload a PDF, DOCX, or TXT file.");
    fileInput.value = "";
    selectedFile = null;
    return false;
  }
  if (file.size === 0) {
    showError("The selected file is empty. Please choose a valid resume.");
    fileInput.value = "";
    selectedFile = null;
    return false;
  }
  if (file.size > MAX_FILE_SIZE) {
    showError("Please upload a resume smaller than 5 MB.");
    fileInput.value = "";
    selectedFile = null;
    return false;
  }
  selectedFile = file;
  lastSourceName = file.name;
  clearError();
  $("fileHeading").textContent = "File Selected";
  $("fileSub").textContent = file.name;
  $("fileName").textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  return true;
}

function getErrorMessage(response, data) {
  if (data && typeof data.error === "string" && data.error.trim()) return data.error;
  return `Request failed (HTTP ${response.status}).`;
}

$("analyzeForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

  const pastedText = ($("resumeText")?.value || "").trim();
  if (inputMode === "file" && !selectedFile) {
    showError("Please select a resume file (PDF, DOCX, or TXT).");
    return;
  }
  if (inputMode === "text") {
    if (!pastedText) {
      showError("Please paste your resume text.");
      return;
    }
    if (pastedText.length < 50) {
      showError("The resume content is too short to analyze reliably.");
      return;
    }
  }

  setLoading(true);
  let timer1;
  let timer2;
  try {
    timer1 = setTimeout(() => {
      if (!$('loadingOverlay').classList.contains('hidden')) $('loadingStep').textContent = 'Running AI & ATS evaluation...';
    }, 800);
    timer2 = setTimeout(() => {
      if (!$('loadingOverlay').classList.contains('hidden')) $('loadingStep').textContent = 'Computing your ATS score...';
    }, 1800);

    let response;
    if (inputMode === "text") {
      lastSourceName = "Pasted resume";
      response = await fetch(API.analyze, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ resumeText: pastedText })
      });
    } else {
      const formData = new FormData();
      formData.append("resume", selectedFile, selectedFile.name);
      response = await fetch(API.analyze, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" }
      });
    }

    const raw = await response.text();
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
    }
    if (!response.ok) throw new Error(getErrorMessage(response, data));

    currentResult = data;
    renderResult(data);
    $("resultSection").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error("Analyze request failed:", error);
    showError(error?.message || "An error occurred while analyzing your resume.");
  } finally {
    clearTimeout(timer1);
    clearTimeout(timer2);
    setLoading(false);
  }
});

function calculateScoreFromBreakdown(breakdown) {
  const limits = { formatting: 20, keywords: 25, experience: 20, projects: 15, education: 10, professionalism: 10 };
  return Object.entries(limits).reduce((total, [key, max]) => {
    const value = Number(breakdown?.[key]);
    const points = Number.isFinite(value) ? Math.max(0, Math.min(max, Math.round(value))) : 0;
    return total + points;
  }, 0);
}

function renderResult(result) {
  // Never use an overall score supplied by the AI. The UI derives it solely
  // by summing the six displayed area scores.
  const b = result.breakdown || {};
  const score = calculateScoreFromBreakdown(b);
  $("resultSection").classList.remove("hidden");
  $("scoreValue").textContent = `${score}%`;
  $("scoreRing").style.setProperty("--score", `${score}%`);
  $("scoreValue").style.color = score >= 75 ? "#059669" : score >= 55 ? "#d97706" : "#dc2626";
  $("scoreLabel").textContent = result.scoreLabel || scoreLabel(score);
  $("scoreDescription").textContent = score >= 80
    ? "Great job! Your resume aligns well with ATS requirements. Review the recommendations below for final improvements."
    : score >= 60
      ? "Your resume has a workable ATS foundation, but keyword, structure, and achievement improvements can raise the score."
      : "Your resume needs improvement. Apply the recommendations below to make it easier for ATS software and recruiters to evaluate.";

  const metrics = [
    ["ATS Formatting & Structure", b.formatting, 20],
    ["Skills & Keyword Relevance", b.keywords, 25],
    ["Work Experience", b.experience, 20],
    ["Projects & Achievements", b.projects, 15],
    ["Education & Certifications", b.education, 10],
    ["Content Quality & Professionalism", b.professionalism, 10]
  ];
  $("breakdownGrid").innerHTML = metrics.map(([name, value, max]) => {
    const points = Math.max(0, Math.min(max, Number(value) || 0));
    const percent = (points / max) * 100;
    return `<div class="metric"><div class="metric-top"><span>${esc(name)}</span><b>${points}/${max}</b></div><div class="metric-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${points}" aria-label="${esc(name)} score"><i style="width:${percent}%"></i></div></div>`;
  }).join("");

  renderList("strengths", result.strengths, "check");
  renderList("weaknesses", result.weaknesses, "exclamation");
  renderList("suggestions", result.suggestions, "arrow-right");
  const missing = Array.isArray(result.missing_skills) ? result.missing_skills : [];
  $("missingSkills").innerHTML = missing.length ? missing.map((skill) => `<span>+ ${esc(skill)}</span>`).join("") : "<span>No specific missing skills identified.</span>";
}

function renderList(id, items, icon) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  $(id).innerHTML = safeItems.length ? safeItems.map((item) => `<li><i class="fa-solid fa-${icon}"></i> ${esc(item)}</li>`).join("") : "<li>No items were identified.</li>";
}

function scoreLabel(score) {
  return score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 55 ? "Fair" : "Needs Improvement";
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (match) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[match]);
}

$("newAnalysis").addEventListener("click", () => {
  currentResult = null;
  selectedFile = null;
  lastSourceName = "Resume";
  fileInput.value = "";
  if ($("resumeText")) $("resumeText").value = "";
  setInputMode("file");
  $("fileHeading").textContent = "Drag & Drop Resume";
  $("fileSub").textContent = "or click here to browse files (.pdf, .docx, .txt)";
  $("fileName").textContent = "No file selected";
  clearError();
  $("resultSection").classList.add("hidden");
  $("upload").scrollIntoView({ behavior: "smooth", block: "start" });
});

function addPdfSectionTitle(doc, title, y) {
  if (y > 270) {
    doc.addPage();
    y = 18;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, 15, y);
  return y + 7;
}

function addPdfList(doc, items, y) {
  const safeItems = Array.isArray(items) && items.length ? items : ["None identified."];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const item of safeItems) {
    const lines = doc.splitTextToSize(`• ${String(item)}`, 178);
    if (y + lines.length * 5 > 280) {
      doc.addPage();
      y = 18;
    }
    doc.text(lines, 15, y);
    y += lines.length * 5 + 2;
  }
  return y;
}

function downloadPdfReport() {
  if (!currentResult) {
    showError("Please analyze a resume before downloading the report.");
    return;
  }

  if (!window.jspdf?.jsPDF) {
    showError("The PDF generator could not be loaded. Please refresh the page and try again.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const b = currentResult.breakdown || {};
  const score = calculateScoreFromBreakdown(b);
  const metrics = [
    ["ATS Formatting & Structure", b.formatting, 20],
    ["Skills & Keyword Relevance", b.keywords, 25],
    ["Work Experience", b.experience, 20],
    ["Projects & Achievements", b.projects, 15],
    ["Education & Certifications", b.education, 10],
    ["Content Quality & Professionalism", b.professionalism, 10]
  ];

  let y = 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("ResumCheck", 15, y);
  y += 8;
  doc.setFontSize(16);
  doc.text("Resume ATS Analysis Report", 15, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const resumeName = selectedFile?.name || currentResult.fileName || lastSourceName || "Uploaded resume";
  doc.text(`Resume: ${resumeName}`, 15, y);
  y += 5;
  doc.text(`Generated: ${new Date().toLocaleString()}`, 15, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(`ATS Score: ${score}/100`, 15, y);
  y += 10;

  y = addPdfSectionTitle(doc, "Score Breakdown", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const [name, value, max] of metrics) {
    const points = Math.max(0, Math.min(max, Number(value) || 0));
    doc.text(`${name}: ${points}/${max}`, 15, y);
    y += 6;
  }
  y += 3;

  y = addPdfSectionTitle(doc, "Strengths", y);
  y = addPdfList(doc, currentResult.strengths, y) + 3;

  y = addPdfSectionTitle(doc, "Weaknesses", y);
  y = addPdfList(doc, currentResult.weaknesses, y) + 3;

  y = addPdfSectionTitle(doc, "Missing Skills", y);
  y = addPdfList(doc, currentResult.missing_skills, y) + 3;

  y = addPdfSectionTitle(doc, "Actionable Suggestions", y);
  addPdfList(doc, currentResult.suggestions, y);

  const safeName = (resumeName || "resume").replace(/\.[^/.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "resume";
  doc.save(`ResumCheck-${safeName}-ATS-Report.pdf`);
}

$("downloadReport").addEventListener("click", downloadPdfReport);

$("contactForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("contactBtn");
  button.disabled = true;
  button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
  $("contactStatus").textContent = "";
  try {
    const response = await fetch(API.contact, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        name: $("contactName").value.trim(),
        email: $("contactEmail").value.trim(),
        subject: $("contactSubject").value.trim(),
        message: $("contactMessage").value.trim()
      })
    });
    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
    if (!response.ok) throw new Error(getErrorMessage(response, data));
    $("contactStatus").innerHTML = '<div class="alert success">Thank you! Your message was received successfully.</div>';
    $("contactForm").reset();
  } catch (error) {
    $("contactStatus").innerHTML = `<div class="alert error">${esc(error?.message || "Unable to send your message.")}</div>`;
  } finally {
    button.disabled = false;
    button.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Message';
  }
});

/* =========================================================
   DOWNLOAD ATS REPORT
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const downloadBtn = document.getElementById("downloadReport");

  if (!downloadBtn) return;

  downloadBtn.addEventListener("click", () => {
    try {
      if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("PDF generator is still loading. Please try again.");
        return;
      }

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const score =
        document.getElementById("scoreValue")?.textContent?.trim() || "0%";

      const label =
        document.getElementById("scoreLabel")?.textContent?.trim() || "";

      const description =
        document.getElementById("scoreDescription")?.textContent?.trim() || "";

      const breakdown =
        document.getElementById("breakdownGrid");

      const strengths =
        document.getElementById("strengths");

      const weaknesses =
        document.getElementById("weaknesses");

      const missingSkills =
        document.getElementById("missingSkills");

      const suggestions =
        document.getElementById("suggestions");

      let y = 20;

      /* ---------- Header ---------- */

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(24);
      pdf.setTextColor(37, 99, 235);
      pdf.text("ResumCheck", 20, y);

      y += 9;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 116, 139);
      pdf.text("AI-Powered Resume ATS Analysis Report", 20, y);

      y += 15;

      /* ---------- Score ---------- */

      pdf.setFillColor(245, 247, 251);
      pdf.roundedRect(20, y, 170, 38, 5, 5, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(28);
      pdf.setTextColor(37, 99, 235);
      pdf.text(score, 30, y + 18);

      pdf.setFontSize(11);
      pdf.setTextColor(30, 41, 59);
      pdf.text("ATS Score", 30, y + 27);

      pdf.setFontSize(13);
      pdf.text(label, 90, y + 17);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);

      const descLines = pdf.splitTextToSize(
        description || "Resume analysis completed.",
        85
      );

      pdf.text(descLines, 90, y + 24);

      y += 50;

      /* ---------- Section helper ---------- */

      function addSection(title) {
        if (y > 265) {
          pdf.addPage();
          y = 20;
        }

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(15);
        pdf.setTextColor(15, 23, 42);
        pdf.text(title, 20, y);

        y += 8;
      }

      function addItems(container, options = {}) {
        if (!container) return;

        const items = Array.from(container.children)
          .map(el => el.textContent.trim())
          .filter(Boolean);

        if (!items.length) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.setTextColor(100, 116, 139);
          pdf.text("No items available.", 22, y);
          y += 8;
          return;
        }

        items.forEach(item => {
          const lines = pdf.splitTextToSize(
            `${options.bullet || "•"} ${item}`,
            165
          );

          if (y + lines.length * 5 > 280) {
            pdf.addPage();
            y = 20;
          }

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9.5);
          pdf.setTextColor(51, 65, 85);

          pdf.text(lines, 23, y);

          y += lines.length * 5 + 3;
        });
      }

      /* ---------- Score Breakdown ---------- */

      addSection("Score Breakdown");

      if (breakdown) {
        const cards = Array.from(breakdown.children)
          .map(el => el.innerText.trim())
          .filter(Boolean);

        cards.forEach(item => {
          const lines = pdf.splitTextToSize(item, 165);

          if (y + lines.length * 5 > 280) {
            pdf.addPage();
            y = 20;
          }

          pdf.setFontSize(9.5);
          pdf.setTextColor(51, 65, 85);
          pdf.text(lines, 23, y);

          y += lines.length * 5 + 3;
        });
      }

      y += 5;

      /* ---------- Strengths ---------- */

      addSection("Strengths");
      addItems(strengths, { bullet: "✓" });

      y += 5;

      /* ---------- Areas to Fix ---------- */

      addSection("Areas to Fix");
      addItems(weaknesses, { bullet: "!" });

      y += 5;

      /* ---------- Missing Skills ---------- */

      addSection("Missing Skills");
      addItems(missingSkills, { bullet: "+" });

      y += 5;

      /* ---------- Suggestions ---------- */

      addSection("Actionable Suggestions");
      addItems(suggestions, { bullet: "→" });

      /* ---------- Footer ---------- */

      const pageCount = pdf.internal.getNumberOfPages();

      for (let page = 1; page <= pageCount; page++) {
        pdf.setPage(page);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);

        pdf.text(
          `ResumCheck • ATS Resume Analysis • Page ${page} of ${pageCount}`,
          20,
          290
        );
      }

      /* ---------- Download ---------- */

      const date = new Date()
        .toISOString()
        .slice(0, 10);

      pdf.save(`ResumCheck-ATS-Report-${date}.pdf`);

    } catch (error) {
      console.error("PDF generation failed:", error);
      alert(
        "Unable to generate the PDF report. Please try again."
      );
    }
  });
});
