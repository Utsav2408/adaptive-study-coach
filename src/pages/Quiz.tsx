import { useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { sampleQuestions, quizSubject } from "../data/sampleQuiz";
import type { Question } from "../data/sampleQuiz";
import { supabase } from "../lib/supabaseClient";

type FeedbackState = "unanswered" | "correct" | "incorrect";

interface SavedAnswer {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
}

interface ErrorClassification {
  errorType: string | null;
  explanation: string | null;
}

const CLASSIFY_TIMEOUT_MS = 15_000;

async function classifyError(
  questionText: string,
  correctAnswer: string,
  userAnswer: string,
): Promise<ErrorClassification> {
  try {
    const result = await Promise.race([
      supabase.functions.invoke("classify-error", {
        body: { questionText, correctAnswer, userAnswer },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Classification timed out")),
          CLASSIFY_TIMEOUT_MS,
        ),
      ),
    ]);

    const { data, error } = result as { data?: { error_type?: string | null; explanation?: string | null }; error?: unknown };
    if (error) throw error;
    return {
      errorType: data?.error_type ?? null,
      explanation: data?.explanation ?? null,
    };
  } catch {
    return { errorType: null, explanation: null };
  }
}

interface QuizState {
  questions?: Question[];
  sessionType?: "diagnostic" | "practice";
}

/* ── Small progress indicator ─────────────────────────────────────── */

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i < current
              ? "w-4 bg-primary"
              : i === current
                ? "w-6 bg-accent"
                : "w-1.5 bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

export default function Quiz() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as QuizState | null;

  const sessionType: "diagnostic" | "practice" =
    state?.sessionType ?? "diagnostic";

  const questions: Question[] =
    state?.questions && state.questions.length > 0
      ? state.questions
      : sampleQuestions;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>("unanswered");
  const [savedAnswers, setSavedAnswers] = useState<SavedAnswer[]>([]);
  const [saving, setSaving] = useState(false);

  const currentQuestion: Question = questions[currentIndex];
  const totalQuestions = questions.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const isMultipleChoice = currentQuestion.type === "multiple-choice";
  const hasValidAnswer = isMultipleChoice
    ? selectedOption !== null
    : textAnswer.trim().length > 0;

  const handleSubmitAnswer = useCallback(() => {
    if (!hasValidAnswer || feedback !== "unanswered") return;

    const userAnswer = isMultipleChoice ? selectedOption! : textAnswer.trim();
    const isCorrect =
      userAnswer.toLowerCase().trim() ===
      currentQuestion.correctAnswer.toLowerCase().trim();

    setFeedback(isCorrect ? "correct" : "incorrect");
    setSavedAnswers((prev) => [
      ...prev,
      { questionId: currentQuestion.id, userAnswer, isCorrect },
    ]);
  }, [hasValidAnswer, feedback, isMultipleChoice, selectedOption, textAnswer, currentQuestion]);

  const handleNext = useCallback(() => {
    if (isLastQuestion) {
      handleFinishQuiz();
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setTextAnswer("");
      setFeedback("unanswered");
    }
  }, [isLastQuestion]);

  const handleFinishQuiz = async () => {
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    let correctCount = 0;
    const questionResults = questions.map((q) => {
      const saved = savedAnswers.find((s) => s.questionId === q.id);
      const isCorrect = saved?.isCorrect ?? false;
      if (isCorrect) correctCount++;
      return {
        questionText: q.questionText,
        subtopic: q.subtopic,
        userAnswer: saved?.userAnswer ?? "",
        correctAnswer: q.correctAnswer,
        isCorrect,
        errorType: null as string | null,
        explanation: null as string | null,
      };
    });

    const classificationPromises = questionResults.map(async (qr) => {
      if (qr.isCorrect) return qr;
      const result = await classifyError(qr.questionText, qr.correctAnswer, qr.userAnswer);
      qr.errorType = result.errorType;
      qr.explanation = result.explanation;
      return qr;
    });

    const classifiedResults = await Promise.all(classificationPromises);

    try {
      const { data: quizResult, error: quizError } = await supabase
        .from("quiz_results")
        .insert({
          subject: quizSubject,
          total_questions: totalQuestions,
          correct_answers: correctCount,
          user_id: userId,
          session_type: sessionType,
        })
        .select("id")
        .single();

      if (quizError) throw quizError;

      const { error: questionsError } = await supabase
        .from("question_results")
        .insert(
          classifiedResults.map((qr) => ({
            quiz_result_id: quizResult.id,
            question_text: qr.questionText,
            subtopic: qr.subtopic,
            user_answer: qr.userAnswer,
            correct_answer: qr.correctAnswer,
            is_correct: qr.isCorrect,
            error_type: qr.errorType,
            explanation: qr.explanation,
          })),
        );

      if (questionsError) throw questionsError;
    } catch (err) {
      console.error("Failed to save results:", err);
    }

    navigate("/results", {
      state: {
        totalQuestions,
        correctAnswers: correctCount,
        questionResults: classifiedResults,
      },
    });
  };

  const progressPercent = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8">
      {/* ── Progress section ──────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-body">
            Question <span className="font-medium text-text-heading">{currentIndex + 1}</span> of {totalQuestions}
          </span>
          <span className="text-text-muted">{Math.round(progressPercent)}%</span>
        </div>
        <div className="progress-bar mt-2">
          <div
            className="progress-bar-fill bg-gradient-to-r from-primary to-primary-light"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-3">
          <ProgressDots current={currentIndex} total={totalQuestions} />
        </div>
      </div>

      {/* ── Question card ─────────────────────────────────────────── */}
      <div className="card-elevated p-6 sm:p-8">
        {/* Subtopic badge */}
        <span className="tag tag-accent mb-4">
          {currentQuestion.subtopic}
        </span>

        {/* Question text */}
        <h2 className="text-xl font-semibold leading-relaxed text-text-heading sm:text-2xl">
          {currentQuestion.questionText}
        </h2>

        {/* Answer area */}
        <div className="mt-8">
          {isMultipleChoice ? (
            <div className="space-y-3">
              {currentQuestion.options!.map((option) => {
                const isSelected = selectedOption === option;
                const showCorrect =
                  feedback !== "unanswered" &&
                  option === currentQuestion.correctAnswer;
                const showWrong =
                  feedback !== "unanswered" &&
                  isSelected &&
                  option !== currentQuestion.correctAnswer;

                let containerClass = "border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50";
                let indicatorClass = "border-2 border-gray-300";
                let indicatorInner = null;
                let textClass = "text-text-body";

                if (showCorrect) {
                  containerClass = "border-success bg-success-light";
                  indicatorClass = "border-success bg-success text-white";
                  indicatorInner = (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  );
                  textClass = "text-success font-medium";
                } else if (showWrong) {
                  containerClass = "border-error bg-error-light";
                  indicatorClass = "border-error bg-error text-white";
                  indicatorInner = (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  );
                  textClass = "text-error font-medium";
                } else if (isSelected && feedback === "unanswered") {
                  containerClass = "border-primary bg-primary/5";
                  indicatorClass = "border-primary bg-primary text-white";
                  textClass = "text-primary font-medium";
                }

                return (
                  <button
                    key={option}
                    onClick={() => {
                      if (feedback === "unanswered") setSelectedOption(option);
                    }}
                    disabled={feedback !== "unanswered"}
                    className={`flex w-full cursor-pointer items-center rounded-xl px-4 py-3.5 text-left text-sm transition-all duration-150 ${containerClass}`}
                  >
                    <span
                      className={`mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-150 ${indicatorClass}`}
                    >
                      {indicatorInner}
                    </span>
                    <span className={textClass}>{option}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <label htmlFor="short-answer" className="sr-only">
                Your answer
              </label>
              <input
                id="short-answer"
                type="text"
                value={textAnswer}
                onChange={(e) => {
                  if (feedback === "unanswered") setTextAnswer(e.target.value);
                }}
                disabled={feedback !== "unanswered"}
                placeholder="Type your answer here…"
                className={`input-refined ${
                  feedback === "correct"
                    ? "border-success bg-success-light text-success"
                    : feedback === "incorrect"
                      ? "border-error bg-error-light text-error"
                      : ""
                }`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && hasValidAnswer && feedback === "unanswered") {
                    handleSubmitAnswer();
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Feedback message */}
        {feedback !== "unanswered" && (
          <div
            className={`mt-6 rounded-xl px-4 py-3 text-sm ${
              feedback === "correct"
                ? "bg-success-light text-success"
                : "bg-error-light text-error"
            }`}
          >
            {feedback === "correct" ? (
              <p>
                <span className="font-semibold">Correct!</span>{" "}
                {currentQuestion.correctAnswer}
              </p>
            ) : (
              <p>
                <span className="font-semibold">Not quite.</span> The correct answer is{" "}
                <span className="font-medium" style={{ color: "#2E7D5A" }}>
                  {currentQuestion.correctAnswer}
                </span>
                .
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-6 flex gap-3">
        {feedback === "unanswered" ? (
          <button
            onClick={handleSubmitAnswer}
            disabled={!hasValidAnswer}
            className={`btn flex-1 px-6 py-3 text-sm ${
              hasValidAnswer
                ? "btn-primary"
                : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none hover:bg-gray-100"
            }`}
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={saving}
            className={`btn btn-primary flex-1 px-6 py-3 text-sm`}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
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
                Reviewing your answers…
              </span>
            ) : isLastQuestion ? (
              "See Results"
            ) : (
              "Next Question"
            )}
          </button>
        )}
      </div>
    </div>
  );
}