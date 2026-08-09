import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sampleQuestions, quizSubject } from "../data/sampleQuiz";
import { supabase } from "../lib/supabaseClient";

export default function Quiz() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const allAnswered = sampleQuestions.every((q) => answers[q.id]);

  const handleSelect = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleSubmit = async () => {
    if (!allAnswered || submitting) return;
    setSubmitting(true);

    // Calculate results
    let correctCount = 0;
    const questionResults = sampleQuestions.map((q) => {
      const isCorrect = answers[q.id] === q.correctAnswer;
      if (isCorrect) correctCount++;
      return {
        questionText: q.questionText,
        subtopic: q.subtopic,
        userAnswer: answers[q.id],
        correctAnswer: q.correctAnswer,
        isCorrect,
      };
    });

    // Persist to Supabase
    try {
      const { data: quizResult, error: quizError } = await supabase
        .from("quiz_results")
        .insert({
          subject: quizSubject,
          total_questions: sampleQuestions.length,
          correct_answers: correctCount,
        })
        .select("id")
        .single();

      if (quizError) throw quizError;

      const { error: questionsError } = await supabase
        .from("question_results")
        .insert(
          questionResults.map((qr) => ({
            quiz_result_id: quizResult.id,
            question_text: qr.questionText,
            subtopic: qr.subtopic,
            user_answer: qr.userAnswer,
            correct_answer: qr.correctAnswer,
            is_correct: qr.isCorrect,
          })),
        );

      if (questionsError) throw questionsError;
    } catch (err) {
      console.error("Failed to save results:", err);
      // Still navigate — local results are the primary display
    }

    navigate("/results", {
      state: {
        totalQuestions: sampleQuestions.length,
        correctAnswers: correctCount,
        questionResults,
      },
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">
        {quizSubject}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Answer all {sampleQuestions.length} questions, then submit.
      </p>

      <div className="mt-8 space-y-8">
        {sampleQuestions.map((q, index) => (
          <div key={q.id} className="rounded-lg border border-gray-200 p-5">
            <p className="text-sm font-medium text-indigo-600">
              Question {index + 1} · {q.subtopic}
            </p>
            <p className="mt-2 text-base font-medium text-gray-900">
              {q.questionText}
            </p>
            <div className="mt-3 space-y-2">
              {q.options.map((option) => {
                const selected = answers[q.id] === option;
                return (
                  <button
                    key={option}
                    onClick={() => handleSelect(q.id, option)}
                    className={`flex w-full cursor-pointer items-center rounded-md border px-4 py-2.5 text-left text-sm transition-all duration-150 ease-out active:scale-[0.98] ${
                      selected
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-medium"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className={`mr-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                        selected
                          ? "border-indigo-500 bg-indigo-500 text-white"
                          : "border-gray-300"
                      }`}
                    >
                      {selected ? "✓" : ""}
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!allAnswered || submitting}
        className={`mt-8 w-full cursor-pointer rounded-lg px-8 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-150 ease-out active:scale-[0.97] ${
          allAnswered && !submitting
            ? "bg-indigo-600 hover:bg-indigo-700"
            : "cursor-not-allowed bg-gray-300 text-gray-500"
        }`}
      >
        {submitting ? "Saving…" : "Submit Quiz"}
      </button>
    </div>
  );
}