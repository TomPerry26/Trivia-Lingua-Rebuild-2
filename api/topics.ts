import { jsonError, jsonOk, methodNotAllowed } from "./_lib/response";
import { listTopics } from "../src/server/queries";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") return methodNotAllowed(req.method, ["GET"]);

  try {
    const topics = await listTopics();
    return jsonOk(topics);
  } catch (error) {
    return jsonError("Failed to fetch topics", 500, error);
  }
}
