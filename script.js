const pdfjsPromise = import(
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.min.mjs"
);

let pdfjsLib;

(async () => {

    pdfjsLib = await pdfjsPromise;

    pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.mjs";

})();

const form = document.getElementById("resumeForm");

const loading = document.getElementById("loading");

const resultSection = document.getElementById("resultSection");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const file = document.getElementById("resumeFile").files[0];

    if (!file) {

        alert("Please upload your resume.");

        return;

    }

    loading.style.display = "block";

    resultSection.style.display = "none";

    try {

        let resumeText = "";

        if (file.name.endsWith(".pdf")) {

            resumeText = await readPDF(file);

        }

        else if (file.name.endsWith(".docx")) {

            resumeText = await readDOCX(file);

        }

        else {

            alert("Only PDF and DOCX are supported.");

            loading.style.display = "none";

            return;

        }

        const response = await fetch("/api/analyze", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                resume: resumeText
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText);
        }

        const result = await response.json();

        displayResult(result);

    }

    catch (error) {

        console.error("Error:", error);

        alert(error.message);

    }

    finally {

        loading.style.display = "none";

    }

});

async function readPDF(file) {

    const buffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({

        data: buffer

    }).promise;

    let text = "";

    for (let page = 1; page <= pdf.numPages; page++) {

        const p = await pdf.getPage(page);

        const content = await p.getTextContent();

        text += content.items.map(item => item.str).join(" ");

        text += "\n";

    }

    return text;

}

async function readDOCX(file) {

    const buffer = await file.arrayBuffer();

    const result = await mammoth.extractRawText({

        arrayBuffer: buffer

    });

    return result.value;

}

function displayResult(result) {

    document
        .getElementById("resultSection")
        .style.display = "block";

    document
        .getElementById("score")
        .textContent = result.score + "%";

    fillList("strengths", result.strengths);

    fillList("weaknesses", result.weaknesses);

    fillList("missingSkills", result.missing_skills);

    fillList("suggestions", result.suggestions);

    document
        .getElementById("resultSection")
        .scrollIntoView({
            behavior: "smooth"
        });

}

document
    .getElementById("newAnalysisBtn")
    .addEventListener("click", () => {

        resultSection.style.display = "none";

        form.reset();

        document
            .getElementById("upload")
            .scrollIntoView({
                behavior: "smooth"
            });

    });

function fillList(id, array) {

    const ul = document.getElementById(id);

    ul.innerHTML = "";

    if (!Array.isArray(array)) {

        ul.innerHTML = "<li>None</li>";

        return;

    }

    array.forEach(item => {

        const li = document.createElement("li");

        li.innerHTML = item;

        ul.appendChild(li);

    });

}

/*======================================================*
* DOWNLOAD ANALYSIS REPORT
*======================================================*/

document
    .getElementById("downloadReportBtn")
    .addEventListener("click", function () {

        const { jsPDF } = window.jspdf;

        const pdf = new jsPDF();

        const score =
            document.getElementById("score").innerText;

        const strengths =
            getListItems("strengths");

        const weaknesses =
            getListItems("weaknesses");

        const missingSkills =
            getListItems("missingSkills");

        const suggestions =
            getListItems("suggestions");

        let y = 20;

        /* Title */

        pdf.setFontSize(22);
        pdf.setFont("helvetica", "bold");

        pdf.text(
            "ResumeIQ - Resume Analysis Report",
            20,
            y
        );

        y += 15;

        /* Date */

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");

        pdf.text(
            "Generated: " + new Date().toLocaleDateString(),
            20,
            y
        );

        y += 15;

        /* ATS Score */

        pdf.setFontSize(18);
        pdf.setFont("helvetica", "bold");

        pdf.text(
            "ATS Score: " + score,
            20,
            y
        );

        y += 15;

        /* Strengths */

        y = addPDFSection(
            pdf,
            "Strengths",
            strengths,
            y
        );

        /* Weaknesses */

        y = addPDFSection(
            pdf,
            "Weaknesses",
            weaknesses,
            y
        );

        /* Missing Skills */

        y = addPDFSection(
            pdf,
            "Missing Skills",
            missingSkills,
            y
        );

        /* Suggestions */

        y = addPDFSection(
            pdf,
            "Suggestions",
            suggestions,
            y
        );

        /* Save PDF */

        pdf.save("ResumeIQ-Analysis-Report.pdf");

    });


/*======================================================*
* GET LIST ITEMS
*======================================================*/

function getListItems(id) {

    const list =
        document.getElementById(id);

    return Array.from(
        list.querySelectorAll("li")
    ).map(li => li.innerText);

}


/*======================================================*
* ADD SECTION TO PDF
*======================================================*/

function addPDFSection(pdf, title, items, y) {

    /* Check page */

    if (y > 250) {

        pdf.addPage();

        y = 20;

    }

    pdf.setFontSize(16);

    pdf.setFont("helvetica", "bold");

    pdf.text(
        title,
        20,
        y
    );

    y += 10;

    pdf.setFontSize(11);

    pdf.setFont("helvetica", "normal");

    if (!items.length) {

        pdf.text(
            "None",
            25,
            y
        );

        return y + 12;

    }

    items.forEach(item => {

        const lines =
            pdf.splitTextToSize(
                "• " + item,
                165
            );

        if (y > 270) {

            pdf.addPage();

            y = 20;

        }

        pdf.text(
            lines,
            25,
            y
        );

        y +=
            (lines.length * 6) + 4;

    });

    return y + 8;

}