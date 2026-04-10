import { supabaseAdmin } from "./_lib/supabase";
import { jsonError, jsonOk, methodNotAllowed } from "./_lib/response";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") return methodNotAllowed(req.method, ["GET"]);

  const [latestRes, rowsRes] = await Promise.all([
    supabaseAdmin
      .from("quizzes")
      .select("id, title, difficulty, status, topics, total_word_count, completions, created_at, updated_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(12),
    supabaseAdmin
      .from("home_rows")
      .select("id, title, topic_tag")
      .order("id", { ascending: true })
  ]);

  if (latestRes.error) return jsonError("Failed to load latest quizzes", 500, latestRes.error);
  if (rowsRes.error) return jsonError("Failed to load home rows", 500, rowsRes.error);

  return jsonOk({
    latestQuizzes: latestRes.data ?? [],
    homeRows: (rowsRes.data ?? []).map((row: any) => ({ row, quizzes: [] })),
  });
}
