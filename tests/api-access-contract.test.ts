import test from "node:test";
import assert from "node:assert/strict";
import { canFetchQuiz, getAccessRequired, getQuizVisibilityTier } from "../src/shared/quiz-access.ts";

test("guest can fetch guest-tier quizzes", () => {
  const quiz = { min_access_level: "guest" };
  assert.equal(getQuizVisibilityTier(quiz), "guest");
  assert.equal(getAccessRequired(quiz, false), null);
  assert.equal(canFetchQuiz(quiz, false), true);
});

test("guest cannot fetch member-tier quizzes", () => {
  const quiz = { min_access_level: "member" };
  assert.equal(getQuizVisibilityTier(quiz), "member");
  assert.equal(getAccessRequired(quiz, false), "member");
  assert.equal(canFetchQuiz(quiz, false), false);
});

test("authenticated users can fetch member-tier quizzes", () => {
  const quiz = { min_access_level: "member" };
  assert.equal(getAccessRequired(quiz, true), null);
  assert.equal(canFetchQuiz(quiz, true), true);
});

test("missing access tier defaults to guest", () => {
  const quiz = { min_access_level: null };
  assert.equal(getQuizVisibilityTier(quiz), "guest");
  assert.equal(getAccessRequired(quiz, false), null);
  assert.equal(canFetchQuiz(quiz, false), true);
});
