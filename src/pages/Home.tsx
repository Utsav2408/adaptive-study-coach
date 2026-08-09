import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { quizSubject, subtopics } from "../data/sampleQuiz";
import { useAuth } from "../contexts/AuthContext";
import { useDiagnosticCheck } from "../hooks/useDiagnosticCheck";

interface GeneratedQuestion {
  questionText: string;
  subtopic: string;
  options: string[];
  correctAnswer: string;
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasDiagnostic, checking } = useDiagnosticCheck(user?.id);
  const [generating, setGenerating] = useState(false);

  // ── Start a fresh diagnostic quiz ─────────────────────────────────
  const handleStartDiagnostic = () => {
    navigate("/quiz", { state: { sessionType: "diagnostic" } });
  };

  // ── Start targeted practice based on last diagnostic's weak areas ─
  const handleStartTargetedPractice = async () => {
    if (!user) return;
    setGenerating(true);

    try {
      // 1. Get the most recent diagnostic session
      const { data: lastDiag, error: diagErr } = await supabase
        .from("quiz_results")
        .select("id")
        .eq("user_id", user.id)
        .eq("subject", quizSubject)
        .eq("session_type", "diagnostic")
        .order("completed_at", { ascending: false })
        .limit(1)
        .single();

      if (diagErr || !lastDiag) {
        // Fallback: just open a practice quiz with sample questions
        navigate("/quiz", { state: { sessionType: "practice" } });
        return;
      }

      // 2. Get question results to find weak subtopics
      const { data: questionResults } = await supabase
        .from("question_results")
        .select("subtopic, is_correct")
        .eq("quiz_result_id", lastDiag.id);

      const weakSubtopics = subtopics.filter((sub) => {
        const subQs = questionResults?.filter((q) => q.subtopic === sub) ?? [];
        const correct = subQs.filter((q) => q.is_correct).length;
        return correct < subQs.length;
      });

      const targetSubtopics =
        weakSubtopics.length > 0 ? weakSubtopics : undefined;

      // 3. Generate AI questions targeting weak areas
      const { data, error: fnError } = await supabase.functions.invoke(
        "generate-quiz",
        {
          body: {
            subject: quizSubject,
            count: 5,
            subtopics: targetSubtopics,
          },
        },
      );

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const questions = (data.questions as GeneratedQuestion[]).map(
        (q, i) => ({
          id: `ai-q${i + 1}`,
          type: "multiple-choice" as const,
          questionText: q.questionText,
          subtopic: q.subtopic,
          options: q.options,
          correctAnswer: q.correctAnswer,
        }),
      );

      navigate("/quiz", { state: { questions, sessionType: "practice" } });
    } catch (err) {
      console.error("Targeted practice generation failed:", err);
      // Fallback: open quiz with sample questions as practice
      navigate("/quiz", { state: { sessionType: "practice" } });
    } finally {
      setGenerating(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────
  if (checking) {
    return (
      <div className="mx-auto flex max-w-xl items-center justify-center px-4 pt-20">
        <p className="text-text-body">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 pt-20 text-center">
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <h1 className="text-4xl font-bold tracking-tight text-text-heading sm:text-5xl">
        Adaptive Study Coach
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-text-body">
        {hasDiagnostic
          ? "You've completed your diagnostic quiz. Keep building on your strengths and targeting your weak areas."
          : "Diagnose your understanding of key topics with a short diagnostic quiz. See which areas you've mastered and which need more practice."}
      </p>

      {/* ── Subject card ──────────────────────────────────────────── */}
      <div className="mt-12 rounded-lg border border-gray-200 bg-white p-6 text-left shadow-sm transition-all duration-150 hover:shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text-heading">
              {quizSubject}
            </h2>
            <p className="mt-1 text-sm text-text-body">
              4 subtopics · Multiple choice & short answer
            </p>
          </div>
          <span className="rounded-full bg-accent-light/30 px-3 py-1 text-xs font-medium text-accent">
            {hasDiagnostic ? "In Progress" : "Recommended"}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            "Linear Equations",
            "Quadratic Equations",
            "Inequalities",
            "Word Problems",
          ].map((sub) => (
            <span
              key={sub}
              className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-text-body"
            >
              {sub}
            </span>
          ))}
        </div>

        {/* ── Primary action ──────────────────────────────────────── */}
        {hasDiagnostic ? (
          <>
            <button
              onClick={handleStartTargetedPractice}
              disabled={generating}
              className={`mt-5 w-full cursor-pointer rounded-lg px-8 py-3 text-base font-semibold text-white shadow-sm transition-all duration-150 ${
                generating
                  ? "cursor-not-allowed bg-primary-light/60"
                  : "bg-primary hover:bg-primary-light active:scale-[0.98]"
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
                "Start Targeted Practice"
              )}
            </button>
            <p className="mt-2 text-xs text-text-body">
              Refresh your baseline or try a different subject below.
            </p>

            {/* ── Secondary: Retake Diagnostic ────────────────────── */}
            <div className="mt-3 text-center">
              <button
                onClick={handleStartDiagnostic}
                className="cursor-pointer text-sm font-medium text-primary underline-offset-2 hover:text-primary-light hover:underline"
              >
                Retake Diagnostic Quiz
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={handleStartDiagnostic}
            className="mt-5 w-full cursor-pointer rounded-lg bg-primary px-8 py-3 text-base font-semibold text-white shadow-sm transition-all duration-150 hover:bg-primary-light active:scale-[0.98]"
          >
            Start Diagnostic Quiz
          </button>
        )}
      </div>

      {/* ── Dashboard link ────────────────────────────────────────── */}
      {hasDiagnostic && (
        <div className="mt-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="cursor-pointer text-sm font-medium text-text-body underline-offset-2 hover:text-text-heading hover:underline"
          >
            View your dashboard →
          </button>
        </div>
      )}
    </div>
  );
}