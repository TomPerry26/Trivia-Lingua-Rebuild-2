import type { AccessLevel } from "./access-levels.js";

export interface QuizAccessShape {
  min_access_level?: string | null;
}

export function getQuizVisibilityTier(quiz: QuizAccessShape): AccessLevel {
  const level = quiz.min_access_level;
  if (level === "member" || level === "premium" || level === "beta" || level === "guest") {
    return level;
  }
  return "guest";
}

export function getAccessRequired(
  quiz: QuizAccessShape,
  isAuthenticated: boolean,
): AccessLevel | null {
  const visibilityTier = getQuizVisibilityTier(quiz);
  if (isAuthenticated || visibilityTier === "guest") return null;
  return visibilityTier;
}

export function canFetchQuiz(
  quiz: QuizAccessShape,
  isAuthenticated: boolean,
): boolean {
  return getAccessRequired(quiz, isAuthenticated) === null;
}
