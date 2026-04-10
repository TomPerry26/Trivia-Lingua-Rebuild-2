import { listAdminFeedback, listAdminMessages, listBlogPosts, listTopics } from "../src/server/queries.js";
import { jsonError, jsonOk, methodNotAllowed } from "../src/server/response.js";
import { supabaseAdmin, supabaseAnon } from "../src/server/supabase.js";

const getPath = (req: Request) => new URL(req.url).pathname.replace(/^\/api\/?/, "");

export default async function handler(req: Request): Promise<Response> {
  const path = getPath(req);

  if (path === "topics") {
    if (req.method !== "GET") return methodNotAllowed(req.method, ["GET"]);
    try {
      return jsonOk(await listTopics());
    } catch (error) {
      return jsonError("Failed to fetch topics", 500, error);
    }
  }

  if (path === "blog") {
    if (req.method !== "GET") return methodNotAllowed(req.method, ["GET"]);
    try {
      return jsonOk(await listBlogPosts());
    } catch (error) {
      return jsonError("Failed to fetch blog posts", 500, error);
    }
  }

  if (path === "home-data") {
    if (req.method !== "GET") return methodNotAllowed(req.method, ["GET"]);

    const [latestRes, rowsRes] = await Promise.all([
      supabaseAdmin
        .from("quizzes")
        .select("id, title, difficulty, status, topics, total_word_count, completions, created_at, updated_at")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(12),
      supabaseAdmin.from("home_rows").select("id, title, topic_tag").order("id", { ascending: true }),
    ]);

    if (latestRes.error) return jsonError("Failed to load latest quizzes", 500, latestRes.error);
    if (rowsRes.error) return jsonError("Failed to load home rows", 500, rowsRes.error);

    return jsonOk({
      latestQuizzes: latestRes.data ?? [],
      homeRows: (rowsRes.data ?? []).map((row: any) => ({ row, quizzes: [] })),
    });
  }

  if (path === "contact") {
    if (req.method !== "POST") return methodNotAllowed(req.method, ["POST"]);
    const body = (await req.json().catch(() => null)) as { subject?: string; message?: string } | null;
    if (!body?.subject || !body?.message) return jsonError("subject and message are required", 400);

    const { error } = await supabaseAdmin.from("user_messages").insert({ subject: body.subject, message: body.message });
    if (error) return jsonError("Failed to send contact message", 500, error);
    return jsonOk({ success: true }, 201);
  }

  if (path === "external-reading") {
    if (req.method !== "POST") return methodNotAllowed(req.method, ["POST"]);
    const body = (await req.json().catch(() => null)) as {
      user_id?: string;
      words_read?: number;
      source_type?: string;
      details?: string;
      reading_date?: string;
    } | null;

    if (!body?.words_read || !body?.source_type || !body?.reading_date) {
      return jsonError("words_read, source_type, and reading_date are required", 400);
    }

    if (!body.user_id) return jsonOk({ success: true }, 201);

    const { error } = await supabaseAdmin.from("external_reading_logs").insert(body);
    if (error) return jsonError("Failed to save external reading", 500, error);

    return jsonOk({ success: true }, 201);
  }

  if (path === "question-feedback") {
    if (req.method !== "POST") return methodNotAllowed(req.method, ["POST"]);
    const body = await req.json().catch(() => null);
    if (!body?.question_id || !body?.quiz_id || !body?.rating) {
      return jsonError("question_id, quiz_id, and rating are required", 400);
    }

    const { error } = await supabaseAdmin.from("question_feedback").insert(body);
    if (error) return jsonError("Failed to submit question feedback", 500, error);

    return jsonOk({ success: true }, 201);
  }

  if (path === "question-reports") {
    if (req.method !== "POST") return methodNotAllowed(req.method, ["POST"]);
    const body = await req.json().catch(() => null);
    if (!body?.question_id || !body?.quiz_id || !body?.issue_type) {
      return jsonError("question_id, quiz_id, and issue_type are required", 400);
    }

    const { error } = await supabaseAdmin.from("question_reports").insert(body);
    if (error) return jsonError("Failed to submit question report", 500, error);

    return jsonOk({ success: true }, 201);
  }

  if (path === "users/me") {
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

  if (path === "progress/email-opt-in") {
    if (req.method !== "PATCH") return methodNotAllowed(req.method, ["PATCH"]);

    const body = (await req.json().catch(() => null)) as { user_id?: string; email_opt_in?: boolean } | null;
    if (typeof body?.email_opt_in !== "boolean") return jsonError("email_opt_in is required", 400);
    if (!body.user_id) return jsonOk({ success: true });

    const { error } = await supabaseAdmin
      .from("user_progress")
      .upsert({ user_id: body.user_id, email_opt_in: body.email_opt_in }, { onConflict: "user_id" });

    if (error) return jsonError("Failed to update email opt-in", 500, error);
    return jsonOk({ success: true });
  }

  if (path === "progress/target") {
    if (req.method !== "PATCH") return methodNotAllowed(req.method, ["PATCH"]);

    const body = (await req.json().catch(() => null)) as { user_id?: string; daily_target?: number } | null;
    if (typeof body?.daily_target !== "number") return jsonError("daily_target is required", 400);
    if (!body.user_id) return jsonOk({ success: true });

    const { error } = await supabaseAdmin
      .from("user_progress")
      .upsert({ user_id: body.user_id, daily_target: body.daily_target }, { onConflict: "user_id" });

    if (error) return jsonError("Failed to update progress target", 500, error);
    return jsonOk({ success: true });
  }

  if (path === "admin/messages") {
    if (req.method !== "GET") return methodNotAllowed(req.method, ["GET"]);
    try {
      return jsonOk(await listAdminMessages());
    } catch (error) {
      return jsonError("Failed to fetch messages", 500, error);
    }
  }

  if (path.startsWith("admin/messages/")) {
    if (req.method !== "DELETE") return methodNotAllowed(req.method, ["DELETE"]);
    const id = Number(path.split("/").pop());
    if (!id) return jsonError("Invalid message id", 400);

    const { error } = await supabaseAdmin.from("user_messages").delete().eq("id", id);
    if (error) return jsonError("Failed to delete message", 500, error);

    return jsonOk({ success: true });
  }

  if (path === "admin/question-feedback") {
    if (req.method !== "GET") return methodNotAllowed(req.method, ["GET"]);
    try {
      return jsonOk(await listAdminFeedback());
    } catch (error) {
      return jsonError("Failed to fetch question feedback", 500, error);
    }
  }

  if (path.startsWith("admin/question-feedback/")) {
    if (req.method !== "DELETE") return methodNotAllowed(req.method, ["DELETE"]);
    const id = Number(path.split("/").pop());
    if (!id) return jsonError("Invalid feedback id", 400);

    const { error } = await supabaseAdmin.from("question_feedback").delete().eq("id", id);
    if (error) return jsonError("Failed to delete feedback", 500, error);

    return jsonOk({ success: true });
  }

  if (path.startsWith("admin/question-reports/")) {
    if (req.method !== "DELETE") return methodNotAllowed(req.method, ["DELETE"]);
    const id = Number(path.split("/").pop());
    if (!id) return jsonError("Invalid report id", 400);

    const { error } = await supabaseAdmin.from("question_reports").delete().eq("id", id);
    if (error) return jsonError("Failed to delete report", 500, error);

    return jsonOk({ success: true });
  }

  if (path === "admin/quizzes/all") {
    if (req.method !== "GET") return methodNotAllowed(req.method, ["GET"]);

    const { data, error } = await supabaseAdmin
      .from("quizzes")
      .select("id, title, difficulty, status, topics, total_word_count, completions, created_at, updated_at")
      .order("id", { ascending: false });

    if (error) return jsonError("Failed to fetch quizzes", 500, error);
    return jsonOk(data ?? []);
  }

  if (path === "admin/quizzes/bulk-export-all") {
    if (req.method !== "GET") return methodNotAllowed(req.method, ["GET"]);

    const { data, error } = await supabaseAdmin
      .from("questions")
      .select(
        "quiz_id, question_order, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, quizzes(title,difficulty,topics)",
      )
      .order("quiz_id", { ascending: true })
      .order("question_order", { ascending: true });

    if (error) return jsonError("Failed to export quizzes", 500, error);

    const rows = (data ?? []).map((item: any) => ({
      quiz_id: item.quiz_id,
      quiz_title: item.quizzes?.title ?? "",
      difficulty: item.quizzes?.difficulty ?? "",
      topics: Array.isArray(item.quizzes?.topics) ? item.quizzes.topics.join(",") : "",
      question_number: item.question_order,
      question_text: item.question_text,
      option_a: item.option_a,
      option_b: item.option_b,
      option_c: item.option_c,
      option_d: item.option_d,
      correct_answer: item.correct_answer,
      explanation: item.explanation,
    }));

    return jsonOk({ rows, total: rows.length });
  }

  if (path === "admin/quizzes/bulk-import") {
    if (req.method !== "POST") return methodNotAllowed(req.method, ["POST"]);

    return jsonOk(
      {
        created: 0,
        skipped: 0,
        errors: 1,
        details: ["Bulk import handler scaffolded. Implement CSV parse + insert logic in next step."],
      },
      501,
    );
  }

  return jsonError(`No API route found for /api/${path}`, 404);
}
