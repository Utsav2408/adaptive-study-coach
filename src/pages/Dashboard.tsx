import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { quizSubject, subtopics } from "../data/sampleQuiz";
import { useAuth } from "../contexts/AuthContext";
import { useDiagnosticCheck } from "../hooks/useDiagnosticCheck";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface QuizResultRow {
  id: string;
  completed_at: string;
  subject: string;
  total_questions: number;
  correct_answers: number;
}

interface QuestionResultRow {
  id: string;
  quiz_result_id: string;
  question_text: string;
  subtopic: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  error_type: string | null;
}

interface GeneratedQuestion {
  questionText: string;
  subtopic: string;
  options: string[];
  correctAnswer: string;
}

interface SubtopicStat {
  subtopic: string;
  correct: number;
  total: number;
  percentage: number;
}

interface SessionData {
  id: string;
  completedAt: string;
  label: string;
  subtopicStats: SubtopicStat[];
}

type GapDataRow = {
  subtopic: string;
  conceptual_misunderstanding: number;
  procedural_error: number;
  misapplied_method: number;
  prerequisite_gap: number;
  misread_question: number;
};

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const ERROR_TYPES = [
  "conceptual_misunderstanding",
  "procedural_error",
  "misapplied_method",
  "prerequisite_gap",
  "misread_question",
] as const;

const ERROR_LABELS: Record<string, string> = {
  conceptual_misunderstanding: "Concept",
  procedural_error: "Procedural",
  misapplied_method: "Method",
  prerequisite_gap: "Prerequisite",
  misread_question: "Misread",
};

const SUBTOPIC_COLORS: Record<string, string> = {
  "Linear Equations": "#1B2A4A",
  "Quadratic Equations": "#C9953E",
  Inequalities: "#10b981",
  "Word Problems": "#ef4444",
};

type TabId = "mastery" | "gaps" | "trends";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function computePercentage(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function gapCellStyle(count: number, max: number) {
  if (count === 0) {
    return "bg-gray-50 text-gray-300";
  }
  const intensity = max > 0 ? count / max : 0;
  if (intensity >= 0.75) return "bg-red-200 text-red-900 font-semibold";
  if (intensity >= 0.5) return "bg-orange-100 text-orange-800 font-medium";
  if (intensity >= 0.25) return "bg-yellow-50 text-yellow-700";
  return "bg-blue-50 text-blue-700";
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasDiagnostic, checking } = useDiagnosticCheck(user?.id);

  const [quizResults, setQuizResults] = useState<QuizResultRow[]>([]);
  const [questionResults, setQuestionResults] = useState<QuestionResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("mastery");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: quizzes, error: quizError } = await supabase
          .from("quiz_results")
          .select("*")
          .order("completed_at", { ascending: true });

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

  /* ---- Derived data ----------------------------------------------- */

  const masteryStats: SubtopicStat[] = subtopics.map((sub) => {
    const subQs = questionResults.filter((q) => q.subtopic === sub);
    const correct = subQs.filter((q) => q.is_correct).length;
    return {
      subtopic: sub,
      correct,
      total: subQs.length,
      percentage: computePercentage(correct, subQs.length),
    };
  });

  const gapData: GapDataRow[] = subtopics.map((sub) => {
    const wrong = questionResults.filter(
      (q) => q.subtopic === sub && !q.is_correct && q.error_type !== null,
    );
    const row: Record<string, number> = {};
    for (const et of ERROR_TYPES) {
      row[et] = wrong.filter((q) => q.error_type === et).length;
    }
    return { subtopic: sub, ...row } as GapDataRow;
  });

  const maxGapCount = Math.max(
    ...gapData.flatMap((row) => ERROR_TYPES.map((et) => row[et])),
    1,
  );

  const sessionData: SessionData[] = quizResults.map((qr, idx) => {
    const sessionQuestions = questionResults.filter(
      (q) => q.quiz_result_id === qr.id,
    );
    const stats = subtopics.map((sub) => {
      const subQs = sessionQuestions.filter((q) => q.subtopic === sub);
      const correct = subQs.filter((q) => q.is_correct).length;
      return {
        subtopic: sub,
        correct,
        total: subQs.length,
        percentage: computePercentage(correct, subQs.length),
      };
    });
    return {
      id: qr.id,
      completedAt: qr.completed_at,
      label: `#${idx + 1} ${formatDate(qr.completed_at)}`,
      subtopicStats: stats,
    };
  });

  const trendChartData = sessionData.map((s) => {
    const point: Record<string, string | number> = { label: s.label };
    for (const st of s.subtopicStats) {
      point[st.subtopic] = st.percentage;
    }
    return point;
  });

  /* ---- Navigation helpers ----------------------------------------- */

  const handleStartDiagnostic = () => {
    navigate("/quiz", { state: { sessionType: "diagnostic" } });
  };

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
      navigate("/quiz", { state: { sessionType: "practice" } });
    } finally {
      setGenerating(false);
    }
  };

  /* ---- Tab config ------------------------------------------------ */

  const tabs: { id: TabId; label: string }[] = [
    { id: "mastery", label: "Mastery" },
    { id: "gaps", label: "Gap Breakdown" },
    { id: "trends", label: "Trends" },
  ];

  /* ---- Render ---------------------------------------------------- */

  if (loading) {
    return (
      <div className="mx-auto flex max-w-4xl items-center justify-center px-4 pt-20">
        <p className="text-text-body">Loading dashboard…</p>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────
  if (quizResults.length === 0) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 pt-24 text-center">
        <div className="rounded-full bg-primary/5 p-5">
          <svg
            className="h-10 w-10 text-primary/40"
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
        <h2 className="mt-5 text-xl font-semibold text-text-heading">
          No quiz history yet
        </h2>
        <p className="mt-2 max-w-sm text-sm text-text-body">
          Take your first diagnostic quiz to start tracking your progress across
          algebra subtopics.
        </p>
        <button
          onClick={() => navigate("/quiz")}
          className="mt-6 cursor-pointer rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-primary-light"
        >
          Take Your First Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-heading">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-text-body">
            Track your progress across {quizResults.length} quiz
            {quizResults.length > 1 ? "zes" : ""}.
          </p>
        </div>
        {/* ── Conditional CTA ─────────────────────────────── */}
        {checking ? (
          <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200" />
        ) : hasDiagnostic ? (
          <div className="flex flex-col items-end gap-1.5">
            <button
              onClick={handleStartTargetedPractice}
              disabled={generating}
              className={`cursor-pointer rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 ${
                generating
                  ? "cursor-not-allowed bg-primary-light/60"
                  : "bg-primary hover:bg-primary-light active:scale-[0.98]"
              }`}
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin text-white"
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
            <button
              onClick={handleStartDiagnostic}
              className="cursor-pointer text-xs font-medium text-text-body underline-offset-2 hover:text-text-heading hover:underline"
            >
              Retake Diagnostic Quiz
            </button>
          </div>
        ) : (
          <button
            onClick={handleStartDiagnostic}
            className="cursor-pointer rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-primary-light active:scale-[0.98]"
          >
            New Quiz
          </button>
        )}
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div
        className="mt-6 flex rounded-lg border border-gray-200 bg-gray-50 p-1"
        role="tablist"
        aria-label="Dashboard views"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 cursor-pointer rounded-md px-4 py-2 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-white text-primary shadow-sm"
                  : "text-text-body hover:text-text-heading"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab panels ──────────────────────────────────────────── */}

      {/* 1. Mastery overview */}
      {activeTab === "mastery" && (
        <section
          id="panel-mastery"
          role="tabpanel"
          aria-labelledby="tab-mastery"
          className="mt-6"
        >
          <h2 className="text-lg font-semibold text-text-heading">
            Mastery by Subtopic
          </h2>
          <p className="mt-1 text-sm text-text-body">
            Overall accuracy across all quiz sessions.
          </p>

          <div className="mt-4 space-y-4">
            {masteryStats.map((s) => {
              const pct = s.percentage;
              let barColor = "bg-red-500";
              if (pct >= 80) barColor = "bg-green-500";
              else if (pct >= 50) barColor = "bg-yellow-500";

              return (
                <div key={s.subtopic}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-text-heading">
                      {s.subtopic}
                    </span>
                    <span className="text-text-body">
                      {s.correct}/{s.total}
                      <span className="ml-1.5 font-semibold text-text-heading">
                        {pct}%
                      </span>
                    </span>
                  </div>
                  <div className="relative mt-1.5 h-3 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 2. Gap breakdown grid */}
      {activeTab === "gaps" && (
        <section
          id="panel-gaps"
          role="tabpanel"
          aria-labelledby="tab-gaps"
          className="mt-6"
        >
          <h2 className="text-lg font-semibold text-text-heading">
            Error Pattern Breakdown
          </h2>
          <p className="mt-1 text-sm text-text-body">
            Which error types appear most often in each subtopic? Darker cells
            mean more frequent errors.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[500px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-text-body">
                    Subtopic
                  </th>
                  {ERROR_TYPES.map((et) => (
                    <th
                      key={et}
                      className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-text-body"
                    >
                      {ERROR_LABELS[et]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gapData.map((row) => (
                  <tr key={row.subtopic}>
                    <td className="sticky left-0 bg-white px-3 py-3 text-sm font-medium text-text-heading">
                      {row.subtopic}
                    </td>
                    {ERROR_TYPES.map((et) => {
                      const count = row[et];
                      return (
                        <td
                          key={et}
                          className={`px-3 py-3 text-center text-sm transition-colors ${gapCellStyle(count, maxGapCount)}`}
                        >
                          {count > 0 ? count : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-text-body">
            <span className="font-medium text-text-heading">Frequency:</span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-red-200" /> High
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-orange-100" /> Medium
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-yellow-50" /> Low
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-blue-50" /> Minimal
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-gray-50" /> None
            </span>
          </div>

          <details className="mt-5">
            <summary className="cursor-pointer text-sm font-medium text-primary hover:text-primary-light">
              What do these error types mean?
            </summary>
            <div className="mt-2 space-y-1.5 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-text-body">
              <p>
                <strong className="text-text-heading">Concept</strong> — The student
                doesn't grasp the underlying principle.
              </p>
              <p>
                <strong className="text-text-heading">Procedural</strong> — Correct
                idea but execution slip (arithmetic, sign, etc.).
              </p>
              <p>
                <strong className="text-text-heading">Method</strong> — Wrong
                approach or formula for the situation.
              </p>
              <p>
                <strong className="text-text-heading">Prerequisite</strong> —
                Missing foundational knowledge.
              </p>
              <p>
                <strong className="text-text-heading">Misread</strong> —
                Misunderstood what the question was asking.
              </p>
            </div>
          </details>
        </section>
      )}

      {/* 3. Trend view */}
      {activeTab === "trends" && (
        <section
          id="panel-trends"
          role="tabpanel"
          aria-labelledby="tab-trends"
          className="mt-6"
        >
          <h2 className="text-lg font-semibold text-text-heading">
            Progress Over Time
          </h2>
          <p className="mt-1 text-sm text-text-body">
            Mastery percentage per subtopic across your quiz sessions.
          </p>

          {sessionData.length < 2 ? (
            <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-sm text-text-body">
              Complete at least two quizzes to see a trend chart.
            </div>
          ) : (
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart
                  data={trendChartData}
                  margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#5A5A5A" }}
                    axisLine={{ stroke: "#d1d5db" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#5A5A5A" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      fontSize: 13,
                    }}
                    formatter={(value: unknown) => [`${value}%`]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  />
                  {subtopics.map((sub) => (
                    <Line
                      key={sub}
                      type="monotone"
                      dataKey={sub}
                      stroke={SUBTOPIC_COLORS[sub]}
                      strokeWidth={2}
                      dot={{ r: 4, strokeWidth: 1 }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <details className="mt-6">
            <summary className="cursor-pointer text-sm font-medium text-primary hover:text-primary-light">
              View detailed session data
            </summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-text-body">
                      Session
                    </th>
                    {subtopics.map((sub) => (
                      <th
                        key={sub}
                        className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-text-body"
                      >
                        {sub}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessionData.map((s) => (
                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-700">
                        {s.label}
                      </td>
                      {s.subtopicStats.map((st) => (
                        <td
                          key={st.subtopic}
                          className="px-3 py-2 text-center text-sm font-medium"
                        >
                          {st.total > 0 ? (
                            <span
                              className={
                                st.percentage >= 80
                                  ? "text-green-600"
                                  : st.percentage >= 50
                                    ? "text-yellow-600"
                                    : "text-red-600"
                              }
                            >
                              {st.percentage}%
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
      )}
    </div>
  );
}