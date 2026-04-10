import { supabaseAdmin } from "../../_lib/supabase";
import { jsonError, jsonOk, methodNotAllowed } from "../../_lib/response";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "DELETE") return methodNotAllowed(req.method, ["DELETE"]);

  const id = Number(new URL(req.url).pathname.split("/").pop());
  if (!id) return jsonError("Invalid message id", 400);

  const { error } = await supabaseAdmin.from("user_messages").delete().eq("id", id);
  if (error) return jsonError("Failed to delete message", 500, error);

  return jsonOk({ success: true });
}
