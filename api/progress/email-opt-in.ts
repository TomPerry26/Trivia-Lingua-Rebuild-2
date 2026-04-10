import { supabaseAdmin } from "../_lib/supabase";
import { jsonError, jsonOk, methodNotAllowed } from "../_lib/response";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "PATCH") return methodNotAllowed(req.method, ["PATCH"]);

  const body = await req.json().catch(() => null) as { user_id?: string; email_opt_in?: boolean } | null;
  if (typeof body?.email_opt_in !== "boolean") {
    return jsonError("email_opt_in is required", 400);
  }

  if (!body.user_id) return jsonOk({ success: true });

  const { error } = await supabaseAdmin
    .from("user_progress")
    .upsert({ user_id: body.user_id, email_opt_in: body.email_opt_in }, { onConflict: "user_id" });

  if (error) return jsonError("Failed to update email opt-in", 500, error);
  return jsonOk({ success: true });
}
