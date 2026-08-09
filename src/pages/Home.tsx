import { useNavigate } from "react-router-dom";
import { quizSubject } from "../data/sampleQuiz";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-xl px-4 pt-20 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-text-heading sm:text-5xl">
        Adaptive Study Coach
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-text-body">
        Diagnose your understanding of key topics with a short diagnostic quiz.
        See which areas you've mastered and which need more practice.
      </p>

      {/* Sample diagnostic quiz card */}
      <div className="mt-12 rounded-lg border border-gray-200 bg-white p-6 text-left shadow-sm transition-all duration-150 hover:shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text-heading">
              {quizSubject}
            </h2>
            <p className="mt-1 text-sm text-text-body">
              8 questions · 4 subtopics · Multiple choice & short answer
            </p>
          </div>
          <span className="rounded-full bg-accent-light/30 px-3 py-1 text-xs font-medium text-accent">
            Recommended
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {["Linear Equations", "Quadratic Equations", "Inequalities", "Word Problems"].map(
            (sub) => (
              <span
                key={sub}
                className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-text-body"
              >
                {sub}
              </span>
            ),
          )}
        </div>
        <button
          onClick={() => navigate("/quiz")}
          className="mt-5 w-full cursor-pointer rounded-lg bg-primary px-8 py-3 text-base font-semibold text-white shadow-sm transition-all duration-150 hover:bg-primary-light"
        >
          Start Diagnostic Quiz
        </button>
      </div>

      {/* Removed: standalone AI-Generated Practice card.                     */}
      {/* Targeted practice is now initiated from the Results screen.       */}
    </div>
  );
}