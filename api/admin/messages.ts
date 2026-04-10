import { jsonError, jsonOk, methodNotAllowed } from "../_lib/response";
import { listAdminMessages } from "../../src/server/queries";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") return methodNotAllowed(req.method, ["GET"]);

  try {
    return jsonOk(await listAdminMessages());
  } catch (error) {
    return jsonError("Failed to fetch messages", 500, error);
  }
}
