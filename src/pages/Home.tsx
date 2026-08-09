import { useNavigate } from "react-router-dom";
import { quizSubject } from "../data/sampleQuiz";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 pt-20 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
        Adaptive Study Coach
      </h1>
      <p className="mt-4 text-lg text-gray-600">
        Diagnose your understanding of algebra fundamentals with a short
        diagnostic quiz. See which subtopics you've mastered and which need
        more practice.
      </p>
      <button
        onClick={() => navigate("/quiz")}
        className="mt-10 cursor-pointer rounded-lg bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-150 ease-out hover:bg-indigo-700 active:scale-[0.97]"
      >
        Start {quizSubject}
      </button>
    </div>
  );
}