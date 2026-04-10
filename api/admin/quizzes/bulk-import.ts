import { jsonError, jsonOk, methodNotAllowed } from "../../_lib/response";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return methodNotAllowed(req.method, ["POST"]);

  return jsonOk({
    created: 0,
    skipped: 0,
    errors: 1,
    details: ["Bulk import handler scaffolded. Implement CSV parse + insert logic in next step."],
  }, 501);
}
