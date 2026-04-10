import { supabaseAdmin } from "../_lib/supabase";
import { jsonError, jsonOk, methodNotAllowed } from "../_lib/response";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "PATCH") return methodNotAllowed(req.method, ["PATCH"]);

  const body = await req.json().catch(() => null) as { user_id?: string; daily_target?: number } | null;
  if (typeof body?.daily_target !== "number") {
    return jsonError("daily_target is required", 400);
  }

  if (!body.user_id) return jsonOk({ success: true });

  const { error } = await supabaseAdmin
    .from("user_progress")
    .upsert({ user_id: body.user_id, daily_target: body.daily_target }, { onConflict: "user_id" });

  if (error) return jsonError("Failed to update progress target", 500, error);
  return jsonOk({ success: true });
}
