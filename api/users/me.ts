import { supabaseAnon } from "../_lib/supabase";
import { jsonOk, methodNotAllowed } from "../_lib/response";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") return methodNotAllowed(req.method, ["GET"]);

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) return jsonOk({ access_level: null });

  const { data } = await supabaseAnon.auth.getUser(token);
  if (!data.user) return jsonOk({ access_level: null });

  return jsonOk({
    id: data.user.id,
    email: data.user.email,
    access_level: data.user.user_metadata?.access_level ?? null,
  });
}
