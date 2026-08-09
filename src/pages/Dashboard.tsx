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
  Inequalities: "#2E7D5A",
  "Word Problems": "#B34A48",
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
  if (intensity >= 0.75) return "bg-red-100 text-red-800 font-semibold";
  if (intensity >= 0.5) return "bg-orange-100 text-orange-700 font-medium";
  if (intensity >= 0.25) return "bg-yellow-50 text-yellow-700";
  return "bg-blue-50 text-blue-600";
}

/* ── Mastery bar ──────────────────────────────────────────────────── */

function MasteryBar({ label, correct, total, percentage }: SubtopicStat) {
  const barColor =
    percentage >= 80
      ? "bg-gradient-to-r from-accent to-accent"
      : percentage >= 50
        ? "bg-gradient-to-r from-primary to-primary-light"
        : "bg-gradient-to-r from-error to-error/80";

  const labelColor =
    percentage >= 80
      ? "text-accent"
      : percentage >= 50
        ? "text-primary"
        : "text-error";

  return (
    <div className="card-elevated p-4 transition-all duration-200 hover:shadow-card-hover">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-text-heading">{label}</span>
        <span className={`text-sm font-semibold ${labelColor}`}>
          {percentage}%
        </span>
      </div>
      <div className="progress-bar">
        <div
          className={`progress-bar-fill ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="mt-1.5 text-xs text-text-muted">
        {correct}/{total} correct
      </div>
    </div>
  );
}

/* ── Empty state illustration ─────────────────────────────────────── */

function EmptyStateIllustration() {
  return (
    <svg
      viewBox="0 0 160 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-24 w-auto"
      aria-hidden="true"
    >
      <rect x="20" y="20" width="120" height="80" rx="8" fill="#1B2A4A" opacity="0.06" />
      <rect x="35" y="35" width="90" height="4" rx="2" fill="#1B2A4A" opacity="0.1" />
      <rect x="35" y="48" width="60" height="4" rx="2" fill="#1B2A4A" opacity="0.07" />
      <rect x="35" y="61" width="75" height="4" rx="2" fill="#1B2A4A" opacity="0.07" />
      <rect x="35" y="74" width="45" height="4" rx="2" fill="#C9953E" opacity="0.15" />
      {/* Small chart icon */}
      <path d="M100 82 L108 68 L116 76 L124 62" stroke="#C9953E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" fill="none" />
      <circle cx="100" cy="82" r="2.5" fill="#C9953E" opacity="0.4" />
      <circle cx="108" cy="68" r="2.5" fill="#C9953E" opacity="0.4" />
      <circle cx="116" cy="76" r="2.5" fill="#C9953E" opacity="0.4" />
      <circle cx="124" cy="62" r="2.5" fill="#C9953E" opacity="0.4" />
    </svg>
  );
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
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: quizzes, error: quizError } = await supabase
          .from("quiz_results")
          .select("*")
          .eq("user_id", user.id)
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
  }, [user]);

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
        <EmptyStateIllustration />
        <h2 className="mt-5 text-xl font-semibold text-text-heading">
          No quiz history yet
        </h2>
        <p className="mt-2 max-w-sm text-sm text-text-body">
          Take your first diagnostic quiz to start tracking your progress across
          algebra subtopics.
        </p>
        <button
          onClick={() => navigate("/quiz")}
          className="btn btn-primary mt-6 px-6 py-3 text-sm"
        >
          Take Your First Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-heading">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-text-body">
            Track your progress across {quizResults.length} quiz
            {quizResults.length > 1 ? "zes" : ""}.
          </p>
        </div>
        {checking ? (
          <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200" />
        ) : hasDiagnostic ? (
          <div className="flex flex-col items-end gap-1.5">
            <button
              onClick={handleStartTargetedPractice}
              disabled={generating}
              className="btn btn-primary px-5 py-2.5 text-sm"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin text-white"
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
              onClick={handleStartDiagnostic}
              className="btn btn-ghost text-xs font-medium"
            >
              Retake Diagnostic Quiz
            </button>
          </div>
        ) : (
          <button
            onClick={handleStartDiagnostic}
            className="btn btn-primary px-5 py-2.5 text-sm"
          >
            New Quiz
          </button>
        )}
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div
        className="mt-6 flex rounded-xl bg-surface-muted p-1"
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
              className={`flex-1 cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
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
            Overall accuracy across all quiz sessions. Gold indicates strong mastery.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {masteryStats.map((s) => (
              <MasteryBar key={s.subtopic} {...s} />
            ))}
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
            <table className="card-elevated w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="sticky left-0 bg-white px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-body">
                    Subtopic
                  </th>
                  {ERROR_TYPES.map((et) => (
                    <th
                      key={et}
                      className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-body"
                    >
                      {ERROR_LABELS[et]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gapData.map((row, i) => (
                  <tr key={row.subtopic} className={i < gapData.length - 1 ? "border-b border-gray-50" : ""}>
                    <td className="sticky left-0 bg-white px-4 py-3.5 text-sm font-medium text-text-heading">
                      {row.subtopic}
                    </td>
                    {ERROR_TYPES.map((et) => {
                      const count = row[et];
                      return (
                        <td
                          key={et}
                          className={`px-4 py-3.5 text-center text-sm transition-colors ${gapCellStyle(count, maxGapCount)}`}
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
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-red-100" /> High
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-orange-100" /> Medium
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-yellow-50" /> Low
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-blue-50" /> Minimal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-gray-50" /> None
            </span>
          </div>

          <details className="mt-5">
            <summary className="cursor-pointer text-sm font-medium text-primary hover:text-primary-light">
              What do these error types mean?
            </summary>
            <div className="card-elevated mt-3 p-5 text-sm text-text-body">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <strong className="text-text-heading">Concept</strong> — The student
                  doesn't grasp the underlying principle.
                </div>
                <div>
                  <strong className="text-text-heading">Procedural</strong> — Correct
                  idea but execution slip (arithmetic, sign, etc.).
                </div>
                <div>
                  <strong className="text-text-heading">Method</strong> — Wrong
                  approach or formula for the situation.
                </div>
                <div>
                  <strong className="text-text-heading">Prerequisite</strong> —
                  Missing foundational knowledge.
                </div>
                <div>
                  <strong className="text-text-heading">Misread</strong> —
                  Misunderstood what the question was asking.
                </div>
              </div>
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
            <div className="card-elevated mt-6 p-8 text-center text-sm text-text-body">
              Complete at least two quizzes to see a trend chart.
            </div>
          ) : (
            <div className="card-elevated mt-4 p-4 sm:p-6">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart
                  data={trendChartData}
                  margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0efea" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#8A8A8A" }}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#8A8A8A" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid rgb(0 0 0 / 0.06)",
                      boxShadow: "0 4px 12px -2px rgb(0 0 0 / 0.08)",
                      fontSize: 13,
                      padding: "8px 12px",
                    }}
                    formatter={(value: unknown) => [`${value}%`]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                    iconType="circle"
                  />
                  {subtopics.map((sub) => (
                    <Line
                      key={sub}
                      type="monotone"
                      dataKey={sub}
                      stroke={SUBTOPIC_COLORS[sub]}
                      strokeWidth={2.5}
                      dot={{ r: 4, strokeWidth: 1, fill: "white" }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
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
              <table className="card-elevated w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-body">
                      Session
                    </th>
                    {subtopics.map((sub) => (
                      <th
                        key={sub}
                        className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-body"
                      >
                        {sub}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessionData.map((s, i) => (
                    <tr key={s.id} className={i < sessionData.length - 1 ? "border-b border-gray-50" : ""}>
                      <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                        {s.label}
                      </td>
                      {s.subtopicStats.map((st) => (
                        <td
                          key={st.subtopic}
                          className="px-4 py-3 text-center text-sm font-medium"
                        >
                          {st.total > 0 ? (
                            <span
                              className={
                                st.percentage >= 80
                                  ? "text-success"
                                  : st.percentage >= 50
                                    ? "text-accent"
                                    : "text-error"
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