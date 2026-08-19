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

Return ONLY valid JSON.

Format:

{

"score":85,

"strengths":["..."],

"weaknesses":["..."],

"missing_skills":["..."],

"suggestions":["..."]

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
