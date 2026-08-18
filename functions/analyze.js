export async function handler(event) {

    if (event.httpMethod !== "POST") {

        return {

            statusCode: 405,

            body: "Method Not Allowed"

        };

    }

    try {

        const data = JSON.parse(event.body);

        const resumeText = data.resume;

        const prompt = `
You are an ATS Resume Analyzer.

Analyze the provided resume and evaluate it using the following scoring system.

ATS SCORE: 100 POINTS TOTAL

1. ATS Formatting and Structure: 20 points
2. Skills and Keyword Relevance: 25 points
3. Work Experience: 20 points
4. Projects and Achievements: 15 points
5. Education and Certifications: 10 points
6. Content Quality and Professionalism: 10 points

For each category, assign a score from 0 up to its maximum.

IMPORTANT:
- Do not choose the overall score arbitrarily.
- Do not invent information.
- The score must be based only on the resume.
- Return the individual category scores.
- The final score will be calculated by the application.

Evaluate:

ATS Formatting and Structure:
- ATS-friendly structure
- Clear section headings
- Consistent formatting
- Contact information
- Dates and spacing
- Avoidance of complex layouts

Skills and Keyword Relevance:
- Technical skills
- Relevant technologies
- Frameworks
- Tools
- Industry keywords

Work Experience:
- Relevant experience
- Responsibilities
- Action verbs
- Technologies used
- Quantifiable achievements

Projects and Achievements:
- Project relevance
- Technologies used
- Results and impact
- Problem-solving
- Measurable achievements

Education and Certifications:
- Degree
- Relevant education
- Certifications
- Training

Content Quality and Professionalism:
- Grammar
- Spelling
- Clarity
- Conciseness
- Professional language

Return ONLY valid JSON:

{
  "score_breakdown": {
    "ats_formatting": 0,
    "skills_keywords": 0,
    "work_experience": 0,
    "projects_achievements": 0,
    "education_certifications": 0,
    "content_quality": 0
  },
  "strengths": [],
  "weaknesses": [],
  "missing_skills": [],
  "suggestions": []
}

Resume:
${resumeText}
`;
        const response = await fetch(

            "https://api.groq.com/openai/v1/chat/completions",

            {

                method: "POST",

                headers: {

                    "Authorization":

                        `Bearer ${process.env.GROQ_API_KEY}`,

                    "Content-Type": "application/json"

                },

                body: JSON.stringify({

                    model: "openai/gpt-oss-20b",

                    messages: [

                        {

                            role: "user",

                            content: prompt

                        }

                    ],

                    temperature: 0.3

                })

            }

        );

        const result = await response.json();

        let text =

            result.choices[0].message.content;

        text = text.replace(/```json/g, "")

            .replace(/```/g, "")

            .trim();

        return {

            statusCode: 200,

            headers: {

                "Content-Type": "application/json"

            },

            body: text

        };

    }

    catch (error) {

        return {

            statusCode: 500,

            body: JSON.stringify({

                error: error.message

            })

        };

    }

}
