import { supabaseAdmin } from "./_lib/supabase";
import { jsonError, jsonOk, methodNotAllowed } from "./_lib/response";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return methodNotAllowed(req.method, ["POST"]);

  const body = await req.json().catch(() => null);
  if (!body?.question_id || !body?.quiz_id || !body?.rating) {
    return jsonError("question_id, quiz_id, and rating are required", 400);
  }

  const { error } = await supabaseAdmin.from("question_feedback").insert(body);
  if (error) return jsonError("Failed to submit question feedback", 500, error);

  return jsonOk({ success: true }, 201);
}
