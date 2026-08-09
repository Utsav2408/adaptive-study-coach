import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { subtopics } from "../data/sampleQuiz";

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

const ERROR_TYPE_LABELS: Record<string, string> = {
  conceptual_misunderstanding: "Conceptual Misunderstanding",
  procedural_error: "Procedural Error",
  misapplied_method: "Misapplied Method",
  prerequisite_gap: "Prerequisite Gap",
  misread_question: "Misread Question",
};

const ERROR_TYPE_COLORS: Record<string, string> = {
  conceptual_misunderstanding: "bg-purple-100 text-purple-700 border-purple-200",
  procedural_error: "bg-orange-100 text-orange-700 border-orange-200",
  misapplied_method: "bg-blue-100 text-blue-700 border-blue-200",
  prerequisite_gap: "bg-rose-100 text-rose-700 border-rose-200",
  misread_question: "bg-amber-100 text-amber-700 border-amber-200",
};

function getErrorBadgeColor(errorType: string | null): string {
  if (!errorType) return "bg-gray-100 text-gray-500 border-gray-200";
  return ERROR_TYPE_COLORS[errorType] ?? "bg-gray-100 text-gray-500 border-gray-200";
}

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ResultsState | null;

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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight text-text-heading">
        Your Results
      </h1>

      {/* Score card */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-text-body">Total Score</p>
        <p className="mt-1 text-5xl font-bold text-primary">
          {correctAnswers}
          <span className="text-2xl text-gray-400">/{totalQuestions}</span>
        </p>
        <p className="mt-1 text-sm text-text-body">
          {percentage}% correct
        </p>
      </div>

      {/* Areas to review */}
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
              <span
                key={sub}
                className="rounded-full bg-accent-light/40 px-3 py-1.5 text-sm font-medium text-accent"
              >
                {sub}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Subtopic breakdown */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-text-heading">
          Breakdown by Subtopic
        </h2>
        <div className="mt-3 space-y-3">
          {subtopicBreakdown.map((sb) => {
            const subPercent =
              sb.total > 0 ? Math.round((sb.correct / sb.total) * 100) : 0;
            return (
              <div
                key={sb.subtopic}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-text-heading">
                    {sb.subtopic}
                  </p>
                  <p className="text-sm text-text-body">
                    {sb.correct}/{sb.total}
                  </p>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      subPercent >= 80
                        ? "bg-green-500"
                        : subPercent >= 50
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${subPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Error analysis — grouped by subtopic */}
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
                <h3 className="mb-2 text-sm font-semibold text-text-heading">
                  {group.subtopic}
                </h3>
                <div className="space-y-3">
                  {group.wrongItems.map((item, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-red-100 bg-white p-4 shadow-sm"
                    >
                      <p className="text-sm font-medium text-text-heading">
                        {item.questionText}
                      </p>

                      {item.errorType ? (
                        <span
                          className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getErrorBadgeColor(item.errorType)}`}
                        >
                          {ERROR_TYPE_LABELS[item.errorType] ?? item.errorType}
                        </span>
                      ) : (
                        <span className="mt-2 inline-block rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-400">
                          Classifying…
                        </span>
                      )}

                      <div className="mt-2 space-y-1 text-sm">
                        <p>
                          <span className="font-medium text-gray-700">
                            Your answer:
                          </span>{" "}
                          <span className="text-red-600">{item.userAnswer}</span>
                        </p>
                        <p>
                          <span className="font-medium text-gray-700">
                            Correct answer:
                          </span>{" "}
                          <span className="text-green-600">{item.correctAnswer}</span>
                        </p>
                      </div>

                      {item.explanation && (
                        <div className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-sm text-text-body">
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
        <section className="mt-8 rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <p className="text-lg font-semibold text-green-700">
            Perfect score — all answers correct.
          </p>
          <p className="mt-1 text-sm text-green-600">
            You answered every question correctly across all subtopics.
          </p>
        </section>
      )}

      {/* Action buttons */}
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => navigate("/")}
          className="flex-1 cursor-pointer rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-text-heading shadow-sm transition-all duration-150 hover:bg-gray-50"
        >
          Try Again
        </button>
        <button
          onClick={() => navigate("/dashboard")}
          className="flex-1 cursor-pointer rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-primary-light"
        >
          View Dashboard
        </button>
      </div>
    </div>
  );
}