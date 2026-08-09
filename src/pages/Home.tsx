import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { quizSubject } from "../data/sampleQuiz";
import { supabase } from "../lib/supabaseClient";

interface GeneratedQuestion {
  questionText: string;
  subtopic: string;
  options: string[];
  correctAnswer: string;
}

export default function Home() {
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateQuiz = async () => {
    setGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "generate-quiz",
        {
          body: {
            subject: quizSubject,
            count: 5,
          },
        },
      );

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const questions: GeneratedQuestion[] = data.questions;

      // Assign stable IDs to generated questions
      const questionsWithIds = questions.map((q, i) => ({
        id: `ai-q${i + 1}`,
        type: "multiple-choice" as const,
        questionText: q.questionText,
        subtopic: q.subtopic,
        options: q.options,
        correctAnswer: q.correctAnswer,
      }));

      navigate("/quiz", { state: { questions: questionsWithIds } });
    } catch (err) {
      console.error("AI quiz generation failed:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate quiz. Try again.",
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 pt-20 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
        Adaptive Study Coach
      </h1>
      <p className="mt-4 text-lg text-gray-600">
        Diagnose your understanding of key topics with a short diagnostic quiz.
        See which areas you've mastered and which need more practice.
      </p>

      {/* Sample diagnostic quiz card */}
      <div className="mt-12 rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm transition-all duration-150 hover:shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {quizSubject}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              8 questions · 4 subtopics · Multiple choice & short answer
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">
            Recommended
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {["Linear Equations", "Quadratic Equations", "Inequalities", "Word Problems"].map(
            (sub) => (
              <span
                key={sub}
                className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
              >
                {sub}
              </span>
            ),
          )}
        </div>
        <button
          onClick={() => navigate("/quiz")}
          className="mt-5 w-full cursor-pointer rounded-lg bg-indigo-600 px-8 py-3 text-base font-semibold text-white shadow-sm transition-all duration-150 ease-out hover:bg-indigo-700 active:scale-[0.97]"
        >
          Start Diagnostic Quiz
        </button>
      </div>

      {/* AI-generated quiz card */}
      <div className="mt-6 rounded-xl border border-indigo-100 bg-white p-6 text-left shadow-sm transition-all duration-150 hover:shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              AI-Generated Practice
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              5 fresh questions · Generated on demand · Multiple choice
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">
            AI Powered
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          Get a unique set of algebra questions generated just for you. Every
          quiz is different — great for extra practice after finishing the
          diagnostic.
        </p>
        {error && (
          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          onClick={handleGenerateQuiz}
          disabled={generating}
          className={`mt-4 w-full cursor-pointer rounded-lg px-8 py-3 text-base font-semibold text-white shadow-sm transition-all duration-150 ease-out active:scale-[0.97] ${
            generating
              ? "cursor-not-allowed bg-indigo-300"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-5 w-5 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Generating…
            </span>
          ) : (
            "Generate New Quiz"
          )}
        </button>
      </div>
    </div>
  );
}