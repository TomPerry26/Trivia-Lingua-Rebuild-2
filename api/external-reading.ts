import { supabaseAdmin } from "./_lib/supabase";
import { jsonError, jsonOk, methodNotAllowed } from "./_lib/response";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return methodNotAllowed(req.method, ["POST"]);

  const body = await req.json().catch(() => null) as {
    user_id?: string;
    words_read?: number;
    source_type?: string;
    details?: string;
    reading_date?: string;
  } | null;

  if (!body?.words_read || !body?.source_type || !body?.reading_date) {
    return jsonError("words_read, source_type, and reading_date are required", 400);
  }

  if (!body.user_id) return jsonOk({ success: true }, 201);

  const { error } = await supabaseAdmin.from("external_reading_logs").insert(body);
  if (error) return jsonError("Failed to save external reading", 500, error);

  return jsonOk({ success: true }, 201);
}
