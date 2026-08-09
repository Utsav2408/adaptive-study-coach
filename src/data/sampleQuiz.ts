export type QuestionType = "multiple-choice" | "short-answer";

export interface Question {
  id: string;
  type: QuestionType;
  questionText: string;
  subtopic: string;
  options?: string[];
  correctAnswer: string;
}

export const sampleQuestions: Question[] = [
  {
    id: "q1",
    type: "multiple-choice",
    questionText: "Solve for x: 2x + 5 = 13",
    subtopic: "Linear Equations",
    options: ["x = 3", "x = 4", "x = 5", "x = 6"],
    correctAnswer: "x = 4",
  },
  {
    id: "q2",
    type: "multiple-choice",
    questionText: "Solve for x: 3(x - 2) = 15",
    subtopic: "Linear Equations",
    options: ["x = 5", "x = 6", "x = 7", "x = 8"],
    correctAnswer: "x = 7",
  },
  {
    id: "q3",
    type: "multiple-choice",
    questionText: "Solve the quadratic: x² - 5x + 6 = 0",
    subtopic: "Quadratic Equations",
    options: ["x = 2, 3", "x = 1, 6", "x = -2, -3", "x = 5, 1"],
    correctAnswer: "x = 2, 3",
  },
  {
    id: "q4",
    type: "multiple-choice",
    questionText: "Solve for x: x² = 49",
    subtopic: "Quadratic Equations",
    options: ["x = 7", "x = -7", "x = ±7", "x = 49"],
    correctAnswer: "x = ±7",
  },
  {
    id: "q5",
    type: "multiple-choice",
    questionText: "Solve the inequality: 3x - 7 > 8",
    subtopic: "Inequalities",
    options: ["x > 5", "x > 3", "x < 5", "x > 15"],
    correctAnswer: "x > 5",
  },
  {
    id: "q6",
    type: "multiple-choice",
    questionText: "Solve: 2 ≤ 4x - 2 ≤ 10",
    subtopic: "Inequalities",
    options: ["1 ≤ x ≤ 3", "2 ≤ x ≤ 4", "0 ≤ x ≤ 2", "1 ≤ x ≤ 2.5"],
    correctAnswer: "1 ≤ x ≤ 3",
  },
  {
    id: "q7",
    type: "short-answer",
    questionText: "A number plus 8 equals 20. What is the number?",
    subtopic: "Word Problems",
    correctAnswer: "12",
  },
  {
    id: "q8",
    type: "short-answer",
    questionText: "The sum of two consecutive integers is 47. What are the integers? (Enter as 'x and y')",
    subtopic: "Word Problems",
    correctAnswer: "23 and 24",
  },
];

export const subtopics = [
  "Linear Equations",
  "Quadratic Equations",
  "Inequalities",
  "Word Problems",
] as const;

export const quizSubject = "Algebra Fundamentals";