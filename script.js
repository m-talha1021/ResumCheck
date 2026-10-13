/**
 * ResumCheck frontend
 * Complete upload + analysis + results + report script.
 */
(() => {
  "use strict";

  let currentAnalysis = null;
  let selectedFile = null;
  let currentResumeText = "";
  let currentFileName = "";

  const $ = (selector) =>
    document.querySelector(selector);

  const API_URL =
    window.RESUMCHECK_API_URL ||
    "/api/analyze";

  const uploadZone =
    $("#dropzone");

  const fileInput =
    $("#fileInput");

  const resumeText =
    $("#resumeText");

  const analyzeForm =
    $("#analyzeForm");

  const analyzeButton =
    $("#analyzeBtn");

  const resultSection =
    $("#resultSection");

  const loadingOverlay =
    $("#loadingOverlay");

  const loadingStep =
    $("#loadingStep");

  const errorMsg =
    $("#errorMsg");

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

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showError(message) {
    const text =
      String(message || "Something went wrong.");

    if (errorMsg) {
      errorMsg.textContent = text;
      errorMsg.classList.remove("hidden");
      errorMsg.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    } else {
      alert(text);
    }
  }

  function clearError() {
    if (!errorMsg) return;

    errorMsg.textContent = "";
    errorMsg.classList.add("hidden");
  }

  function setLoading(isLoading) {
    if (analyzeButton) {
      analyzeButton.disabled =
        Boolean(isLoading);

      const label =
        analyzeButton.querySelector("span");

      if (label) {
        label.textContent =
          isLoading
            ? "Analyzing..."
            : "Analyze My Resume";
      }
    }

    if (loadingOverlay) {
      loadingOverlay.classList.toggle(
        "hidden",
        !isLoading
      );
    }
  }

  function setLoadingStep(text) {
    if (loadingStep) {
      loadingStep.textContent = text;
    }
  }

  function isSupportedFile(file) {
    if (!file) return false;

    const name =
      String(file.name || "").toLowerCase();

    return (
      name.endsWith(".pdf") ||
      name.endsWith(".docx") ||
      name.endsWith(".txt")
    );
  }

  function updateSelectedFileUI(file) {
    if (!file) return;

    const fileName = $("#fileName");

    if (fileName) {
      fileName.innerHTML =
        `<i class="fa-regular fa-file"></i> ${escapeHtml(file.name)}`;
    }

    if (uploadZone) {
      uploadZone.classList.add(
        "file-selected",
        "has-file"
      );
    }
  }

  function clearSelectedFile() {
    selectedFile = null;
    currentFileName = "";
    currentResumeText = "";

    if (fileInput) {
      fileInput.value = "";
    }

    if (resumeText) {
      resumeText.value = "";
    }

    const fileName = $("#fileName");

    if (fileName) {
      fileName.innerHTML =
        `<i class="fa-regular fa-file"></i> No file selected`;
    }

    if (uploadZone) {
      uploadZone.classList.remove(
        "file-selected",
        "has-file"
      );
    }
  }

  /*
   * PDF and DOCX files are sent to the backend.
   * The browser does not extract their text.
   */
  function selectFile(file) {
    if (!file) return;

    clearError();

    if (!isSupportedFile(file)) {
      showError(
        "Please upload a PDF, DOCX, or TXT resume."
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError(
        "Resume file is too large. Maximum allowed size is 5 MB."
      );
      return;
    }

    selectedFile = file;
    currentFileName = file.name;

    updateSelectedFileUI(file);

    console.log(
      "ResumCheck: file selected:",
      file.name
    );
  }

  /*
   * Native file picker.
   * The label already has for="fileInput".
   */
  if (fileInput) {
    fileInput.addEventListener(
      "change",
      () => {
        selectFile(fileInput.files?.[0]);
      }
    );
  }

  if (uploadZone) {
    uploadZone.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();

          if (fileInput) {
            fileInput.click();
          }
        }
      }
    );

    uploadZone.addEventListener(
      "dragover",
      (event) => {
        event.preventDefault();
        uploadZone.classList.add("dragging");
      }
    );

    uploadZone.addEventListener(
      "dragleave",
      () => {
        uploadZone.classList.remove("dragging");
      }
    );

    uploadZone.addEventListener(
      "drop",
      (event) => {
        event.preventDefault();

        uploadZone.classList.remove("dragging");

        selectFile(
          event.dataTransfer?.files?.[0]
        );
      }
    );
  }

  if (resumeText) {
    resumeText.addEventListener(
      "input",
      () => {
        currentResumeText =
          cleanText(resumeText.value);

        if (currentResumeText && selectedFile) {
          selectedFile = null;
          currentFileName = "";

          if (fileInput) {
            fileInput.value = "";
          }

          const fileName = $("#fileName");

          if (fileName) {
            fileName.innerHTML =
              `<i class="fa-regular fa-file"></i> No file selected`;
          }

          uploadZone?.classList.remove(
            "file-selected",
            "has-file"
          );
        }
      }
    );
  }

  async function requestAnalysis() {
    const file =
      selectedFile ||
      fileInput?.files?.[0] ||
      null;

    const text =
      cleanText(
        resumeText?.value ||
        currentResumeText
      );

    if (!file && !text) {
      throw new Error(
        "Please upload a resume or paste your resume text first."
      );
    }

    let response;

    if (file) {
      const formData = new FormData();

      formData.append(
        "file",
        file,
        file.name
      );

      response = await fetch(API_URL, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });
    } else {
      response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          text,
          fileName:
            currentFileName || "Pasted Resume",
        }),
      });
    }

    const contentType =
      response.headers.get("content-type") || "";

    let data = null;

    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const raw = await response.text();

      throw new Error(
        raw
          ? `Server returned an unexpected response: ${raw.slice(0, 250)}`
          : `Analysis request failed (${response.status}).`
      );
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

  function normalizeScore(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(100, Math.round(number))
    );
  }

  function normalizeList(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (typeof item === "string") {
          return cleanText(item);
        }

        return cleanText(
          item?.text ||
          item?.description ||
          item?.name ||
          ""
        );
      })
      .filter(Boolean)
      .slice(0, 8);
  }

  function normalizeAnalysis(data) {
    const fileName =
      data?.resumeFileName ||
      data?.fileName ||
      currentFileName ||
      "Pasted Resume";

    return {
      ...data,

      score: normalizeScore(data?.score),

      fileName,
      resumeFileName: fileName,

      strengths: normalizeList(data?.strengths),

      weaknesses: normalizeList(data?.weaknesses),

      missingSkills: normalizeList(
        data?.missingSkills ||
        data?.missing_skills
      ),

      suggestions: normalizeList(data?.suggestions),

      breakdown: data?.breakdown || {},
    };
  }

  function scoreDescription(score) {
    if (score >= 90) {
      return "Excellent ATS readiness. Your resume is highly optimized for automated screening.";
    }

    if (score >= 80) {
      return "Strong ATS readiness. A few improvements can make the resume even more competitive.";
    }

    if (score >= 70) {
      return "Good ATS readiness, but several areas can still be improved.";
    }

    if (score >= 60) {
      return "Moderate ATS readiness. Consider addressing the highlighted issues before applying.";
    }

    if (score >= 40) {
      return "Your resume needs several improvements to perform well in ATS screening.";
    }

    return "Your resume needs significant improvements before it is ready for ATS screening.";
  }

  function renderBreakdown(breakdown) {
    const container = $("#breakdownGrid");

    if (!container) return;

    const labels = {
      formatting: ["Formatting", 20],
      keywords: ["Keywords", 25],
      experience: ["Experience", 20],
      projects: ["Projects", 15],
      education: ["Education", 10],
      professionalism: ["Professionalism", 10],
    };

    container.innerHTML =
      Object.entries(labels)
        .map(([key, [label, max]]) => {
          const value = Math.max(
            0,
            Math.min(
              max,
              Number(breakdown?.[key] || 0)
            )
          );

          const percent = (value / max) * 100;

          return `
            <div class="breakdown-item">
              <div class="breakdown-top">
                <span>${escapeHtml(label)}</span>
                <strong>${value}/${max}</strong>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width:${percent}%"></div>
              </div>
            </div>
          `;
        })
        .join("");
  }

  function renderList(selector, items, emptyText) {
    const container = $(selector);

    if (!container) return;

    const safeItems =
      Array.isArray(items) ? items : [];

    container.innerHTML =
      safeItems.length
        ? safeItems
            .map(
              (item) =>
                `<li>${escapeHtml(item)}</li>`
            )
            .join("")
        : `<li>${escapeHtml(emptyText)}</li>`;
  }

  function renderChips(items) {
    const container = $("#missingSkills");

    if (!container) return;

    if (!items.length) {
      container.innerHTML =
        `<span class="chip">No AI skill gaps returned.</span>`;
      return;
    }

    container.innerHTML =
      items
        .map(
          (item) =>
            `<span class="chip">${escapeHtml(item)}</span>`
        )
        .join("");
  }

  function renderAnalysis(rawData) {
    const data = normalizeAnalysis(rawData);

    currentAnalysis = data;

    const score = data.score;

    const scoreValue = $("#scoreValue");

    if (scoreValue) {
      scoreValue.textContent = `${score}%`;
    }

    const scoreLabel = $("#scoreLabel");

    if (scoreLabel) {
      scoreLabel.textContent =
        data.scoreLabel || "ATS Score";
    }

    const scoreDescriptionEl =
      $("#scoreDescription");

    if (scoreDescriptionEl) {
      scoreDescriptionEl.textContent =
        scoreDescription(score);
    }

    const scoreRing = $("#scoreRing");

    if (scoreRing) {
      scoreRing.style.setProperty(
        "--score",
        `${score * 3.6}deg`
      );
    }

    renderBreakdown(data.breakdown);

    renderList(
      "#strengths",
      data.strengths,
      "Gemini did not return strengths."
    );

    renderList(
      "#weaknesses",
      data.weaknesses,
      "Gemini did not return weaknesses."
    );

    renderChips(data.missingSkills);

    renderList(
      "#suggestions",
      data.suggestions,
      "Gemini did not return suggestions."
    );

    if (resultSection) {
      resultSection.classList.remove("hidden");

      resultSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  if (analyzeForm) {
    analyzeForm.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();
        event.stopPropagation();

        clearError();
        setLoading(true);

        setLoadingStep(
          selectedFile
            ? "Uploading and reading your resume..."
            : "Reading your resume text..."
        );

        try {
          const data = await requestAnalysis();

          setLoadingStep(
            "Building your ATS report..."
          );

          renderAnalysis(data);
        } catch (error) {
          console.error(
            "ResumCheck analysis error:",
            error
          );

          showError(
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
   * Reset analysis.
   */
  const newAnalysis = $("#newAnalysis");

  if (newAnalysis) {
    newAnalysis.addEventListener(
      "click",
      () => {
        currentAnalysis = null;

        clearSelectedFile();
        clearError();

        if (resultSection) {
          resultSection.classList.add("hidden");
        }

        document
          .querySelector("#upload")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }
    );
  }

   /*
   * PREMIUM PDF REPORT
   * Modern navy + teal design with score cards,
   * progress bars, organized feedback and page numbers.
   */

  let jsPDFLoadPromise = null;

  function loadJsPDF() {
    const existing =
      window.jspdf?.jsPDF || window.jsPDF;

    if (existing) return Promise.resolve(existing);

    if (jsPDFLoadPromise) return jsPDFLoadPromise;

    const sources = [
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js",
      "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js",
    ];

    jsPDFLoadPromise = (async () => {
      for (const src of sources) {
        try {
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.async = true;
            script.onload = resolve;
            script.onerror = () => {
              script.remove();
              reject(new Error("Unable to load " + src));
            };
            document.head.appendChild(script);
          });

          const jsPDF =
            window.jspdf?.jsPDF || window.jsPDF;

          if (jsPDF) return jsPDF;
        } catch (error) {
          console.warn("jsPDF loading failed:", error);
        }
      }

      jsPDFLoadPromise = null;

      throw new Error(
        "PDF library could not load. Check your internet connection and try again."
      );
    })();

    return jsPDFLoadPromise;
  }

  const downloadReport = $("#downloadReport");

  if (downloadReport) {
    downloadReport.addEventListener("click", async () => {
      if (!currentAnalysis) {
        showError("Analyze a resume first.");
        return;
      }

      try {
        downloadReport.disabled = true;
        clearError();

        const jsPDF = await loadJsPDF();

        const doc = new jsPDF({
          orientation: "portrait",
          unit: "pt",
          format: "a4",
        });

        // Page dimensions and layout
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 42;
        const contentWidth = pageWidth - margin * 2;
        const bottomLimit = pageHeight - 55;

        let y = 0;
        let pageNumber = 1;

        // ResumCheck colors
        const navy = [22, 38, 67];
        const teal = [20, 166, 160];
        const dark = [39, 49, 66];
        const muted = [104, 116, 135];
        const light = [243, 247, 250];
        const border = [225, 232, 239];
        const green = [36, 139, 100];
        const red = [195, 77, 77];
        const amber = [201, 139, 42];
        const white = [255, 255, 255];

        const data = currentAnalysis;

        const score = Math.max(
          0,
          Math.min(100, Number(data.score) || 0)
        );

        const candidate =
          data.candidateName || "Candidate";

        const fileName =
          data.fileName ||
          data.resumeFileName ||
          "Pasted Resume";

        const breakdown = data.breakdown || {};

        function setColor(color) {
          doc.setTextColor(...color);
        }

        function fillColor(color) {
          doc.setFillColor(...color);
        }

        function drawColor(color) {
          doc.setDrawColor(...color);
        }

        function roundedRect(x, top, w, h, radius, color) {
          fillColor(color);
          doc.roundedRect(
            x,
            top,
            w,
            h,
            radius,
            radius,
            "F"
          );
        }

        function ensureSpace(height) {
          if (y + height > bottomLimit) {
            doc.addPage();
            pageNumber++;
            drawPageHeader();
            y = 82;
          }
        }

        function drawPageHeader() {
          fillColor(navy);
          doc.rect(0, 0, pageWidth, 8, "F");

          if (pageNumber > 1) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            setColor(navy);
            doc.text("RESUMCHECK", margin, 34);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            setColor(muted);
            doc.text(
              "ATS RESUME ANALYSIS",
              pageWidth - margin,
              34,
              { align: "right" }
            );

            drawColor(border);
            doc.setLineWidth(0.7);
            doc.line(margin, 46, pageWidth - margin, 46);
          }
        }

        function addWrappedText(
          text,
          x,
          top,
          width,
          fontSize = 10,
          color = dark,
          lineHeight = 1.45
        ) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(fontSize);
          setColor(color);

          const lines = doc.splitTextToSize(
            String(text ?? ""),
            width
          );

          const lineStep = fontSize * lineHeight;

          doc.text(lines, x, top);

          return lines.length * lineStep;
        }

        function addSectionTitle(title, subtitle = "") {
          ensureSpace(subtitle ? 52 : 34);

          doc.setFont("helvetica", "bold");
          doc.setFontSize(15);
          setColor(navy);
          doc.text(title, margin, y + 15);

          fillColor(teal);
          doc.roundedRect(
            margin,
            y + 23,
            34,
            3,
            1.5,
            1.5,
            "F"
          );

          let used = 36;

          if (subtitle) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            setColor(muted);
            doc.text(subtitle, margin, y + 43);
            used = 54;
          }

          y += used;
        }

        function addFeedbackSection(title, items, accent) {
          const list = Array.isArray(items)
            ? items.filter(Boolean)
            : [];

          addSectionTitle(title);

          if (!list.length) {
            ensureSpace(46);
            roundedRect(
              margin,
              y,
              contentWidth,
              38,
              7,
              light
            );

            addWrappedText(
              "No items were returned for this section.",
              margin + 13,
              y + 23,
              contentWidth - 26,
              9,
              muted
            );

            y += 50;
            return;
          }

          list.forEach((item, index) => {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9.5);

            const lines = doc.splitTextToSize(
              String(item),
              contentWidth - 54
            );

            const lineHeight = 14;
            const cardHeight = Math.max(
              43,
              22 + lines.length * lineHeight
            );

            ensureSpace(cardHeight + 7);

            roundedRect(
              margin,
              y,
              contentWidth,
              cardHeight,
              7,
              light
            );

            fillColor(accent);
            doc.roundedRect(
              margin,
              y,
              4,
              cardHeight,
              2,
              2,
              "F"
            );

            fillColor(white);
            doc.circle(
              margin + 20,
              y + 20,
              9,
              "F"
            );

            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            setColor(accent);

            doc.text(
              String(index + 1),
              margin + 20,
              y + 23,
              { align: "center" }
            );

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9.5);
            setColor(dark);

            doc.text(
              lines,
              margin + 37,
              y + 19
            );

            y += cardHeight + 7;
          });

          y += 5;
        }

        /*
         * PAGE 1: REPORT HEADER
         */

        fillColor(navy);
        doc.rect(0, 0, pageWidth, 175, "F");

        fillColor(teal);
        doc.rect(0, 175, pageWidth, 5, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        setColor([130, 231, 221]);

        doc.text("RESUMCHECK", margin, 43);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(25);
        setColor(white);

        doc.text(
          "ATS Resume Report",
          margin,
          83
        );

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        setColor([222, 231, 243]);

        doc.text(
          "Your resume analysis and improvement roadmap",
          margin,
          106
        );

        const displayFileName = doc.splitTextToSize(
          "Resume: " + fileName,
          contentWidth - 10
        );

        doc.setFontSize(9);
        setColor(white);

        doc.text(
          displayFileName.slice(0, 2),
          margin,
          133
        );

        doc.setFontSize(9);
        setColor([205, 219, 236]);

        doc.text(
          "Candidate: " + candidate,
          margin,
          157
        );

        y = 205;

        /*
         * ATS SCORE CARD
         */

        const scoreCardHeight = 132;

        roundedRect(
          margin,
          y,
          contentWidth,
          scoreCardHeight,
          12,
          light
        );

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        setColor(muted);

        doc.text(
          "YOUR ATS READINESS SCORE",
          margin + 19,
          y + 25
        );

        doc.setFont("helvetica", "bold");
        doc.setFontSize(39);

        const scoreColor =
          score >= 80
            ? green
            : score >= 60
              ? amber
              : red;

        setColor(scoreColor);

        doc.text(
          score + "%",
          margin + 19,
          y + 70
        );

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        setColor(navy);

        doc.text(
          data.scoreLabel || (
            score >= 80
              ? "Strong ATS readiness"
              : score >= 60
                ? "Room for improvement"
                : "Needs improvement"
          ),
          margin + 120,
          y + 48
        );

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);

        addWrappedText(
          score >= 90
            ? "Excellent result. Keep your resume tailored to each role."
            : score >= 80
              ? "Strong result. A few targeted refinements may help."
              : score >= 60
                ? "Review the recommendations below to strengthen your resume."
                : "Focus on the priority improvements listed in this report.",
          margin + 120,
          y + 67,
          contentWidth - 145,
          9,
          muted
        );

        // Score progress track
        const trackX = margin + 19;
        const trackY = y + 98;
        const trackWidth = contentWidth - 38;

        roundedRect(
          trackX,
          trackY,
          trackWidth,
          9,
          4,
          border
        );

        if (score > 0) {
          roundedRect(
            trackX,
            trackY,
            trackWidth * score / 100,
            9,
            4,
            scoreColor
          );
        }

        y += scoreCardHeight + 24;

        /*
         * SCORE BREAKDOWN
         */

        addSectionTitle(
          "Score Breakdown",
          "Performance across six resume quality categories"
        );

        const categories = [
          ["Formatting", "formatting", 20],
          ["Keywords", "keywords", 25],
          ["Experience", "experience", 20],
          ["Projects", "projects", 15],
          ["Education", "education", 10],
          ["Professionalism", "professionalism", 10],
        ];

        const gap = 10;
        const cardWidth =
          (contentWidth - gap) / 2;
        const cardHeight = 67;

        categories.forEach(([label, key, max], index) => {
          const column = index % 2;
          const row = Math.floor(index / 2);

          const x =
            margin + column * (cardWidth + gap);

          const top =
            y + row * (cardHeight + 9);

          if (row === 0) {
            ensureSpace(cardHeight + 10);
          }

          const value = Math.max(
            0,
            Math.min(
              max,
              Number(breakdown[key]) || 0
            )
          );

          const ratio = max ? value / max : 0;

          roundedRect(
            x,
            top,
            cardWidth,
            cardHeight,
            8,
            light
          );

          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          setColor(dark);

          doc.text(label, x + 12, top + 19);

          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          setColor(navy);

          doc.text(
            `${value}/${max}`,
            x + cardWidth - 12,
            top + 19,
            { align: "right" }
          );

          roundedRect(
            x + 12,
            top + 32,
            cardWidth - 24,
            6,
            3,
            border
          );

          if (ratio > 0) {
            roundedRect(
              x + 12,
              top + 32,
              (cardWidth - 24) * ratio,
              6,
              3,
              ratio >= 0.8 ? teal : amber
            );
          }

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          setColor(muted);

          doc.text(
            `${Math.round(ratio * 100)}% of category points`,
            x + 12,
            top + 53
          );
        });

        y += 3 * (cardHeight + 9) + 8;

        /*
         * FEEDBACK SECTIONS
         */

        addFeedbackSection(
          "Key Strengths",
          data.strengths,
          green
        );

        addFeedbackSection(
          "Areas to Improve",
          data.weaknesses,
          red
        );

        addFeedbackSection(
          "Missing Skills & Keywords",
          data.missingSkills,
          amber
        );

        addFeedbackSection(
          "Actionable Recommendations",
          data.suggestions,
          teal
        );

        /*
         * FOOTERS AND PAGE NUMBERS
         */

        const totalPages =
          doc.internal.getNumberOfPages();

        for (
          let page = 1;
          page <= totalPages;
          page++
        ) {
          doc.setPage(page);

          drawColor(border);
          doc.setLineWidth(0.7);

          doc.line(
            margin,
            pageHeight - 38,
            pageWidth - margin,
            pageHeight - 38
          );

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          setColor(muted);

          doc.text(
            "ResumCheck | ATS Resume Analysis",
            margin,
            pageHeight - 23
          );

          doc.text(
            `Page ${page} of ${totalPages}`,
            pageWidth - margin,
            pageHeight - 23,
            { align: "right" }
          );
        }

        doc.save("ResumCheck-ATS-Report.pdf");

      } catch (error) {
        console.error("PDF report error:", error);

        showError(
          error?.message ||
          "Could not generate the PDF report."
        );
      } finally {
        downloadReport.disabled = false;
      }
    });
  }
  /*
   * Contact form.
   */
  const contactForm = $("#contactForm");

  if (contactForm) {
    contactForm.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();

        const status = $("#contactStatus");

        const name = cleanText(
          $("#contactName")?.value
        );

        const email = cleanText(
          $("#contactEmail")?.value
        );

        const subject = cleanText(
          $("#contactSubject")?.value
        );

        const message = cleanText(
          $("#contactMessage")?.value
        );

        if (
          !name ||
          !email ||
          !subject ||
          !message
        ) {
          if (status) {
            status.textContent =
              "Please complete all fields.";
          }

          return;
        }

        if (status) {
          status.textContent =
            "Thanks! Your message is ready to be sent.";
        }

        contactForm.reset();
      }
    );
  }

  console.log(
    "ResumCheck frontend initialized."
  );

  /*
   * Mobile navigation.
   */
  function setMobileMenuOpen(open) {
    const button = document.getElementById("menuBtn");
    const menu = document.getElementById("mobileNav");

    if (!button || !menu) return;

    menu.classList.toggle("open", Boolean(open));

    button.setAttribute(
      "aria-expanded",
      String(Boolean(open))
    );

    button.setAttribute(
      "aria-label",
      open
        ? "Close navigation menu"
        : "Open navigation menu"
    );

    const icon = button.querySelector("i");

    if (icon) {
      icon.className = open
        ? "fa-solid fa-xmark"
        : "fa-solid fa-bars";
    }
  }

  window.toggleMobileMenu = function (event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const menu = document.getElementById("mobileNav");

    if (!menu) return;

    setMobileMenuOpen(
      !menu.classList.contains("open")
    );
  };

  function initializeMobileMenu() {
    const button = document.getElementById("menuBtn");
    const menu = document.getElementById("mobileNav");

    if (
      !button ||
      !menu ||
      button.dataset.menuInitialized === "true"
    ) {
      return;
    }

    button.dataset.menuInitialized = "true";

    // Prevent inline and JavaScript handlers from both toggling the menu.
    button.removeAttribute("onclick");

    button.addEventListener(
      "click",
      window.toggleMobileMenu
    );

    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener(
        "click",
        () => setMobileMenuOpen(false)
      );
    });

    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape") {
          setMobileMenuOpen(false);
        }
      }
    );

    document.addEventListener(
      "click",
      (event) => {
        if (!menu.classList.contains("open")) return;

        if (
          menu.contains(event.target) ||
          button.contains(event.target)
        ) {
          return;
        }

        setMobileMenuOpen(false);
      }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeMobileMenu,
      { once: true }
    );
  } else {
    initializeMobileMenu();
  }
})();
