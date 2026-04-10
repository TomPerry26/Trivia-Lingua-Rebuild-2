import { jsonError, jsonOk, methodNotAllowed } from "./_lib/response";
import { listBlogPosts } from "../src/server/queries";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") return methodNotAllowed(req.method, ["GET"]);

  try {
    const posts = await listBlogPosts();
    return jsonOk(posts);
  } catch (error) {
    return jsonError("Failed to fetch blog posts", 500, error);
  }
}
