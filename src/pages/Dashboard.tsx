import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { subtopics } from "../data/sampleQuiz";

interface QuizResult {
  id: string;
  completed_at: string;
  subject: string;
  total_questions: number;
  correct_answers: number;
}

interface QuestionResult {
  id: string;
  quiz_result_id: string;
  question_text: string;
  subtopic: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: quizzes, error: quizError } = await supabase
          .from("quiz_results")
          .select("*")
          .order("completed_at", { ascending: false });

        if (quizError) throw quizError;

        setQuizResults(quizzes ?? []);

        if (quizzes && quizzes.length > 0) {
          const quizIds = quizzes.map((q) => q.id);
          const { data: questions, error: questionsError } = await supabase
            .from("question_results")
            .select("*")
            .in("quiz_result_id", quizIds);

          if (questionsError) throw questionsError;
          setQuestionResults(questions ?? []);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Compute cumulative subtopic stats from all question results
  const subtopicStats = subtopics.map((sub) => {
    const subQuestions = questionResults.filter((q) => q.subtopic === sub);
    const correct = subQuestions.filter((q) => q.is_correct).length;
    return {
      subtopic: sub,
      correct,
      total: subQuestions.length,
    };
  });

  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl items-center justify-center px-4 pt-20">
        <p className="text-gray-500">Loading dashboard…</p>
      </div>
    );
  }

  // Empty state
  if (quizResults.length === 0) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 pt-20 text-center">
        <div className="rounded-full bg-indigo-50 p-5">
          <svg
            className="h-10 w-10 text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
            />
          </svg>
        </div>
        <h2 className="mt-5 text-xl font-semibold text-gray-900">
          No quiz history yet
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Take your first diagnostic quiz to start tracking your progress across
          algebra subtopics.
        </p>
        <button
          onClick={() => navigate("/quiz")}
          className="mt-6 cursor-pointer rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 ease-out hover:bg-indigo-700 active:scale-[0.97]"
        >
          Take Your First Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">
        Dashboard
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Track your progress across quiz attempts.
      </p>

      {/* Overall subtopic performance */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">
          Overall Performance by Subtopic
        </h2>
        <div className="mt-3 space-y-3">
          {subtopicStats.map((s) => {
            const percent =
              s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
            return (
              <div key={s.subtopic} className="rounded-md border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {s.subtopic}
                  </p>
                  <p className="text-sm text-gray-600">
                    {s.correct}/{s.total}
                  </p>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      percent >= 80
                        ? "bg-green-500"
                        : percent >= 50
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quiz history table */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">
          Quiz History
        </h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Subject
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Score
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {quizResults.map((qr) => {
                const date = new Date(qr.completed_at).toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  },
                );
                return (
                  <tr key={qr.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {date}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {qr.subject}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {qr.correct_answers}/{qr.total_questions}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Take another quiz */}
      <div className="mt-8">
        <button
          onClick={() => navigate("/quiz")}
          className="cursor-pointer rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 ease-out hover:bg-indigo-700 active:scale-[0.97]"
        >
          Take Another Quiz
        </button>
      </div>
    </div>
  );
}