import { supabaseAdmin } from "../../_lib/supabase";
import { jsonError, jsonOk, methodNotAllowed } from "../../_lib/response";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") return methodNotAllowed(req.method, ["GET"]);

  const { data, error } = await supabaseAdmin
    .from("quizzes")
    .select("id, title, difficulty, status, topics, total_word_count, completions, created_at, updated_at")
    .order("id", { ascending: false });

  if (error) return jsonError("Failed to fetch quizzes", 500, error);
  return jsonOk(data ?? []);
}
