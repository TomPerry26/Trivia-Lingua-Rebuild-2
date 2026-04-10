import { supabaseAdmin } from "./_lib/supabase";
import { jsonError, jsonOk, methodNotAllowed } from "./_lib/response";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return methodNotAllowed(req.method, ["POST"]);

  const body = await req.json().catch(() => null) as { subject?: string; message?: string } | null;
  if (!body?.subject || !body?.message) return jsonError("subject and message are required", 400);

  const { error } = await supabaseAdmin.from("user_messages").insert({
    subject: body.subject,
    message: body.message,
  });

  if (error) return jsonError("Failed to send contact message", 500, error);
  return jsonOk({ success: true }, 201);
}
