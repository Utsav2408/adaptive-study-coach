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

/* ── Home illustration (abstract study graphic) ──────────────────── */

function HomeIllustration() {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-28 w-auto sm:h-36"
      aria-hidden="true"
    >
      {/* Open book base */}
      <path d="M30 120 L100 90 L170 120 L100 140 Z" fill="#1B2A4A" opacity="0.08" />
      {/* Left page */}
      <path d="M30 115 Q60 82 100 88 L100 135 Q60 128 30 115Z" fill="#1B2A4A" opacity="0.12" />
      {/* Right page */}
      <path d="M100 88 Q140 82 170 115 L170 115 Q140 128 100 135Z" fill="#2C3F6A" opacity="0.10" />
      {/* Accent line */}
      <line x1="100" y1="88" x2="100" y2="138" stroke="#C9953E" strokeWidth="1.5" opacity="0.4" />
      {/* Content lines left */}
      <rect x="48" y="102" width="36" height="2.5" rx="1.25" fill="#1B2A4A" opacity="0.15" />
      <rect x="48" y="112" width="30" height="2.5" rx="1.25" fill="#1B2A4A" opacity="0.10" />
      <rect x="48" y="122" width="34" height="2.5" rx="1.25" fill="#1B2A4A" opacity="0.12" />
      {/* Content lines right */}
      <rect x="116" y="102" width="36" height="2.5" rx="1.25" fill="#2C3F6A" opacity="0.15" />
      <rect x="116" y="112" width="30" height="2.5" rx="1.25" fill="#2C3F6A" opacity="0.10" />
      {/* Checkmark */}
      <circle cx="170" cy="45" r="22" fill="none" stroke="#C9953E" strokeWidth="2" opacity="0.25" />
      <path d="M162 45 L167 51 L177 39" stroke="#C9953E" strokeWidth="2.5" fill="none" opacity="0.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Small accent dots */}
      <circle cx="30" cy="45" r="4" fill="#C9953E" opacity="0.15" />
      <circle cx="20" cy="55" r="2.5" fill="#1B2A4A" opacity="0.1" />
      <circle cx="175" cy="80" r="3" fill="#C9953E" opacity="0.12" />
    </svg>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
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

  const displayName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto max-w-2xl px-4 pt-12 pb-16 sm:pt-20">
      {/* ── Hero header ──────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
        <HomeIllustration />
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-heading sm:text-4xl">
            Hi, {displayName}
          </h1>
          <p className="mt-2 max-w-md text-base leading-relaxed text-text-body">
            {hasDiagnostic
              ? "You've completed your diagnostic. Keep building on your strengths and sharpening the areas that need work."
              : "Diagnose your understanding of key topics with a short quiz. See what you've mastered and what needs practice."}
          </p>
        </div>
      </div>

      {/* ── Subject card ─────────────────────────────────────────── */}
      <div className="card-elevated mt-10 p-6 sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text-heading">
              {quizSubject}
            </h2>
            <p className="mt-1 text-sm text-text-body">
              4 subtopics · Multiple choice & short answer
            </p>
          </div>
          <span className="tag tag-accent self-start">
            {hasDiagnostic ? "In Progress" : "Recommended"}
          </span>
        </div>

        {/* Subtopic tags */}
        <div className="mt-5 flex flex-wrap gap-2">
          {["Linear Equations", "Quadratic Equations", "Inequalities", "Word Problems"].map((sub) => (
            <span
              key={sub}
              className="tag tag-primary"
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
              className="btn btn-primary mt-6 w-full px-8 py-3 text-base"
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
            <p className="mt-2 text-center text-xs text-text-muted">
              Refresh your baseline or try a different subject below.
            </p>

            {/* Secondary: Retake Diagnostic */}
            <div className="mt-4 text-center">
              <button
                onClick={handleStartDiagnostic}
                className="btn btn-ghost text-sm font-medium"
              >
                Retake Diagnostic Quiz
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={handleStartDiagnostic}
            className="btn btn-primary mt-6 w-full px-8 py-3 text-base"
          >
            Start Diagnostic Quiz
          </button>
        )}
      </div>

      {/* ── Dashboard link ────────────────────────────────────────── */}
      {hasDiagnostic && (
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate("/dashboard")}
            className="btn btn-ghost text-sm font-medium gap-1.5"
          >
            View your dashboard
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}