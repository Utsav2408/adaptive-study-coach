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

async function classifyError(
  questionText: string,
  correctAnswer: string,
  userAnswer: string,
): Promise<ErrorClassification> {
  try {
    const { data, error } = await supabase.functions.invoke("classify-error", {
      body: { questionText, correctAnswer, userAnswer },
    });
    if (error) throw error;
    return {
      errorType: data.error_type ?? null,
      explanation: data.explanation ?? null,
    };
  } catch {
    return { errorType: null, explanation: null };
  }
}

interface QuizState {
  questions?: Question[];
}

export default function Quiz() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as QuizState | null;

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

    // Get current user
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

  const progressPercent = (currentIndex / totalQuestions) * 100;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-text-body">
          <span>
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <span>{Math.round(progressPercent)}% complete</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-primary transition-all duration-400 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* Subtopic badge */}
        <span className="inline-block rounded-full bg-accent-light/30 px-3 py-1 text-xs font-medium text-accent">
          {currentQuestion.subtopic}
        </span>

        {/* Question text */}
        <h2 className="mt-4 text-lg font-semibold leading-relaxed text-text-heading">
          {currentQuestion.questionText}
        </h2>

        {/* Answer area */}
        <div className="mt-6">
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

                let borderClass = "border-gray-200 hover:border-gray-300 hover:bg-gray-50";
                let bgClass = "bg-white";
                let circleClass = "border-gray-300";
                let textClass = "text-gray-700";

                if (showCorrect) {
                  borderClass = "border-green-400";
                  bgClass = "bg-green-50";
                  circleClass = "border-green-500 bg-green-500 text-white";
                  textClass = "text-green-800";
                } else if (showWrong) {
                  borderClass = "border-red-400";
                  bgClass = "bg-red-50";
                  circleClass = "border-red-500 bg-red-500 text-white";
                  textClass = "text-red-800";
                } else if (isSelected && feedback === "unanswered") {
                  borderClass = "border-primary";
                  bgClass = "bg-primary/5";
                  circleClass = "border-primary bg-primary text-white";
                  textClass = "text-primary font-medium";
                }

                return (
                  <button
                    key={option}
                    onClick={() => {
                      if (feedback === "unanswered") setSelectedOption(option);
                    }}
                    disabled={feedback !== "unanswered"}
                    className={`flex w-full cursor-pointer items-center rounded-lg border px-4 py-3 text-left text-sm transition-all duration-150 ${borderClass} ${bgClass}`}
                  >
                    <span
                      className={`mr-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${circleClass}`}
                    >
                      {showCorrect || showWrong ? "✓" : isSelected && feedback === "unanswered" ? "✓" : ""}
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
                className={`w-full rounded-lg border px-4 py-3 text-sm text-text-heading outline-none transition-all duration-150 ${
                  feedback === "unanswered"
                    ? "border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    : feedback === "correct"
                      ? "border-green-400 bg-green-50"
                      : "border-red-400 bg-red-50"
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
            className={`mt-4 rounded-lg p-3 text-sm ${
              feedback === "correct"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
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
                <span className="font-medium text-green-600">
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
            className={`flex-1 cursor-pointer rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 ${
              hasValidAnswer
                ? "bg-primary hover:bg-primary-light"
                : "cursor-not-allowed bg-gray-300 text-gray-500"
            }`}
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={saving}
            className={`flex-1 cursor-pointer rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 ${
              saving
                ? "cursor-not-allowed bg-gray-300 text-gray-500"
                : "bg-primary hover:bg-primary-light"
            }`}
          >
            {saving
              ? "Saving…"
              : isLastQuestion
                ? "See Results"
                : "Next Question"}
          </button>
        )}
      </div>
    </div>
  );
}