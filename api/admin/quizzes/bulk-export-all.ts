import { supabaseAdmin } from "../../_lib/supabase";
import { jsonError, jsonOk, methodNotAllowed } from "../../_lib/response";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") return methodNotAllowed(req.method, ["GET"]);

  const { data, error } = await supabaseAdmin
    .from("questions")
    .select("quiz_id, question_order, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, quizzes(title,difficulty,topics)")
    .order("quiz_id", { ascending: true })
    .order("question_order", { ascending: true });

  if (error) return jsonError("Failed to export quizzes", 500, error);

  const rows = (data ?? []).map((item: any) => ({
    quiz_id: item.quiz_id,
    quiz_title: item.quizzes?.title ?? "",
    difficulty: item.quizzes?.difficulty ?? "",
    topics: Array.isArray(item.quizzes?.topics) ? item.quizzes.topics.join(",") : "",
    question_number: item.question_order,
    question_text: item.question_text,
    option_a: item.option_a,
    option_b: item.option_b,
    option_c: item.option_c,
    option_d: item.option_d,
    correct_answer: item.correct_answer,
    explanation: item.explanation,
  }));

  return jsonOk({ rows, total: rows.length });
}
