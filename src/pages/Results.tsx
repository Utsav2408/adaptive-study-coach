import { useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { subtopics, quizSubject } from "../data/sampleQuiz";
import { supabase } from "../lib/supabaseClient";

interface QuestionResult {
  questionText: string;
  subtopic: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  errorType: string | null;
  explanation: string | null;
}

interface ResultsState {
  totalQuestions: number;
  correctAnswers: number;
  questionResults: QuestionResult[];
}

interface GeneratedQuestion {
  questionText: string;
  subtopic: string;
  options: string[];
  correctAnswer: string;
}

/* ── Circular score ring ──────────────────────────────────────────── */

function ScoreRing({ correct, total }: { correct: number; total: number }) {
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const ringColor =
    percentage >= 80 ? "#2E7D5A" :
    percentage >= 50 ? "#C9953E" :
    "#B34A48";

  const bgColor =
    percentage >= 80 ? "#E6F3ED" :
    percentage >= 50 ? "#F5EDE0" :
    "#F8EAEA";

  return (
    <div className="flex flex-col items-center">
      <svg width="150" height="150" viewBox="0 0 150 150" className="drop-shadow-sm">
        {/* Background ring */}
        <circle
          cx="75"
          cy="75"
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth="10"
        />
        {/* Score ring */}
        <circle
          cx="75"
          cy="75"
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 75 75)"
          className="transition-all duration-1000 ease-out"
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
        {/* Center text */}
        <text
          x="75"
          y="68"
          textAnchor="middle"
          fill="#1A1A1A"
          fontSize="32"
          fontWeight="700"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {correct}
        </text>
        <text
          x="75"
          y="90"
          textAnchor="middle"
          fill="#5A5A5A"
          fontSize="14"
          fontWeight="500"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          / {total}
        </text>
      </svg>
      <p className="mt-2 text-lg font-semibold" style={{ color: ringColor }}>
        {percentage}% correct
      </p>
    </div>
  );
}

/* ── Error type constants ─────────────────────────────────────────── */

const ERROR_TYPE_LABELS: Record<string, string> = {
  conceptual_misunderstanding: "Conceptual Misunderstanding",
  procedural_error: "Procedural Error",
  misapplied_method: "Misapplied Method",
  prerequisite_gap: "Prerequisite Gap",
  misread_question: "Misread Question",
};

const ERROR_TYPE_BADGES: Record<string, string> = {
  conceptual_misunderstanding: "bg-purple-50 text-purple-700 border-purple-200",
  procedural_error: "bg-orange-50 text-orange-700 border-orange-200",
  misapplied_method: "bg-blue-50 text-blue-700 border-blue-200",
  prerequisite_gap: "bg-rose-50 text-rose-700 border-rose-200",
  misread_question: "bg-amber-50 text-amber-700 border-amber-200",
};

function getErrorBadgeColor(errorType: string | null): string {
  if (!errorType) return "bg-gray-100 text-gray-500 border-gray-200";
  return ERROR_TYPE_BADGES[errorType] ?? "bg-gray-100 text-gray-500 border-gray-200";
}

/* ── Component ────────────────────────────────────────────────────── */

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ResultsState | null;

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  if (!state) {
    return <Navigate to="/" replace />;
  }

  const { totalQuestions, correctAnswers, questionResults } = state;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);

  // Build per-subtopic breakdown
  const subtopicBreakdown = subtopics.map((sub) => {
    const subResults = questionResults.filter((r) => r.subtopic === sub);
    const correct = subResults.filter((r) => r.isCorrect).length;
    return { subtopic: sub, correct, total: subResults.length };
  });

  const wrongAnswers = questionResults.filter((r) => !r.isCorrect);

  const subtopicsToReview = subtopicBreakdown
    .filter((sb) => sb.correct < sb.total)
    .map((sb) => sb.subtopic);

  const wrongBySubtopic = subtopicsToReview.map((sub) => ({
    subtopic: sub,
    wrongItems: wrongAnswers.filter((wa) => wa.subtopic === sub),
  }));

  const handleStartTargetedPractice = async () => {
    setGenerating(true);
    setGenerateError(null);

    try {
      const targetSubtopics =
        subtopicsToReview.length > 0 ? subtopicsToReview : undefined;

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

      const questions: GeneratedQuestion[] = data.questions;

      const questionsWithIds = questions.map((q, i) => ({
        id: `ai-q${i + 1}`,
        type: "multiple-choice" as const,
        questionText: q.questionText,
        subtopic: q.subtopic,
        options: q.options,
        correctAnswer: q.correctAnswer,
      }));

      navigate("/quiz", { state: { questions: questionsWithIds, sessionType: "practice" } });
    } catch (err) {
      console.error("Targeted practice generation failed:", err);
      setGenerateError(
        err instanceof Error
          ? err.message
          : "Failed to generate practice quiz. Please try again.",
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight text-text-heading">
        Your Results
      </h1>

      {/* ── Score ring ────────────────────────────────────────────── */}
      <div className="card-elevated mt-6 p-8">
        <ScoreRing correct={correctAnswers} total={totalQuestions} />
      </div>

      {/* ── Areas to review ───────────────────────────────────────── */}
      {wrongAnswers.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-text-heading">
            Areas to Review
          </h2>
          <p className="mt-1 text-sm text-text-body">
            You got questions wrong in {subtopicsToReview.length} of{" "}
            {subtopics.length} subtopics:
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {subtopicsToReview.map((sub) => (
              <span key={sub} className="tag tag-accent">
                {sub}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ── Subtopic breakdown ────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-text-heading">
          Breakdown by Subtopic
        </h2>
        <div className="mt-3 space-y-3">
          {subtopicBreakdown.map((sb) => {
            const subPercent =
              sb.total > 0 ? Math.round((sb.correct / sb.total) * 100) : 0;
            const barColor =
              subPercent >= 80
                ? "bg-success"
                : subPercent >= 50
                  ? "bg-accent"
                  : "bg-error";
            return (
              <div key={sb.subtopic} className="card-elevated p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-text-heading">
                    {sb.subtopic}
                  </p>
                  <p className="text-sm text-text-body">
                    {sb.correct}/{sb.total}
                  </p>
                </div>
                <div className="progress-bar mt-2">
                  <div
                    className={`progress-bar-fill ${barColor}`}
                    style={{ width: `${subPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Error analysis — grouped by subtopic ──────────────────── */}
      {wrongAnswers.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-text-heading">
            Error Analysis
          </h2>
          <p className="mt-1 text-sm text-text-body">
            AI-classified reasons for each mistake, grouped by topic.
          </p>

          <div className="mt-4 space-y-6">
            {wrongBySubtopic.map((group) => (
              <div key={group.subtopic}>
                <h3 className="mb-3 text-sm font-semibold text-text-heading">
                  {group.subtopic}
                </h3>
                <div className="space-y-3">
                  {group.wrongItems.map((item, i) => (
                    <div key={i} className="card-elevated p-5">
                      <p className="text-sm font-medium text-text-heading">
                        {item.questionText}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getErrorBadgeColor(item.errorType)}`}
                        >
                          {item.errorType
                            ? (ERROR_TYPE_LABELS[item.errorType] ?? item.errorType)
                            : "Classifying…"}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        <div className="rounded-lg bg-error-light/50 px-3 py-2">
                          <span className="text-xs font-medium text-error">Your answer</span>
                          <p className="mt-0.5 text-error">{item.userAnswer}</p>
                        </div>
                        <div className="rounded-lg bg-success-light/50 px-3 py-2">
                          <span className="text-xs font-medium text-success">Correct answer</span>
                          <p className="mt-0.5 text-success">{item.correctAnswer}</p>
                        </div>
                      </div>

                      {item.explanation && (
                        <div className="mt-3 rounded-lg bg-surface-muted px-4 py-3 text-sm text-text-body">
                          <span className="font-medium text-text-heading">Why:</span>{" "}
                          {item.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Perfect score — refined message */}
      {wrongAnswers.length === 0 && (
        <section className="section-muted mt-8 p-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-success-light">
            <svg className="h-7 w-7 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-success">
            Perfect score — all answers correct.
          </p>
          <p className="mt-1 text-sm text-text-body">
            You answered every question correctly across all subtopics.
          </p>
        </section>
      )}

      {/* Action buttons */}
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => navigate("/")}
          className="btn btn-secondary flex-1 px-6 py-3 text-sm"
        >
          Try Again
        </button>
        <button
          onClick={handleStartTargetedPractice}
          disabled={generating}
          className="btn btn-primary flex-1 px-6 py-3 text-sm"
        >
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-5 w-5 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating…
            </span>
          ) : (
            "Start Targeted Practice"
          )}
        </button>
        <button
          onClick={() => navigate("/dashboard")}
          className="btn bg-gray-700 text-white hover:bg-gray-800 flex-1 px-6 py-3 text-sm rounded-xl"
        >
          View Dashboard
        </button>
      </div>

      {generateError && (
        <p className="mt-4 rounded-lg bg-error-light px-4 py-3 text-sm text-error">
          {generateError}
        </p>
      )}
    </div>
  );
}