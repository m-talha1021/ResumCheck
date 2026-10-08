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

  /* =======================================================
     TEXT HELPERS
     ======================================================= */

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
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );
  }

  /* =======================================================
     ERROR / LOADING
     ======================================================= */

  function showError(message) {
    const text =
      String(
        message ||
          "Something went wrong."
      );

    if (errorMsg) {
      errorMsg.textContent =
        text;

      errorMsg.classList.remove(
        "hidden"
      );

      errorMsg.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    } else {
      alert(text);
    }
  }

  function clearError() {
    if (!errorMsg) {
      return;
    }

    errorMsg.textContent =
      "";

    errorMsg.classList.add(
      "hidden"
    );
  }

  function setLoading(
    isLoading
  ) {
    if (analyzeButton) {
      analyzeButton.disabled =
        Boolean(isLoading);

      const label =
        analyzeButton.querySelector(
          "span"
        );

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

  function setLoadingStep(
    text
  ) {
    if (loadingStep) {
      loadingStep.textContent =
        text;
    }
  }

  /* =======================================================
     FILE VALIDATION
     ======================================================= */

  function isSupportedFile(
    file
  ) {
    if (!file) {
      return false;
    }

    const name =
      String(
        file.name || ""
      ).toLowerCase();

    return (
      name.endsWith(".pdf") ||
      name.endsWith(".docx") ||
      name.endsWith(".txt")
    );
  }

  /* =======================================================
     FILE UI
     ======================================================= */

  function updateSelectedFileUI(
    file
  ) {
    if (!file) {
      return;
    }

    const fileName =
      $("#fileName");

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
    selectedFile =
      null;

    currentFileName =
      "";

    currentResumeText =
      "";

    if (fileInput) {
      fileInput.value =
        "";
    }

    if (resumeText) {
      resumeText.value =
        "";
    }

    const fileName =
      $("#fileName");

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

  /* =======================================================
     SELECT FILE
     ======================================================= */

  function selectFile(file) {
    if (!file) {
      return;
    }

    clearError();

    if (
      !isSupportedFile(
        file
      )
    ) {
      showError(
        "Please upload a PDF, DOCX, or TXT resume."
      );

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      showError(
        "Resume file is too large. Maximum allowed size is 5 MB."
      );

      return;
    }

    selectedFile =
      file;

    currentFileName =
      file.name;

    updateSelectedFileUI(
      file
    );

    console.log(
      "ResumCheck: file selected:",
      file.name
    );
  }

  /* =======================================================
     FILE INPUT
     ======================================================= */

  if (fileInput) {
    fileInput.addEventListener(
      "change",
      () => {
        selectFile(
          fileInput.files?.[0]
        );
      }
    );
  }

  /* =======================================================
     DROPZONE
     ======================================================= */

  if (uploadZone) {
    uploadZone.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key ===
            "Enter" ||
          event.key ===
            " "
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

        uploadZone.classList.add(
          "dragging"
        );
      }
    );

    uploadZone.addEventListener(
      "dragleave",
      () => {
        uploadZone.classList.remove(
          "dragging"
        );
      }
    );

    uploadZone.addEventListener(
      "drop",
      (event) => {
        event.preventDefault();

        uploadZone.classList.remove(
          "dragging"
        );

        selectFile(
          event.dataTransfer
            ?.files?.[0]
        );
      }
    );
  }

  /* =======================================================
     TEXT INPUT
     ======================================================= */

  if (resumeText) {
    resumeText.addEventListener(
      "input",
      () => {
        currentResumeText =
          cleanText(
            resumeText.value
          );

        /*
         * If the user starts typing, use pasted text instead
         * of the previously selected file.
         */
        if (
          currentResumeText &&
          selectedFile
        ) {
          selectedFile =
            null;

          currentFileName =
            "";

          if (fileInput) {
            fileInput.value =
              "";
          }

          const fileName =
            $("#fileName");

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

  /* =======================================================
     API REQUEST
     ======================================================= */

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

    if (
      !file &&
      !text
    ) {
      throw new Error(
        "Please upload a resume or paste your resume text first."
      );
    }

    let response;

    /*
     * FILE UPLOAD
     */
    if (file) {
      const formData =
        new FormData();

      formData.append(
        "file",
        file,
        file.name
      );

      response =
        await fetch(
          API_URL,
          {
            method: "POST",

            body:
              formData,

            headers: {
              Accept:
                "application/json",
            },
          }
        );
    }

    /*
     * PASTED TEXT
     */
    else {
      response =
        await fetch(
          API_URL,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify({
                text,

                fileName:
                  currentFileName ||
                  "Pasted Resume",
              }),
          }
        );
    }

    const contentType =
      response.headers.get(
        "content-type"
      ) || "";

    let data = null;

    if (
      contentType.includes(
        "application/json"
      )
    ) {
      data =
        await response.json();
    } else {
      const raw =
        await response.text();

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

  /* =======================================================
     RESULT NORMALIZATION
     ======================================================= */

  function normalizeScore(
    value
  ) {
    const number =
      Number(value);

    if (
      !Number.isFinite(
        number
      )
    ) {
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

  function normalizeList(
    value
  ) {
    if (
      !Array.isArray(
        value
      )
    ) {
      return [];
    }

    return value
      .map(
        (item) => {
          if (
            typeof item ===
            "string"
          ) {
            return cleanText(
              item
            );
          }

          return cleanText(
            item?.text ||
              item?.description ||
              item?.name ||
              ""
          );
        }
      )
      .filter(Boolean)
      .slice(0, 8);
  }

  function normalizeAnalysis(
    data
  ) {
    const fileName =
      data?.resumeFileName ||
      data?.fileName ||
      currentFileName ||
      "Pasted Resume";

    return {
      ...data,

      score:
        normalizeScore(
          data?.score
        ),

      fileName,

      resumeFileName:
        fileName,

      strengths:
        normalizeList(
          data?.strengths
        ),

      weaknesses:
        normalizeList(
          data?.weaknesses
        ),

      missingSkills:
        normalizeList(
          data?.missingSkills ||
            data?.missing_skills
        ),

      suggestions:
        normalizeList(
          data?.suggestions
        ),

      breakdown:
        data?.breakdown ||
        {},
    };
  }

  /* =======================================================
     SCORE DESCRIPTION
     ======================================================= */

  function scoreDescription(
    score
  ) {
    if (
      score >= 90
    ) {
      return "Excellent ATS readiness. Your resume is highly optimized for automated screening.";
    }

    if (
      score >= 80
    ) {
      return "Strong ATS readiness. A few improvements can make the resume even more competitive.";
    }

    if (
      score >= 70
    ) {
      return "Good ATS readiness, but several areas can still be improved.";
    }

    if (
      score >= 60
    ) {
      return "Moderate ATS readiness. Consider addressing the highlighted issues before applying.";
    }

    if (
      score >= 40
    ) {
      return "Your resume needs several improvements to perform well in ATS screening.";
    }

    return "Your resume needs significant improvements before it is ready for ATS screening.";
  }

  /* =======================================================
     BREAKDOWN
     ======================================================= */

  function renderBreakdown(
    breakdown
  ) {
    const container =
      $("#breakdownGrid");

    if (!container) {
      return;
    }

    const labels = {
      formatting:
        [
          "Formatting",
          20,
        ],

      keywords:
        [
          "Keywords",
          25,
        ],

      experience:
        [
          "Experience",
          20,
        ],

      projects:
        [
          "Projects",
          15,
        ],

      education:
        [
          "Education",
          10,
        ],

      professionalism:
        [
          "Professionalism",
          10,
        ],
    };

    container.innerHTML =
      Object.entries(
        labels
      )
        .map(
          (
            [
              key,
              [
                label,
                max,
              ],
            ]
          ) => {
            const value =
              Math.max(
                0,
                Math.min(
                  max,
                  Number(
                    breakdown?.[
                      key
                    ] || 0
                  )
                )
              );

            const percent =
              (value /
                max) *
              100;

            return `
              <div class="breakdown-item">
                <div class="breakdown-top">
                  <span>${escapeHtml(label)}</span>
                  <strong>${value}/${max}</strong>
                </div>

                <div class="progress-track">
                  <div
                    class="progress-fill"
                    style="width:${percent}%"
                  ></div>
                </div>
              </div>
            `;
          }
        )
        .join("");
  }

  /* =======================================================
     LIST RENDERING
     ======================================================= */

  function renderList(
    selector,
    items,
    emptyText
  ) {
    const container =
      $(selector);

    if (!container) {
      return;
    }

    const safeItems =
      Array.isArray(items)
        ? items
        : [];

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

  /* =======================================================
     MISSING SKILLS
     ======================================================= */

  function renderChips(
    items
  ) {
    const container =
      $("#missingSkills");

    if (!container) {
      return;
    }

    if (
      !items.length
    ) {
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

  /* =======================================================
     RENDER ANALYSIS
     ======================================================= */

  function renderAnalysis(
    rawData
  ) {
    const data =
      normalizeAnalysis(
        rawData
      );

    currentAnalysis =
      data;

    const score =
      data.score;

    const scoreValue =
      $("#scoreValue");

    if (scoreValue) {
      scoreValue.textContent =
        `${score}%`;
    }

    const scoreLabel =
      $("#scoreLabel");

    if (scoreLabel) {
      scoreLabel.textContent =
        data.scoreLabel ||
        "ATS Score";
    }

    const scoreDescriptionEl =
      $("#scoreDescription");

    if (
      scoreDescriptionEl
    ) {
      scoreDescriptionEl.textContent =
        scoreDescription(
          score
        );
    }

    const scoreRing =
      $("#scoreRing");

    if (scoreRing) {
      scoreRing.style.setProperty(
        "--score",
        `${score * 3.6}deg`
      );
    }

    renderBreakdown(
      data.breakdown
    );

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

    renderChips(
      data.missingSkills
    );

    renderList(
      "#suggestions",
      data.suggestions,
      "Gemini did not return suggestions."
    );

    if (
      resultSection
    ) {
      resultSection.classList.remove(
        "hidden"
      );

      resultSection.scrollIntoView({
        behavior:
          "smooth",

        block:
          "start",
      });
    }
  }

  /* =======================================================
     ANALYZE FORM
     ======================================================= */

  if (analyzeForm) {
    analyzeForm.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();
        event.stopPropagation();

        clearError();

        setLoading(
          true
        );

        setLoadingStep(
          selectedFile
            ? "Uploading and reading your resume..."
            : "Reading your resume text..."
        );

        try {
          const data =
            await requestAnalysis();

          setLoadingStep(
            "Building your ATS report..."
          );

          renderAnalysis(
            data
          );
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
          setLoading(
            false
          );
        }
      }
    );
  }

  /* =======================================================
     RESET
     ======================================================= */

  const newAnalysis =
    $("#newAnalysis");

  if (newAnalysis) {
    newAnalysis.addEventListener(
      "click",
      () => {
        currentAnalysis =
          null;

        clearSelectedFile();

        clearError();

        if (
          resultSection
        ) {
          resultSection.classList.add(
            "hidden"
          );
        }

        document
          .querySelector(
            "#upload"
          )
          ?.scrollIntoView({
            behavior:
              "smooth",

            block:
              "start",
          });
      }
    );
  }

  /* =======================================================
     PDF REPORT
     ======================================================= */

  const downloadReport =
    $("#downloadReport");

  if (downloadReport) {
    downloadReport.addEventListener(
      "click",
      async () => {
        if (
          !currentAnalysis
        ) {
          showError(
            "Analyze a resume first."
          );

          return;
        }

        const jsPDF =
          window.jspdf?.jsPDF;

        if (!jsPDF) {
          showError(
            "PDF report library is not loaded. Please refresh the page and try again."
          );

          return;
        }

        try {
          downloadReport.disabled =
            true;

          const doc =
            new jsPDF({
              unit: "pt",
              format: "a4",
            });

          const margin =
            40;

          let y = 48;

          const addText =
            (
              text,
              size = 10
            ) => {
              doc.setFontSize(
                size
              );

              const lines =
                doc.splitTextToSize(
                  String(
                    text || ""
                  ),
                  515
                );

              if (
                y +
                  lines.length *
                    (size + 4) >
                800
              ) {
                doc.addPage();

                y = 48;
              }

              doc.text(
                lines,
                margin,
                y
              );

              y +=
                lines.length *
                  (size + 4) +
                8;
            };

          addText(
            "ResumCheck — ATS Resume Report",
            18
          );

          addText(
            `Resume: ${
              currentAnalysis.fileName ||
              "Pasted Resume"
            }`,
            11
          );

          addText(
            `Candidate: ${
              currentAnalysis.candidateName ||
              "Candidate"
            }`,
            11
          );

          addText(
            `ATS Score: ${
              currentAnalysis.score
            }% — ${
              currentAnalysis.scoreLabel ||
              ""
            }`,
            14
          );

          addText(
            "Score Breakdown",
            13
          );

          for (
            const [
              key,
              label,
              max,
            ] of [
              [
                "formatting",
                "Formatting",
                20,
              ],

              [
                "keywords",
                "Keywords",
                25,
              ],

              [
                "experience",
                "Experience",
                20,
              ],

              [
                "projects",
                "Projects",
                15,
              ],

              [
                "education",
                "Education",
                10,
              ],

              [
                "professionalism",
                "Professionalism",
                10,
              ],
            ]
          ) {
            addText(
              `${label}: ${
                currentAnalysis
                  .breakdown?.[
                  key
                ] || 0
              }/${max}`,
              10
            );
          }

          const sections =
            [
              [
                "Strengths",
                currentAnalysis
                  .strengths,
              ],

              [
                "Areas to Fix",
                currentAnalysis
                  .weaknesses,
              ],

              [
                "Missing Skills",
                currentAnalysis
                  .missingSkills,
              ],

              [
                "Actionable Suggestions",
                currentAnalysis
                  .suggestions,
              ],
            ];

          for (
            const [
              title,
              items,
            ] of sections
          ) {
            addText(
              title,
              13
            );

            (
              items.length
                ? items
                : [
                    "No AI items returned.",
                  ]
            ).forEach(
              (
                item,
                index
              ) => {
                addText(
                  `${
                    index + 1
                  }. ${item}`,
                  10
                );
              }
            );
          }

          doc.save(
            "ResumCheck-ATS-Report.pdf"
          );
        } catch (error) {
          console.error(
            "PDF report error:",
            error
          );

          showError(
            "Could not generate the PDF report."
          );
        } finally {
          downloadReport.disabled =
            false;
        }
      }
    );
  }

  /* =======================================================
     CONTACT FORM
     ======================================================= */

  const contactForm =
    $("#contactForm");

  if (contactForm) {
    contactForm.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();

        const status =
          $("#contactStatus");

        const name =
          cleanText(
            $("#contactName")
              ?.value
          );

        const email =
          cleanText(
            $("#contactEmail")
              ?.value
          );

        const subject =
          cleanText(
            $("#contactSubject")
              ?.value
          );

        const message =
          cleanText(
            $("#contactMessage")
              ?.value
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
})();
