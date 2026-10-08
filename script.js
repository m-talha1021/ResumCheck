/* =========================================================
   RESUMCHECK — UPDATED FRONTEND SCRIPT
   ========================================================= */

(() => {
  "use strict";

  let currentAnalysis = null;
  let currentResumeText = "";
  let currentFileName = "";
  let selectedFile = null;

  const $ = (selector) =>
    document.querySelector(selector);

  const $$ = (selector) =>
    Array.from(document.querySelectorAll(selector));

  function setText(selector, value) {
    const element = $(selector);
    if (!element) return;

    element.textContent =
      value === undefined || value === null
        ? ""
        : String(value);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function cleanText(value) {
    return String(value ?? "")
      .replace(/\u200B/g, "")
      .replace(/\u200C/g, "")
      .replace(/\u200D/g, "")
      .replace(/\uFEFF/g, "")
      .replace(/\u00A0/g, " ")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/[ \t]+/g, " ")
      .trim();
  }

  const API_URL =
    window.RESUMCHECK_API_URL ||
    "/api/analyze";

  const uploadZone = $("#uploadZone");
  const fileInput = $("#fileInput");
  const resumeText = $("#resumeText");
  const analyzeButton = $("#analyzeButton");
  const resetButton = $("#resetButton");
  const downloadButton = $("#downloadButton");

  function setLoading(isLoading) {
    if (!analyzeButton) return;

    analyzeButton.disabled = Boolean(isLoading);

    if (isLoading) {
      if (!analyzeButton.dataset.originalText) {
        analyzeButton.dataset.originalText =
          analyzeButton.textContent;
      }

      analyzeButton.textContent = "Analyzing...";
    } else {
      analyzeButton.textContent =
        analyzeButton.dataset.originalText ||
        "Analyze Resume";

      delete analyzeButton.dataset.originalText;
    }
  }

  function setInputMode(mode) {
    document.body.dataset.inputMode = mode || "";
  }

  function updateWidgetCounts() {
    const text =
      cleanText(resumeText?.value || "");

    const words =
      text
        ? text.split(/\s+/).filter(Boolean).length
        : 0;

    const chars = text.length;

    setText(
      "#wordCount",
      `${words} words`
    );

    setText(
      "#charCount",
      `${chars} characters`
    );
  }

  function getFileName(file) {
    if (!file) return "";

    return (
      file.name ||
      file.originalFilename ||
      "resume"
    );
  }

  function isSupportedFile(file) {
    if (!file) return false;

    const name =
      getFileName(file).toLowerCase();

    const type =
      String(file.type || "").toLowerCase();

    return (
      type.includes("pdf") ||
      type.includes("word") ||
      type.includes("document") ||
      type.includes("text") ||
      name.endsWith(".pdf") ||
      name.endsWith(".doc") ||
      name.endsWith(".docx") ||
      name.endsWith(".txt")
    );
  }

  async function readFileAsText(file) {
    if (!file) {
      throw new Error(
        "No file selected."
      );
    }

    const name =
      getFileName(file).toLowerCase();

    if (name.endsWith(".txt")) {
      return cleanText(await file.text());
    }

    if (name.endsWith(".pdf")) {
      return extractPdfText(file);
    }

    if (name.endsWith(".docx")) {
      return extractDocxText(file);
    }

    if (name.endsWith(".doc")) {
      throw new Error(
        "Old .doc files are not supported directly in the browser. Please save the resume as .docx, PDF, or TXT."
      );
    }

    return cleanText(await file.text());
  }

  async function extractPdfText(file) {
    if (!window.pdfjsLib) {
      throw new Error(
        "PDF reader is not loaded. Add PDF.js to the page before script.js."
      );
    }

    const buffer =
      await file.arrayBuffer();

    const pdf =
      await window.pdfjsLib
        .getDocument({
          data: buffer
        })
        .promise;

    let output = "";

    for (
      let pageNumber = 1;
      pageNumber <= pdf.numPages;
      pageNumber++
    ) {
      const page =
        await pdf.getPage(pageNumber);

      const content =
        await page.getTextContent();

      const pageText =
        content.items
          .map((item) => item.str || "")
          .join(" ");

      output += pageText + "\n";
    }

    return cleanText(output);
  }

  async function extractDocxText(file) {
    if (!window.mammoth) {
      throw new Error(
        "DOCX reader is not loaded. Add Mammoth.js to the page before script.js."
      );
    }

    const buffer =
      await file.arrayBuffer();

    const result =
      await window.mammoth.extractRawText({
        arrayBuffer: buffer
      });

    return cleanText(
      result?.value || ""
    );
  }

  function showSelectedFile(file) {
    if (!file) return;

    selectedFile = file;
    currentFileName = getFileName(file);

    setInputMode("file");

    const fileNameElement =
      $("#fileName");

    if (fileNameElement) {
      fileNameElement.textContent =
        currentFileName;
    }

    const fileSizeElement =
      $("#fileSize");

    if (fileSizeElement) {
      const size =
        Number(file.size || 0);

      const kb =
        Math.max(
          1,
          Math.round(size / 1024)
        );

      fileSizeElement.textContent =
        `${kb} KB`;
    }

    uploadZone?.classList.add(
      "file-selected"
    );
  }

  function clearSelectedFile() {
    selectedFile = null;
    currentFileName = "";

    if (fileInput) {
      fileInput.value = "";
    }

    uploadZone?.classList.remove(
      "file-selected"
    );

    setText("#fileName", "");
    setText("#fileSize", "");
  }

  async function handleSelectedFile(file) {
    if (!file) return;

    if (!isSupportedFile(file)) {
      alert(
        "Please upload a PDF, DOCX, or TXT resume."
      );

      clearSelectedFile();
      return;
    }

    showSelectedFile(file);

    try {
      const text =
        await readFileAsText(file);

      currentResumeText =
        cleanText(text);

      if (resumeText) {
        resumeText.value =
          currentResumeText;
      }

      updateWidgetCounts();

      /*
      This makes the uploaded file visibly usable
      immediately. The Analyze button sends the
      extracted text to the API.
      */

      setInputMode("file");

    } catch (error) {
      console.error(
        "Resume file reading error:",
        error
      );

      clearSelectedFile();

      alert(
        error?.message ||
        "Unable to read the uploaded file."
      );
    }
  }

  /*
  =======================================================
  UPLOAD EVENTS
  =======================================================
  */

  if (uploadZone && fileInput) {
    /*
    Prevent duplicate click handlers and ensure that
    clicking ANYWHERE in the upload zone opens the
    native file picker.
    */

    uploadZone.addEventListener(
      "click",
      (event) => {
        if (
          event.target === fileInput ||
          event.target.closest(
            "button, a, input, label"
          )
        ) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        fileInput.click();
      }
    );

    uploadZone.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
          fileInput.click();
        }
      }
    );

    uploadZone.setAttribute(
      "tabindex",
      "0"
    );

    uploadZone.addEventListener(
      "dragover",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        uploadZone.classList.add(
          "dragging"
        );

        if (
          event.dataTransfer
        ) {
          event.dataTransfer.dropEffect =
            "copy";
        }
      }
    );

    uploadZone.addEventListener(
      "dragleave",
      (event) => {
        if (
          event.target === uploadZone
        ) {
          uploadZone.classList.remove(
            "dragging"
          );
        }
      }
    );

    uploadZone.addEventListener(
      "drop",
      async (event) => {
        event.preventDefault();
        event.stopPropagation();

        uploadZone.classList.remove(
          "dragging"
        );

        const file =
          event.dataTransfer?.files?.[0];

        if (file) {
          await handleSelectedFile(file);
        }
      }
    );

    fileInput.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();
      }
    );

    fileInput.addEventListener(
      "change",
      async (event) => {
        const file =
          event.target.files?.[0];

        await handleSelectedFile(file);
      }
    );
  }

  /*
  =======================================================
  TEXT INPUT
  =======================================================
  */

  if (resumeText) {
    resumeText.addEventListener(
      "input",
      () => {
        currentResumeText =
          cleanText(
            resumeText.value
          );

        if (currentResumeText) {
          setInputMode("text");
        }

        updateWidgetCounts();
      }
    );
  }

  /*
  =======================================================
  SCORE HELPERS
  =======================================================
  */

  function normalizeScore(score) {
    const number =
      Number(score);

    if (Number.isNaN(number)) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(number)
      )
    );
  }

  function getScoreDescription(score) {
    const value =
      Number(score || 0);

    if (value >= 90) {
      return "Excellent ATS readiness. Your resume is highly optimized for automated screening.";
    }

    if (value >= 80) {
      return "Strong ATS readiness. A few improvements can make the resume even more competitive.";
    }

    if (value >= 70) {
      return "Good ATS readiness, but several areas can still be improved.";
    }

    if (value >= 60) {
      return "Moderate ATS readiness. Consider addressing the highlighted issues before applying.";
    }

    if (value >= 40) {
      return "Your resume needs several improvements to perform well in ATS screening.";
    }

    return "Your resume needs significant improvements before it is ready for ATS screening.";
  }

  /*
  =======================================================
  ANALYSIS NORMALIZATION
  =======================================================
  */

  function getAnalysisFileName(
    analysis
  ) {
    return (
      analysis?.resumeFileName ||
      analysis?.reportMeta?.resumeFileName ||
      analysis?.fileName ||
      currentFileName ||
      selectedFile?.name ||
      "Pasted Resume"
    );
  }

  function normalizeList(value) {
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (
            typeof item === "string"
          ) {
            return cleanText(item);
          }

          return cleanText(
            item?.text ||
            item?.description ||
            item?.name ||
            ""
          );
        })
        .filter(Boolean);
    }

    if (
      typeof value === "string"
    ) {
      return value
        .split(/\n+/)
        .map(cleanText)
        .filter(Boolean);
    }

    return [];
  }

  function normalizeAnalysis(
    analysis
  ) {
    const result =
      analysis || {};

    const fileName =
      getAnalysisFileName(
        result
      );

    return {
      ...result,

      score:
        normalizeScore(
          result.score
        ),

      fileName,

      resumeFileName:
        fileName,

      reportMeta: {
        ...(result.reportMeta || {}),

        resumeFileName:
          result.reportMeta
            ?.resumeFileName ||
          fileName,

        fileName:
          result.reportMeta
            ?.fileName ||
          fileName
      },

      strengths:
        normalizeList(
          result.strengths
        ).slice(0, 8),

      weaknesses:
        normalizeList(
          result.weaknesses ||
          result.areasToFix
        ).slice(0, 8),

      missingSkills:
        normalizeList(
          result.missingSkills ||
          result.missing_skills
        ).slice(0, 8),

      suggestions:
        normalizeList(
          result.suggestions
        ).slice(0, 8)
    };
  }

  /*
  =======================================================
  RESULT RENDERING
  =======================================================
  */

  function renderScore(
    analysis
  ) {
    const score =
      normalizeScore(
        analysis?.score
      );

    setText(
      "#scoreValue",
      `${score}%`
    );

    setText(
      "#scoreLabel",
      analysis?.scoreLabel ||
      "ATS Score"
    );

    setText(
      "#scoreDescription",
      getScoreDescription(score)
    );
  }

  function renderBreakdown(
    breakdown
  ) {
    const container =
      $("#breakdown");

    if (!container) return;

    const data =
      breakdown || {};

    const labels = {
      formatting: "Formatting",
      keywords: "Keywords",
      experience: "Experience",
      projects: "Projects",
      education: "Education",
      professionalism:
        "Professionalism"
    };

    const limits = {
      formatting: 20,
      keywords: 25,
      experience: 20,
      projects: 15,
      education: 10,
      professionalism: 10
    };

    container.innerHTML =
      Object.keys(limits)
        .map((key) => {
          const value =
            Number(
              data[key] || 0
            );

          const max =
            limits[key];

          const percentage =
            max
              ? Math.max(
                  0,
                  Math.min(
                    100,
                    (value / max) *
                      100
                  )
                )
              : 0;

          return `
            <div class="breakdown-item">
              <div class="breakdown-top">
                <span>${escapeHtml(
                  labels[key]
                )}</span>
                <strong>${value}/${max}</strong>
              </div>

              <div class="progress-track">
                <div
                  class="progress-fill"
                  style="width:${percentage}%"
                ></div>
              </div>
            </div>
          `;
        })
        .join("");
  }

  function renderList(
    selector,
    items,
    emptyText
  ) {
    const container =
      $(selector);

    if (!container) return;

    const list =
      normalizeList(items);

    if (!list.length) {
      container.innerHTML =
        `<div class="empty-state">${escapeHtml(
          emptyText
        )}</div>`;

      return;
    }

    container.innerHTML =
      list
        .map(
          (item, index) => `
            <div class="result-item">
              <span class="result-number">
                ${index + 1}
              </span>
              <span class="result-text">
                ${escapeHtml(item)}
              </span>
            </div>
          `
        )
        .join("");
  }

  function renderCandidateName(
    analysis
  ) {
    setText(
      "#candidateName",
      cleanText(
        analysis?.candidateName ||
        "Candidate"
      )
    );
  }

  function renderAnalysis(
    analysis
  ) {
    currentAnalysis =
      normalizeAnalysis(
        analysis
      );

    renderScore(
      currentAnalysis
    );

    renderCandidateName(
      currentAnalysis
    );

    renderBreakdown(
      currentAnalysis.breakdown
    );

    renderList(
      "#strengths",
      currentAnalysis.strengths,
      "No strengths were returned by the AI analysis."
    );

    renderList(
      "#weaknesses",
      currentAnalysis.weaknesses,
      "No weaknesses were returned by the AI analysis."
    );

    renderList(
      "#missingSkills",
      currentAnalysis.missingSkills,
      "No missing skills were returned by the AI analysis."
    );

    renderList(
      "#suggestions",
      currentAnalysis.suggestions,
      "No suggestions were returned by the AI analysis."
    );

    const resultSection =
      $("#results");

    if (resultSection) {
      resultSection.classList.add(
        "visible"
      );

      resultSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }

  /*
  =======================================================
  API REQUEST
  =======================================================
  */

  async function analyzeResume(
    text,
    fileName
  ) {
    const payload = {
      text:
        cleanText(text),

      fileName:
        fileName ||
        currentFileName ||
        "Pasted Resume"
    };

    const response =
      await fetch(
        API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "Accept":
              "application/json"
          },

          body:
            JSON.stringify(
              payload
            )
        }
      );

    let data = null;

    try {
      data =
        await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(
        data?.error ||
        data?.message ||
        `Analysis failed (${response.status}).`
      );
    }

    if (!data) {
      throw new Error(
        "The server returned an empty response."
      );
    }

    return data;
  }

  /*
  =======================================================
  ANALYZE BUTTON
  =======================================================
  */

  if (analyzeButton) {
    analyzeButton.addEventListener(
      "click",
      async () => {
        const text =
          cleanText(
            resumeText?.value ||
            currentResumeText
          );

        if (!text) {
          alert(
            "Please upload a resume or paste your resume text first."
          );

          return;
        }

        setLoading(true);

        try {
          const analysis =
            await analyzeResume(
              text,
              currentFileName ||
              selectedFile?.name ||
              "Pasted Resume"
            );

          renderAnalysis(
            analysis
          );
        } catch (error) {
          console.error(
            "Resume analysis error:",
            error
          );

          alert(
            error?.message ||
            "Unable to analyze the resume."
          );
        } finally {
          setLoading(false);
        }
      }
    );
  }

  /*
  =======================================================
  RESET
  =======================================================
  */

  if (resetButton) {
    resetButton.addEventListener(
      "click",
      () => {
        currentAnalysis = null;
        currentResumeText = "";

        clearSelectedFile();

        if (resumeText) {
          resumeText.value = "";
        }

        const results =
          $("#results");

        if (results) {
          results.classList.remove(
            "visible"
          );
        }

        setInputMode("");
        updateWidgetCounts();
      }
    );
  }

  /*
  =======================================================
  PDF LIBRARY LOADER
  =======================================================
  */

  function loadJsPDF() {
    return new Promise(
      (resolve, reject) => {
        if (
          window.jspdf?.jsPDF
        ) {
          resolve(
            window.jspdf.jsPDF
          );

          return;
        }

        const existing =
          document.querySelector(
            'script[data-resumcheck-jspdf="true"]'
          );

        if (existing) {
          existing.addEventListener(
            "load",
            () => {
              if (
                window.jspdf?.jsPDF
              ) {
                resolve(
                  window.jspdf.jsPDF
                );
              } else {
                reject(
                  new Error(
                    "jsPDF loaded but was not available."
                  )
                );
              }
            },
            { once: true }
          );

          existing.addEventListener(
            "error",
            () => {
              reject(
                new Error(
                  "Unable to load jsPDF."
                )
              );
            },
            { once: true }
          );

          return;
        }

        const script =
          document.createElement(
            "script"
          );

        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js";

        script.async = true;

        script.dataset.resumcheckJspdf =
          "true";

        script.onload = () => {
          if (
            window.jspdf?.jsPDF
          ) {
            resolve(
              window.jspdf.jsPDF
            );
          } else {
            reject(
              new Error(
                "jsPDF loaded but was not available."
              )
            );
          }
        };

        script.onerror = () => {
          const fallback =
            document.createElement(
              "script"
            );

          fallback.src =
            "https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js";

          fallback.async = true;

          fallback.onload = () => {
            if (
              window.jspdf?.jsPDF
            ) {
              resolve(
                window.jspdf.jsPDF
              );
            } else {
              reject(
                new Error(
                  "Unable to initialize jsPDF."
                )
              );
            }
          };

          fallback.onerror = () => {
            reject(
              new Error(
                "Unable to load jsPDF."
              )
            );
          };

          document.head.appendChild(
            fallback
          );
        };

        document.head.appendChild(
          script
        );
      }
    );
  }

  /*
  =======================================================
  PDF HELPERS
  =======================================================
  */

  function cleanPdfText(value) {
    return String(value ?? "")
      .replace(
        /[\u200B-\u200D\uFEFF]/g,
        ""
      )
      .replace(/\u00A0/g, " ")
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .trim();
  }

  function getResumeFileName() {
    return (
      cleanPdfText(
        currentAnalysis?.resumeFileName ||
        currentAnalysis?.reportMeta?.resumeFileName ||
        currentAnalysis?.fileName ||
        currentFileName ||
        "Pasted Resume"
      ) ||
      "Pasted Resume"
    );
  }

  function makeSafeFileName(
    value
  ) {
    const cleaned =
      String(
        value || "Resume"
      )
        .replace(
          /\.[^/.]+$/,
          ""
        )
        .replace(
          /[<>:"/\\|?*\x00-\x1F]/g,
          ""
        )
        .replace(
          /\s+/g,
          "-"
        )
        .replace(
          /-+/g,
          "-"
        )
        .replace(
          /^-|-$/g,
          ""
        )
        .slice(0, 80);

    return (
      cleaned ||
      "Resume"
    );
  }

  function getTextItems(
    selector
  ) {
    const container =
      $(selector);

    if (!container) {
      return [];
    }

    return Array.from(
      container.children
    )
      .map(
        (element) =>
          cleanPdfText(
            element.textContent
          )
      )
      .filter(Boolean);
  }

  const PDF_CONTENT_BOTTOM = 270;
  const PDF_FOOTER_Y = 289;

  function addPdfPageIfNeeded(
    pdf,
    state,
    requiredHeight = 15
  ) {
    if (
      state.y +
        requiredHeight >
      PDF_CONTENT_BOTTOM
    ) {
      pdf.addPage();
      state.y = 20;
    }
  }

  function addPdfSection(
    pdf,
    state,
    title
  ) {
    addPdfPageIfNeeded(
      pdf,
      state,
      25
    );

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(15);

    pdf.setTextColor(
      15,
      23,
      42
    );

    pdf.text(
      cleanPdfText(title),
      20,
      state.y
    );

    state.y += 7;

    pdf.setDrawColor(
      226,
      232,
      240
    );

    pdf.line(
      20,
      state.y,
      190,
      state.y
    );

    state.y += 7;
  }

  function drawPdfBullet(
    pdf,
    x,
    y,
    bullet
  ) {
    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(10);

    pdf.setTextColor(
      37,
      99,
      235
    );

    pdf.text(
      bullet || "-",
      x,
      y
    );
  }

  function addPdfItems(
    pdf,
    state,
    items,
    bullet = "-"
  ) {
    const safeItems =
      Array.isArray(items)
        ? items
            .map(cleanPdfText)
            .filter(Boolean)
        : [];

    if (!safeItems.length) {
      addPdfPageIfNeeded(
        pdf,
        state,
        10
      );

      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.setFontSize(9);

      pdf.setTextColor(
        148,
        163,
        184
      );

      pdf.text(
        "No items available.",
        30,
        state.y
      );

      state.y += 8;

      return;
    }

    safeItems.forEach(
      (item) => {
        const textX = 31;
        const textWidth = 157;

        const lines =
          pdf.splitTextToSize(
            item,
            textWidth
          );

        const lineHeight = 4.8;

        const requiredHeight =
          Math.max(
            8,
            lines.length *
              lineHeight +
              4
          );

        addPdfPageIfNeeded(
          pdf,
          state,
          requiredHeight
        );

        drawPdfBullet(
          pdf,
          24,
          state.y,
          bullet
        );

        pdf.setFont(
          "helvetica",
          "normal"
        );

        pdf.setFontSize(9.5);

        pdf.setTextColor(
          51,
          65,
          85
        );

        pdf.text(
          lines,
          textX,
          state.y
        );

        state.y +=
          lines.length *
            lineHeight +
          4;
      }
    );
  }

  function addPdfFileInfo(
    pdf,
    state,
    resumeFileName
  ) {
    const text =
      `Resume: ${cleanPdfText(
        resumeFileName
      )}`;

    const lines =
      pdf.splitTextToSize(
        text,
        170
      );

    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.setFontSize(9);

    pdf.setTextColor(
      71,
      85,
      105
    );

    pdf.text(
      lines,
      20,
      state.y
    );

    state.y +=
      lines.length *
        4.5 +
      6;
  }

  function addPdfFooters(
    pdf
  ) {
    const totalPages =
      pdf.internal.getNumberOfPages();

    for (
      let page = 1;
      page <= totalPages;
      page++
    ) {
      pdf.setPage(page);

      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.setFontSize(8);

      pdf.setTextColor(
        148,
        163,
        184
      );

      pdf.text(
        `ResumCheck | ATS Resume Analysis | Page ${page} of ${totalPages}`,
        20,
        PDF_FOOTER_Y
      );
    }
  }

  async function createPDFReport() {
    const jsPDF =
      await loadJsPDF();

    if (!currentAnalysis) {
      throw new Error(
        "No resume analysis is available."
      );
    }

    const pdf =
      new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

    const state = {
      y: 20
    };

    const score =
      Number(
        currentAnalysis.score || 0
      );

    const label =
      cleanPdfText(
        currentAnalysis.scoreLabel ||
        "ATS Score"
      );

    const description =
      cleanPdfText(
        getScoreDescription(score)
      );

    const resumeFileName =
      getResumeFileName();

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(25);

    pdf.setTextColor(
      37,
      99,
      235
    );

    pdf.text(
      "ResumCheck",
      20,
      state.y
    );

    state.y += 8;

    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.setFontSize(10);

    pdf.setTextColor(
      100,
      116,
      139
    );

    pdf.text(
      "AI-Powered Resume ATS Analysis Report",
      20,
      state.y
    );

    state.y += 8;

    addPdfFileInfo(
      pdf,
      state,
      resumeFileName
    );

    pdf.setFillColor(
      245,
      247,
      251
    );

    pdf.roundedRect(
      20,
      state.y,
      170,
      42,
      6,
      6,
      "F"
    );

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(29);

    pdf.setTextColor(
      37,
      99,
      235
    );

    pdf.text(
      `${score}%`,
      30,
      state.y + 19
    );

    pdf.setFontSize(10);

    pdf.setTextColor(
      71,
      85,
      105
    );

    pdf.text(
      "ATS SCORE",
      30,
      state.y + 28
    );

    pdf.setFontSize(14);

    pdf.setTextColor(
      15,
      23,
      42
    );

    pdf.text(
      label,
      90,
      state.y + 17
    );

    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.setFontSize(9);

    pdf.setTextColor(
      100,
      116,
      139
    );

    const descriptionLines =
      pdf.splitTextToSize(
        description,
        88
      );

    pdf.text(
      descriptionLines,
      90,
      state.y + 25
    );

    state.y += 55;

    addPdfSection(
      pdf,
      state,
      "Score Breakdown"
    );

    const breakdown =
      currentAnalysis.breakdown ||
      {};

    const breakdownLabels = {
      formatting: "Formatting",
      keywords: "Keywords",
      experience: "Experience",
      projects: "Projects",
      education: "Education",
      professionalism:
        "Professionalism"
    };

    const breakdownLimits = {
      formatting: 20,
      keywords: 25,
      experience: 20,
      projects: 15,
      education: 10,
      professionalism: 10
    };

    Object.entries(
      breakdownLimits
    ).forEach(
      ([key, max]) => {
        const value =
          Number(
            breakdown[key] || 0
          );

        addPdfItems(
          pdf,
          state,
          [
            `${breakdownLabels[key]}: ${value}/${max}`
          ],
          "-"
        );
      }
    );

    addPdfSection(
      pdf,
      state,
      "Strengths"
    );

    addPdfItems(
      pdf,
      state,
      getTextItems(
        "#strengths"
      ),
      "+"
    );

    addPdfSection(
      pdf,
      state,
      "Areas to Fix"
    );

    addPdfItems(
      pdf,
      state,
      getTextItems(
        "#weaknesses"
      ),
      "!"
    );

    addPdfSection(
      pdf,
      state,
      "Missing Skills"
    );

    addPdfItems(
      pdf,
      state,
      getTextItems(
        "#missingSkills"
      ),
      "+"
    );

    addPdfSection(
      pdf,
      state,
      "Actionable Suggestions"
    );

    addPdfItems(
      pdf,
      state,
      getTextItems(
        "#suggestions"
      ),
      ">"
    );

    addPdfFooters(pdf);

    const date =
      new Date()
        .toISOString()
        .slice(0, 10);

    const safeResumeName =
      makeSafeFileName(
        resumeFileName
      );

    pdf.save(
      `ResumCheck-ATS-Report-${safeResumeName}-${date}.pdf`
    );
  }

  /*
  =======================================================
  DOWNLOAD BUTTON
  =======================================================
  */

  if (downloadButton) {
    downloadButton.addEventListener(
      "click",
      async () => {
        if (!currentAnalysis) {
          alert(
            "Please analyze a resume before downloading the report."
          );

          return;
        }

        const originalText =
          downloadButton.textContent;

        try {
          downloadButton.disabled =
            true;

          downloadButton.textContent =
            "Generating PDF...";

          await createPDFReport();
        } catch (error) {
          console.error(
            "PDF generation error:",
            error
          );

          alert(
            error?.message ||
            "Unable to generate the PDF report."
          );
        } finally {
          downloadButton.disabled =
            false;

          downloadButton.textContent =
            originalText ||
            "Download PDF";
        }
      }
    );
  }

  /*
  =======================================================
  CONTACT FORM
  =======================================================
  */

  const contactForm =
    $("#contactForm");

  if (contactForm) {
    contactForm.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();

        const formData =
          new FormData(
            contactForm
          );

        const name =
          cleanText(
            formData.get("name") ||
            ""
          );

        const email =
          cleanText(
            formData.get("email") ||
            ""
          );

        const message =
          cleanText(
            formData.get("message") ||
            ""
          );

        if (!name) {
          alert(
            "Please enter your name."
          );
          return;
        }

        if (!email) {
          alert(
            "Please enter your email."
          );
          return;
        }

        if (!message) {
          alert(
            "Please enter your message."
          );
          return;
        }

        alert(
          "Thank you! Your message has been received."
        );

        contactForm.reset();
      }
    );
  }

  /*
  =======================================================
  INITIALIZATION
  =======================================================
  */

  function initialize() {
    updateWidgetCounts();
    setInputMode("");

    /*
    Make sure an accidentally disabled file input
    does not prevent the upload zone from working.
    */

    if (fileInput) {
      fileInput.disabled = false;
      fileInput.removeAttribute(
        "aria-hidden"
      );
    }
  }

  initialize();
})();
