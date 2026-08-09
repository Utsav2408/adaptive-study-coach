import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface GenerateQuizRequest {
  subject: string;
  count?: number;
}

interface Question {
  questionText: string;
  subtopic: string;
  options: string[];
  correctAnswer: string;
}

interface GenerateQuizResponse {
  questions: Question[];
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const { subject, count = 5 }: GenerateQuizRequest = await req.json();

    if (!subject) {
      return new Response(
        JSON.stringify({ error: "subject is required" }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    const apiKey = Deno.env.get("AI_ML_API_KEY");
    if (!apiKey) {
      throw new Error("AI_ML_API_KEY is not configured");
    }

    const systemPrompt = `You are a math quiz generator. Generate ${count} multiple-choice algebra questions covering these subtopics: Linear Equations, Quadratic Equations, Inequalities, and Word Problems. Distribute the questions evenly across subtopics.

Each question must have exactly 4 options. Exactly one option must be the correct answer.

Return valid JSON in this exact format — no markdown, no extra text:
{
  "questions": [
    {
      "questionText": "The question text here",
      "subtopic": "One of: Linear Equations | Quadratic Equations | Inequalities | Word Problems",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "The exact text of the correct option"
    }
  ]
}`;

    const response = await fetch("https://api.aimlapi.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate ${count} algebra questions for the subject: ${subject}`,
          },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI/ML API error:", response.status, errorText);
      throw new Error(`AI/ML API returned status ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from AI/ML API");
    }

    const result: GenerateQuizResponse = JSON.parse(content);

    // Validate the response structure
    if (!result.questions || !Array.isArray(result.questions)) {
      throw new Error("Invalid response format: missing questions array");
    }

    // Ensure each question has the required fields
    for (const q of result.questions) {
      if (!q.questionText || !q.subtopic || !q.options || !q.correctAnswer) {
        throw new Error("Invalid question format: missing required fields");
      }
      if (q.options.length !== 4) {
        // Pad or trim options to exactly 4
        while (q.options.length < 4) q.options.push("");
        q.options = q.options.slice(0, 4);
      }
    }

    // Truncate to requested count
    if (result.questions.length > count) {
      result.questions = result.questions.slice(0, count);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-quiz error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }
});