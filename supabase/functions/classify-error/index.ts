import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface ClassifyRequest {
  questionText: string;
  correctAnswer: string;
  userAnswer: string;
}

interface ClassifyResponse {
  error_type: string;
  explanation: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ERROR_CATEGORIES = [
  "conceptual_misunderstanding",
  "procedural_error",
  "misapplied_method",
  "prerequisite_gap",
  "misread_question",
];

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
    const { questionText, correctAnswer, userAnswer }: ClassifyRequest = await req.json();

    if (!questionText || !correctAnswer || !userAnswer) {
      return new Response(
        JSON.stringify({ error: "questionText, correctAnswer, and userAnswer are required" }),
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

    const categoriesList = ERROR_CATEGORIES.map((c) => `  - ${c}`).join("\n");

    const systemPrompt = `You are an expert tutor classifying student mistakes. You will be given a question, the correct answer, and the student's wrong answer.

Classify the mistake into exactly ONE of these error-type categories — always pick from this list, never invent new categories:
${categoriesList}

Definitions:
- conceptual_misunderstanding — The student doesn't grasp the underlying idea or principle required by the question.
- procedural_error — The student understands the concept but made an execution mistake (e.g. arithmetic slip, sign error, calculation oversight).
- misapplied_method — The student used the wrong approach, formula, or strategy for this particular situation.
- prerequisite_gap — The student is missing foundational knowledge that the topic assumes (e.g. doesn't know basic operations needed to solve).
- misread_question — The student misunderstood what the question was asking, not the underlying content (e.g. answered a different question, missed a key constraint).

Return valid JSON in this exact format — no markdown, no extra text:
{
  "error_type": "one_of_the_five_keys_above",
  "explanation": "A short 1-2 sentence plain-language explanation of why this mistake fits that category"
}`;

    const userPrompt = `Question: "${questionText}"
Correct Answer: "${correctAnswer}"
Student's Answer: "${userAnswer}"`;

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
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
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

    const result: ClassifyResponse = JSON.parse(content);

    // Validate the error_type is one of our known categories
    if (!result.error_type || !ERROR_CATEGORIES.includes(result.error_type)) {
      console.error("Invalid error_type returned:", result.error_type);
      throw new Error("AI returned an invalid error category");
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("classify-error error:", error);
    // Return null error_type + explanation so the frontend can fall back gracefully
    return new Response(
      JSON.stringify({
        error_type: null,
        explanation: null,
        _debug: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 200, // Always 200 so client doesn't throw — check error_type for null
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }
});