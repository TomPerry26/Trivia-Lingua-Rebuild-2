export function jsonOk(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function jsonError(error: string, status = 500, details?: unknown): Response {
  return Response.json({ error, details }, { status });
}

export function methodNotAllowed(method: string, allowed: string[]): Response {
  return jsonError(`Method ${method} not allowed`, 405, { allowed });
}
