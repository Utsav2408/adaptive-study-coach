import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { subtopics } from "../data/sampleQuiz";

interface QuestionResult {
  questionText: string;
  subtopic: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

interface ResultsState {
  totalQuestions: number;
  correctAnswers: number;
  questionResults: QuestionResult[];
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

  // Subtopics that need review (any wrong answers)
  const subtopicsToReview = subtopicBreakdown
    .filter((sb) => sb.correct < sb.total)
    .map((sb) => sb.subtopic);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">
        Your Results
      </h1>

      {/* Score card */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-gray-500">Total Score</p>
        <p className="mt-1 text-5xl font-bold text-indigo-600">
          {correctAnswers}
          <span className="text-2xl text-gray-400">/{totalQuestions}</span>
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {percentage}% correct
        </p>
      </div>

      {/* Areas to review */}
      {wrongAnswers.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">
            Areas to Review
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            You got questions wrong in {subtopicsToReview.length} of{" "}
            {subtopics.length} subtopics:
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {subtopicsToReview.map((sub) => (
              <span
                key={sub}
                className="rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700"
              >
                {sub}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Subtopic breakdown */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">
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
                  <p className="text-sm font-medium text-gray-900">
                    {sb.subtopic}
                  </p>
                  <p className="text-sm text-gray-600">
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

      {/* Wrong answers detail */}
      {wrongAnswers.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">
            Incorrect Answers ({wrongAnswers.length})
          </h2>
          <div className="mt-3 space-y-4">
            {wrongAnswers.map((wa, i) => (
              <div
                key={i}
                className="rounded-lg border border-red-100 bg-red-50 p-4"
              >
                <p className="text-xs font-medium text-red-600">
                  {wa.subtopic}
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {wa.questionText}
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <p>
                    <span className="font-medium text-gray-700">
                      Your answer:
                    </span>{" "}
                    <span className="text-red-600">{wa.userAnswer}</span>
                  </p>
                  <p>
                    <span className="font-medium text-gray-700">
                      Correct answer:
                    </span>{" "}
                    <span className="text-green-600">{wa.correctAnswer}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Perfect score celebration */}
      {wrongAnswers.length === 0 && (
        <section className="mt-8 rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <p className="text-lg font-semibold text-green-700">
            Perfect score! 🎉
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
          className="flex-1 cursor-pointer rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-150 ease-out hover:bg-gray-50 active:scale-[0.97]"
        >
          Try Again
        </button>
        <button
          onClick={() => navigate("/dashboard")}
          className="flex-1 cursor-pointer rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 ease-out hover:bg-indigo-700 active:scale-[0.97]"
        >
          View Dashboard
        </button>
      </div>
    </div>
  );
}