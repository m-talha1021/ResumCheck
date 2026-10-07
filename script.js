/* =========================================================
   RESUMCHECK — FRONTEND SCRIPT
   ========================================================= */

(() => {
    "use strict";

    /* =======================================================
       DOM HELPERS
       ======================================================= */

    const $ = (id) => document.getElementById(id);

    const fileInput = $("fileInput");
    const dropzone = $("dropzone");
    const fileName = $("fileName");
    const fileHeading = $("fileHeading");
    const fileSub = $("fileSub");

    const analyzeForm = $("analyzeForm");
    const analyzeBtn = $("analyzeBtn");
    const resumeText = $("resumeText");

    const resultSection = $("resultSection");
    const scoreRing = $("scoreRing");
    const scoreValue = $("scoreValue");
    const scoreLabel = $("scoreLabel");
    const scoreDescription = $("scoreDescription");

    const breakdownGrid = $("breakdownGrid");
    const strengths = $("strengths");
    const weaknesses = $("weaknesses");
    const missingSkills = $("missingSkills");
    const suggestions = $("suggestions");

    const errorMsg = $("errorMsg");
    const loadingOverlay = $("loadingOverlay");
    const loadingStep = $("loadingStep");

    const newAnalysisBtn = $("newAnalysis");
    const downloadReportBtn = $("downloadReport");

    const contactForm = $("contactForm");
    const contactStatus = $("contactStatus");
    const contactBtn = $("contactBtn");


    /* =======================================================
       STATE
       ======================================================= */

    let selectedFile = null;
    let currentAnalysis = null;
    let jsPdfLoadingPromise = null;


    /* =======================================================
       GENERAL HELPERS
       ======================================================= */

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function showError(message) {
        if (!errorMsg) return;

        errorMsg.textContent = message;
        errorMsg.classList.remove("hidden");

        errorMsg.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }


    function hideError() {
        if (!errorMsg) return;
        errorMsg.textContent = "";
        errorMsg.classList.add("hidden");
    }


    function setLoading(show, message = "Reading document structure...") {
        if (!loadingOverlay) return;

        if (show) {
            if (loadingStep) {
                loadingStep.textContent = message;
            }

            loadingOverlay.classList.remove("hidden");
            document.body.classList.add("is-loading");
        } else {
            loadingOverlay.classList.add("hidden");
            document.body.classList.remove("is-loading");
        }
    }


    function updateLoadingStep(message) {
        if (loadingStep) {
            loadingStep.textContent = message;
        }
    }


    function setAnalyzeButtonLoading(loading) {
        if (!analyzeBtn) return;

        if (loading) {
            analyzeBtn.disabled = true;
            analyzeBtn.dataset.originalHTML =
                analyzeBtn.innerHTML;

            analyzeBtn.innerHTML = `
                <span>Analyzing Resume...</span>
                <i class="fa-solid fa-spinner fa-spin"></i>
            `;
        } else {
            analyzeBtn.disabled = false;

            if (analyzeBtn.dataset.originalHTML) {
                analyzeBtn.innerHTML =
                    analyzeBtn.dataset.originalHTML;
            }
        }
    }


    /* =======================================================
       FILE HANDLING
       ======================================================= */

    const MAX_FILE_SIZE = 4 * 1024 * 1024;

    const ALLOWED_EXTENSIONS = [
        "pdf",
        "docx",
        "txt"
    ];


    function isAllowedFile(file) {
        if (!file) return false;

        const extension =
            file.name
                .split(".")
                .pop()
                .toLowerCase();

        return ALLOWED_EXTENSIONS.includes(extension);
    }


    function handleSelectedFile(file) {

        hideError();

        if (!file) return;

        if (!isAllowedFile(file)) {
            selectedFile = null;

            showError(
                "Unsupported file type. Please upload PDF, DOCX, or TXT."
            );

            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            selectedFile = null;

            showError(
                "File is too large. Please upload a resume smaller than 4 MB."
            );

            return;
        }

        selectedFile = file;

        if (fileName) {
            fileName.textContent = file.name;
            fileName.classList.add("selected");
        }

        if (fileHeading) {
            fileHeading.textContent = "Resume Selected";
        }

        if (fileSub) {
            fileSub.textContent =
                "Click here or drag another resume to replace it";
        }

        if (dropzone) {
            dropzone.classList.add("has-file");
        }
    }


    if (fileInput) {
        fileInput.addEventListener(
            "change",
            (event) => {
                const file =
                    event.target.files?.[0];

                handleSelectedFile(file);
            }
        );
    }


    if (dropzone) {

        dropzone.addEventListener(
            "click",
            () => {
                fileInput?.click();
            }
        );


        dropzone.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {
                    event.preventDefault();
                    fileInput?.click();
                }

            }
        );


        [
            "dragenter",
            "dragover"
        ].forEach(eventName => {

            dropzone.addEventListener(
                eventName,
                (event) => {

                    event.preventDefault();
                    event.stopPropagation();

                    dropzone.classList.add(
                        "dragging"
                    );
                }
            );

        });


        [
            "dragleave",
            "drop"
        ].forEach(eventName => {

            dropzone.addEventListener(
                eventName,
                (event) => {

                    event.preventDefault();
                    event.stopPropagation();

                    dropzone.classList.remove(
                        "dragging"
                    );
                }
            );

        });


        dropzone.addEventListener(
            "drop",
            (event) => {

                const file =
                    event.dataTransfer?.files?.[0];

                handleSelectedFile(file);

            }
        );
    }


    /* =======================================================
       INPUT MODE COMPATIBILITY
       ======================================================= */

    const fileModeBtn = $("fileModeBtn");
    const textModeBtn = $("textModeBtn");
    const fileMode = $("fileMode");
    const textMode = $("textMode");


    function setInputMode(mode) {

        if (mode === "text") {

            fileMode?.classList.add("hidden");
            textMode?.classList.remove("hidden");

            fileModeBtn?.classList.remove("active");
            textModeBtn?.classList.add("active");

            fileModeBtn?.setAttribute(
                "aria-selected",
                "false"
            );

            textModeBtn?.setAttribute(
                "aria-selected",
                "true"
            );

        } else {

            textMode?.classList.add("hidden");
            fileMode?.classList.remove("hidden");

            textModeBtn?.classList.remove("active");
            fileModeBtn?.classList.add("active");

            textModeBtn?.setAttribute(
                "aria-selected",
                "false"
            );

            fileModeBtn?.setAttribute(
                "aria-selected",
                "true"
            );
        }
    }


    fileModeBtn?.addEventListener(
        "click",
        () => setInputMode("file")
    );


    textModeBtn?.addEventListener(
        "click",
        () => setInputMode("text")
    );


    /* =======================================================
       API — ANALYZE RESUME
       ======================================================= */

    async function analyzeResume() {

        hideError();

        const formData = new FormData();

        if (selectedFile) {

            formData.append(
                "resume",
                selectedFile
            );

        } else {

            const text =
                resumeText?.value?.trim() || "";

            if (!text) {
                throw new Error(
                    "Please upload a resume or paste your resume text."
                );
            }

            if (text.length < 50) {
                throw new Error(
                    "Please provide at least 50 characters of resume text."
                );
            }

            formData.append(
                "resumeText",
                text
            );
        }


        updateLoadingStep(
            "Sending resume for analysis..."
        );


        const response = await fetch(
            "/api/analyze",
            {
                method: "POST",
                body: formData,
                cache: "no-store"
            }
        );


        let data = {};

        try {
            data = await response.json();
        } catch {
            throw new Error(
                "The server returned an invalid response."
            );
        }


        if (!response.ok) {

            throw new Error(
                data?.error ||
                "Resume analysis failed. Please try again."
            );
        }


        return data;
    }


    /* =======================================================
       RESULT RENDERING
       ======================================================= */

    function renderList(container, items, type = "normal") {

        if (!container) return;

        container.innerHTML = "";

        const safeItems =
            Array.isArray(items)
                ? items.filter(Boolean)
                : [];


        safeItems.forEach((item, index) => {

            const li =
                document.createElement(
                    "li"
                );

            li.textContent = String(item);

            if (type) {
                li.dataset.type = type;
            }

            li.dataset.index = String(index);

            container.appendChild(li);

        });
    }


    function renderMissingSkills(items) {

        if (!missingSkills) return;

        missingSkills.innerHTML = "";

        const safeItems =
            Array.isArray(items)
                ? items.filter(Boolean)
                : [];


        safeItems.forEach(skill => {

            const span =
                document.createElement(
                    "span"
                );

            span.className = "skill-chip";

            span.textContent = String(skill);

            missingSkills.appendChild(
                span
            );
        });
    }


    function renderBreakdown(breakdown) {

        if (!breakdownGrid) return;

        breakdownGrid.innerHTML = "";

        if (
            !breakdown ||
            typeof breakdown !== "object"
        ) {
            return;
        }


        const limits = {
            formatting: 20,
            keywords: 25,
            experience: 20,
            projects: 15,
            education: 10,
            professionalism: 10
        };


        const labels = {
            formatting: "Formatting",
            keywords: "Keywords",
            experience: "Experience",
            projects: "Projects",
            education: "Education",
            professionalism: "Professionalism"
        };


        Object.entries(limits).forEach(
            ([key, max]) => {

                const raw =
                    Number(
                        breakdown[key] ?? 0
                    );

                const value =
                    Number.isFinite(raw)
                        ? Math.max(
                            0,
                            Math.min(
                                max,
                                Math.round(raw)
                            )
                        )
                        : 0;

                const percent =
                    Math.round(
                        (value / max) * 100
                    );


                const card =
                    document.createElement(
                        "div"
                    );

                card.className =
                    "breakdown-item";


                card.innerHTML = `
                    <div class="breakdown-top">
                        <span>
                            ${escapeHTML(
                                labels[key]
                            )}
                        </span>
                        <strong>
                            ${value}/${max}
                        </strong>
                    </div>

                    <div class="breakdown-bar">
                        <span
                            style="width:${percent}%"
                        ></span>
                    </div>

                    <small>
                        ${percent}% coverage
                    </small>
                `;


                breakdownGrid.appendChild(
                    card
                );
            }
        );
    }


    function getScoreDescription(score) {

        if (score >= 85) {
            return "Excellent ATS readiness. Your resume has strong structure, keywords, and professional presentation.";
        }

        if (score >= 70) {
            return "Good ATS readiness. A few targeted improvements can make your resume more competitive.";
        }

        if (score >= 55) {
            return "Fair ATS readiness. Strengthening keywords, structure, and measurable achievements should improve your result.";
        }

        return "Your resume needs improvement before applying. Focus on structure, keywords, achievements, and ATS-friendly formatting.";
    }


    function renderScore(score) {

        const numericScore =
            Math.max(
                0,
                Math.min(
                    100,
                    Number(score) || 0
                )
            );


        if (scoreValue) {
            scoreValue.textContent =
                `${numericScore}%`;
        }


        if (scoreLabel) {

            scoreLabel.textContent =
                currentAnalysis?.scoreLabel ||
                (
                    numericScore >= 85
                        ? "Excellent"
                        : numericScore >= 70
                            ? "Good"
                            : numericScore >= 55
                                ? "Fair"
                                : "Needs Improvement"
                );
        }


        if (scoreDescription) {

            scoreDescription.textContent =
                getScoreDescription(
                    numericScore
                );
        }


        if (scoreRing) {

            scoreRing.style.setProperty(
                "--score",
                numericScore
            );

            scoreRing.dataset.score =
                String(numericScore);
        }
    }


    function renderAnalysis(data) {

        currentAnalysis = data || {};


        renderScore(
            currentAnalysis.score
        );


        renderBreakdown(
            currentAnalysis.breakdown
        );


        renderList(
            strengths,
            currentAnalysis.strengths,
            "strength"
        );


        renderList(
            weaknesses,
            currentAnalysis.weaknesses,
            "weakness"
        );


        renderMissingSkills(
            currentAnalysis.missing_skills
        );


        renderList(
            suggestions,
            currentAnalysis.suggestions,
            "suggestion"
        );


        updateWidgetCounts();


        if (resultSection) {

            resultSection.classList.remove(
                "hidden"
            );

            setTimeout(() => {

                resultSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }, 100);
        }
    }


    /* =======================================================
       PREMIUM RESULT COUNTERS
       ======================================================= */

    function updateWidgetCounts() {

        const configs = [
            {
                id: "strengths",
                label: "strengths"
            },
            {
                id: "weaknesses",
                label: "issues"
            },
            {
                id: "missingSkills",
                label: "skills"
            },
            {
                id: "suggestions",
                label: "actions"
            }
        ];


        configs.forEach(
            ({ id, label }) => {

                const container =
                    $(id);

                if (!container) return;


                const count =
                    Array.from(
                        container.children
                    ).filter(
                        element =>
                            element.textContent.trim()
                    ).length;


                const card =
                    container.closest(
                        ".insight"
                    );


                if (!card) return;


                let badge =
                    card.querySelector(
                        ".rc-widget-count"
                    );


                if (!badge) {

                    badge =
                        document.createElement(
                            "span"
                        );

                    badge.className =
                        "rc-widget-count";

                    const header =
                        card.querySelector(
                            "header"
                        );

                    if (header) {
                        header.appendChild(
                            badge
                        );
                    }
                }


                badge.textContent =
                    String(count);

                badge.title =
                    `${count} ${label}`;
            }
        );
    }


    /* =======================================================
       ANALYZE FORM
       ======================================================= */

    analyzeForm?.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            hideError();

            try {

                setAnalyzeButtonLoading(
                    true
                );

                setLoading(
                    true,
                    "Reading document structure..."
                );


                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            250
                        )
                );


                updateLoadingStep(
                    "Checking ATS compatibility..."
                );


                const data =
                    await analyzeResume();


                updateLoadingStep(
                    "Preparing your ATS report..."
                );


                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            250
                        )
                );


                renderAnalysis(data);

            } catch (error) {

                console.error(
                    "Resume analysis error:",
                    error
                );

                showError(
                    error?.message ||
                    "Something went wrong while analyzing your resume."
                );

            } finally {

                setLoading(false);
                setAnalyzeButtonLoading(false);

            }
        }
    );


    /* =======================================================
       NEW ANALYSIS
       ======================================================= */

    newAnalysisBtn?.addEventListener(
        "click",
        () => {

            currentAnalysis = null;
            selectedFile = null;


            if (fileInput) {
                fileInput.value = "";
            }


            if (resumeText) {
                resumeText.value = "";
            }


            if (fileName) {
                fileName.textContent =
                    "No file selected";

                fileName.classList.remove(
                    "selected"
                );
            }


            if (fileHeading) {
                fileHeading.textContent =
                    "Drag & Drop Resume";
            }


            if (fileSub) {
                fileSub.textContent =
                    "or click here to browse files (.pdf, .docx, .txt)";
            }


            dropzone?.classList.remove(
                "has-file"
            );


            hideError();


            resultSection?.classList.add(
                "hidden"
            );


            window.scrollTo({
                top: $("upload")?.offsetTop
                    ? $("upload").offsetTop - 80
                    : 0,
                behavior: "smooth"
            });
        }
    );


    /* =======================================================
       PDF GENERATOR
       ======================================================= */

    function loadJsPDF() {

        if (
            window.jspdf &&
            typeof window.jspdf.jsPDF === "function"
        ) {
            return Promise.resolve(
                window.jspdf.jsPDF
            );
        }


        if (jsPdfLoadingPromise) {
            return jsPdfLoadingPromise;
        }


        const sources = [
            "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js",
            "https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js"
        ];


        jsPdfLoadingPromise =
            new Promise(
                (resolve, reject) => {

                    let index = 0;


                    function tryNext() {

                        if (
                            index >=
                            sources.length
                        ) {
                            reject(
                                new Error(
                                    "Unable to load the PDF generator."
                                )
                            );

                            return;
                        }


                        const script =
                            document.createElement(
                                "script"
                            );


                        script.src =
                            sources[index++];

                        script.async = true;


                        script.onload = () => {

                            if (
                                window.jspdf &&
                                typeof window.jspdf.jsPDF ===
                                    "function"
                            ) {
                                resolve(
                                    window.jspdf.jsPDF
                                );
                            } else {
                                tryNext();
                            }
                        };


                        script.onerror =
                            () => {
                                tryNext();
                            };


                        document.head.appendChild(
                            script
                        );
                    }


                    tryNext();
                }
            );


        return jsPdfLoadingPromise;
    }


    /* =======================================================
       PDF HELPERS
       ======================================================= */

    function getTextItems(id) {

        const container = $(id);

        if (!container) return [];

        return Array.from(
            container.children
        )
            .map(
                element =>
                    element.textContent
                        .trim()
            )
            .filter(Boolean);
    }


    function addPdfPageIfNeeded(
        pdf,
        state,
        requiredHeight = 15
    ) {

        if (
            state.y +
            requiredHeight >
            275
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
            20
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
            title,
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


    function addPdfItems(
        pdf,
        state,
        items,
        bullet = "•"
    ) {

        if (!items.length) {

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
                24,
                state.y
            );

            state.y += 8;

            return;
        }


        items.forEach(item => {

            const lines =
                pdf.splitTextToSize(
                    `${bullet} ${item}`,
                    162
                );


            addPdfPageIfNeeded(
                pdf,
                state,
                lines.length * 5 + 5
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
                24,
                state.y
            );


            state.y +=
                lines.length * 5 + 4;
        });
    }


    /* =======================================================
       CREATE PDF
       ======================================================= */

    async function createPDFReport() {

        const jsPDF =
            await loadJsPDF();


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
                currentAnalysis?.score ||
                0
            );


        const label =
            currentAnalysis?.scoreLabel ||
            "ATS Score";


        const description =
            getScoreDescription(
                score
            );


        /* ---------- Header ---------- */

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


        state.y += 15;


        /* ---------- Score ---------- */

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


        /* ---------- Breakdown ---------- */

        addPdfSection(
            pdf,
            state,
            "Score Breakdown"
        );


        const breakdown =
            currentAnalysis?.breakdown ||
            {};


        const breakdownLabels = {
            formatting: "Formatting",
            keywords: "Keywords",
            experience: "Experience",
            projects: "Projects",
            education: "Education",
            professionalism: "Professionalism"
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


                const line =
                    `${breakdownLabels[key]}: ${value}/${max}`;


                addPdfItems(
                    pdf,
                    state,
                    [line],
                    "•"
                );
            }
        );


        /* ---------- Strengths ---------- */

        addPdfSection(
            pdf,
            state,
            "Strengths"
        );


        addPdfItems(
            pdf,
            state,
            getTextItems(
                "strengths"
            ),
            "✓"
        );


        /* ---------- Areas to Fix ---------- */

        addPdfSection(
            pdf,
            state,
            "Areas to Fix"
        );


        addPdfItems(
            pdf,
            state,
            getTextItems(
                "weaknesses"
            ),
            "!"
        );


        /* ---------- Missing Skills ---------- */

        addPdfSection(
            pdf,
            state,
            "Missing Skills"
        );


        addPdfItems(
            pdf,
            state,
            getTextItems(
                "missingSkills"
            ),
            "+"
        );


        /* ---------- Suggestions ---------- */

        addPdfSection(
            pdf,
            state,
            "Actionable Suggestions"
        );


        addPdfItems(
            pdf,
            state,
            getTextItems(
                "suggestions"
            ),
            "→"
        );


        /* ---------- Footer ---------- */

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
                `ResumCheck • ATS Resume Analysis • Page ${page} of ${totalPages}`,
                20,
                290
            );
        }


        /* ---------- Save ---------- */

        const date =
            new Date()
                .toISOString()
                .slice(0, 10);


        pdf.save(
            `ResumCheck-ATS-Report-${date}.pdf`
        );
    }


    /* =======================================================
       DOWNLOAD BUTTON
       ======================================================= */

    downloadReportBtn?.addEventListener(
        "click",
        async () => {

            if (!currentAnalysis) {

                showError(
                    "Please analyze a resume before downloading the report."
                );

                return;
            }


            const originalHTML =
                downloadReportBtn.innerHTML;


            try {

                downloadReportBtn.disabled =
                    true;


                downloadReportBtn.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Generating PDF...
                `;


                await createPDFReport();


            } catch (error) {

                console.error(
                    "PDF generation failed:",
                    error
                );


                showError(
                    "Unable to generate the PDF. Please refresh the page and try again."
                );


            } finally {

                downloadReportBtn.disabled =
                    false;

                downloadReportBtn.innerHTML =
                    originalHTML;
            }
        }
    );


    /* =======================================================
       CONTACT FORM
       ======================================================= */

    contactForm?.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            if (contactStatus) {
                contactStatus.textContent =
                    "Sending...";
                contactStatus.className =
                    "alert";
            }


            if (contactBtn) {
                contactBtn.disabled =
                    true;

                contactBtn.dataset.originalHTML =
                    contactBtn.innerHTML;

                contactBtn.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Sending...
                `;
            }


            try {

                const payload = {
                    name:
                        $("contactName")?.value?.trim() ||
                        "",

                    email:
                        $("contactEmail")?.value?.trim() ||
                        "",

                    subject:
                        $("contactSubject")?.value?.trim() ||
                        "",

                    message:
                        $("contactMessage")?.value?.trim() ||
                        ""
                };


                const response =
                    await fetch(
                        "/api/contact",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body:
                                JSON.stringify(
                                    payload
                                )
                        }
                    );


                let data = {};

                try {
                    data =
                        await response.json();
                } catch {
                    data = {};
                }


                if (!response.ok) {

                    throw new Error(
                        data?.error ||
                        "Unable to send your message."
                    );
                }


                if (contactStatus) {

                    contactStatus.textContent =
                        data?.message ||
                        "Your message has been sent successfully.";

                    contactStatus.className =
                        "alert success";
                }


                contactForm.reset();


            } catch (error) {

                console.error(
                    "Contact form error:",
                    error
                );


                if (contactStatus) {

                    contactStatus.textContent =
                        error?.message ||
                        "Unable to send your message. Please try again.";

                    contactStatus.className =
                        "alert error";
                }


            } finally {

                if (contactBtn) {

                    contactBtn.disabled =
                        false;

                    if (
                        contactBtn.dataset
                            .originalHTML
                    ) {
                        contactBtn.innerHTML =
                            contactBtn.dataset
                                .originalHTML;
                    }
                }
            }
        }
    );


    /* =======================================================
       INITIALIZATION
       ======================================================= */

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            setInputMode("file");

            updateWidgetCounts();

        }
    );

})();
