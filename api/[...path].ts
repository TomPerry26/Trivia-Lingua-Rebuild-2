import { listAdminFeedback, listAdminMessages, listBlogPosts, listTopics } from "../src/server/queries.js";
import { jsonError, jsonOk, methodNotAllowed } from "../src/server/response.js";
import { supabaseAdmin, supabaseAnon } from "../src/server/supabase.js";
import { getDifficultyBySlug } from "../src/data/difficulties.js";

export const config = {
  runtime: "edge",
};

const getPath = (req: Request) => new URL(req.url, "http://localhost").pathname.replace(/^\/api\/?/, "");

const parseCsv = (value: string | null) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeSort = (sort: string | null): "latest" | "popular" | "a-z" => {
  if (sort === "popular" || sort === "a-z") return sort;
  return "latest";
};

const getAuthToken = (req: Request): string | null => {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return null;
};

type QuizBase = {
  id: number;
  title: string;
  difficulty: string | null;
  status: string | null;
  topic?: string | null;
  min_access_level?: string | null;
  created_at: string;
  updated_at: string;
};

const enrichQuizzes = async (quizzes: QuizBase[]) => {
  if (quizzes.length === 0) return [] as Array<QuizBase & { topics: string[]; total_word_count: number; completions: number }>;

  const quizIds = quizzes.map((quiz) => quiz.id);

  const [wordsRes, attemptsRes, quizTopicsRes, topicsRes] = await Promise.all([
    supabaseAdmin.from("questions").select("quiz_id, word_count").in("quiz_id", quizIds),
    supabaseAdmin.from("quiz_attempts").select("quiz_id").in("quiz_id", quizIds),
    supabaseAdmin.from("quiz_topics").select("quiz_id, topic_id").in("quiz_id", quizIds),
    supabaseAdmin.from("topics").select("id, name"),
  ]);

  const wordsByQuiz = new Map<number, number>();
  for (const row of wordsRes.error ? [] : (wordsRes.data ?? [])) {
    wordsByQuiz.set(row.quiz_id, (wordsByQuiz.get(row.quiz_id) ?? 0) + (row.word_count ?? 0));
  }

  const completionsByQuiz = new Map<number, number>();
  for (const row of attemptsRes.error ? [] : (attemptsRes.data ?? [])) {
    completionsByQuiz.set(row.quiz_id, (completionsByQuiz.get(row.quiz_id) ?? 0) + 1);
  }

  const topicNameById = new Map<number, string>();
  for (const topic of topicsRes.error ? [] : (topicsRes.data ?? [])) {
    topicNameById.set(topic.id, topic.name);
  }

  const topicsByQuiz = new Map<number, string[]>();
  for (const row of quizTopicsRes.error ? [] : (quizTopicsRes.data ?? [])) {
    const topicName = topicNameById.get(row.topic_id);
    if (!topicName) continue;
    const list = topicsByQuiz.get(row.quiz_id) ?? [];
    list.push(topicName);
    topicsByQuiz.set(row.quiz_id, list);
  }

  return quizzes.map((quiz) => ({
    ...quiz,
    topics: topicsByQuiz.get(quiz.id) ?? (quiz.topic ? [quiz.topic] : []),
    total_word_count: wordsByQuiz.get(quiz.id) ?? 0,
    completions: completionsByQuiz.get(quiz.id) ?? 0,
  }));
};

const fallbackDifficultyContent = (slug: string) => {
  const difficulty = getDifficultyBySlug(slug);
  if (!difficulty) return null;

  return {
    difficulty: difficulty.name,
    cefrLevel: difficulty.cefr,
    title: `${difficulty.name} Spanish Quizzes (${difficulty.cefr})`,
    description: `Build confidence at ${difficulty.cefr} with short Spanish reading quizzes designed for ${difficulty.name.toLowerCase()} learners.`,
    whatYoullLearn:
      "You will practice high-frequency vocabulary, sentence patterns, and reading strategies through short, focused quizzes.",
    whyThisLevel:
      `The ${difficulty.cefr} level balances challenge and confidence so you can grow your reading speed without feeling overwhelmed.`,
    howToProgress:
      "Complete quizzes consistently, review explanations, and gradually increase daily reading volume to move to the next level.",
    metaDescription: `Practice ${difficulty.name.toLowerCase()} Spanish reading with interactive ${difficulty.cefr} quizzes on Trivia Lingua.`,
  };
};

export default async function handler(req: Request): Promise<Response> {
  try {
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
    const HOME_ROW_QUIZ_LIMIT = 12;

    const [latestRes, rowsRes] = await Promise.all([
      supabaseAdmin
        .from("quizzes")
        .select("id, title, difficulty, status, topic, created_at, updated_at")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(12),
      supabaseAdmin.from("home_rows").select("id, title, topic_tag").order("id", { ascending: true }),
    ]);

    if (latestRes.error) return jsonError("Failed to load latest quizzes", 500, latestRes.error);
    if (rowsRes.error) return jsonError("Failed to load home rows", 500, rowsRes.error);

    const rows = rowsRes.data ?? [];
    const enrichedLatest = await enrichQuizzes((latestRes.data ?? []) as QuizBase[]);

    const homeRowQuizResults = await Promise.all(
      rows.map((row) => {
        return supabaseAdmin
          .from("quizzes")
          .select("id, title, difficulty, status, topic, created_at, updated_at")
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(100);
      }),
    );

    const homeRowError = homeRowQuizResults.find((result) => result.error);
    if (homeRowError?.error) return jsonError("Failed to load home row quizzes", 500, homeRowError.error);

    const enrichedRows = await Promise.all(
      homeRowQuizResults.map(async (result, index) => {
        const enriched = await enrichQuizzes((result.data ?? []) as QuizBase[]);
        const topicTag = rows[index]?.topic_tag;
        const filtered = topicTag ? enriched.filter((quiz) => quiz.topics.includes(topicTag)) : enriched;
        return filtered.slice(0, HOME_ROW_QUIZ_LIMIT);
      }),
    );

    return jsonOk({
      latestQuizzes: enrichedLatest,
      homeRows: rows.map((row, index) => ({ row, quizzes: enrichedRows[index] ?? [] })),
    });
  }

  if (path === "quizzes/paginated") {
    if (req.method !== "GET") return methodNotAllowed(req.method, ["GET"]);

    const url = new URL(req.url, "http://localhost");
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "24") || 24, 1), 100);
    const offset = Math.max(Number(url.searchParams.get("offset") ?? "0") || 0, 0);
    const difficultiesFilter = parseCsv(url.searchParams.get("difficulties"));
    const topicsFilter = parseCsv(url.searchParams.get("topics"));
    const sort = normalizeSort(url.searchParams.get("sort"));

    let dataQuery = supabaseAdmin
      .from("quizzes")
      .select("id, title, difficulty, status, topic, created_at, updated_at")
      .eq("status", "published");

    if (difficultiesFilter.length > 0) {
      dataQuery = dataQuery.in("difficulty", difficultiesFilter);
    }

    const { data, error } = await dataQuery.order("created_at", { ascending: false });

    if (error) return jsonError("Failed to fetch quizzes", 500, error);

    let enriched = await enrichQuizzes((data ?? []) as QuizBase[]);
    if (topicsFilter.length > 0) {
      enriched = enriched.filter((quiz) => quiz.topics.some((topic) => topicsFilter.includes(topic)));
    }

    if (sort === "popular") {
      enriched.sort((a, b) => (b.completions ?? 0) - (a.completions ?? 0));
    } else if (sort === "a-z") {
      enriched.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      enriched.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }

    const paginated = enriched.slice(offset, offset + limit);

    return jsonOk({
      quizzes: paginated,
      total: enriched.length,
      limit,
      offset,
    });
  }

  const quizByIdMatch = path.match(/^quizzes\/([^/]+)$/);
  if (quizByIdMatch) {
    if (req.method !== "GET") return methodNotAllowed(req.method, ["GET"]);

    const quizId = decodeURIComponent(quizByIdMatch[1]);

    const [quizRes, questionsRes] = await Promise.all([
      supabaseAdmin
        .from("quizzes")
        .select("id, title, topic, difficulty, status, created_at, updated_at")
        .eq("id", quizId)
        .single(),
      supabaseAdmin
        .from("questions")
        .select(
          "id, quiz_id, question_text, correct_answer, option_a, option_b, option_c, option_d, explanation, word_count, question_order, image_url, explanation_image_url",
        )
        .eq("quiz_id", quizId)
        .order("question_order", { ascending: true }),
    ]);

    if (quizRes.error) return jsonError("Failed to fetch quiz", 500, quizRes.error);
    if (!quizRes.data) return jsonError("Quiz not found", 404);
    if (questionsRes.error) return jsonError("Failed to fetch quiz questions", 500, questionsRes.error);
    const [enrichedQuiz] = await enrichQuizzes([quizRes.data as QuizBase]);

    return jsonOk({
      ...enrichedQuiz,
      topic: enrichedQuiz.topic ?? (Array.isArray(enrichedQuiz.topics) ? enrichedQuiz.topics[0] : ""),
      questions: questionsRes.data ?? [],
    });
  }

  const quizCompleteMatch = path.match(/^quizzes\/(\d+)\/complete$/);
  if (quizCompleteMatch) {
    if (req.method !== "POST") return methodNotAllowed(req.method, ["POST"]);

    const quizId = Number(quizCompleteMatch[1]);
    const body = (await req.json().catch(() => null)) as { score?: number; words_read?: number } | null;

    if (typeof body?.score !== "number" || typeof body?.words_read !== "number") {
      return jsonError("score and words_read are required", 400);
    }

    const token = getAuthToken(req);
    if (!token) return jsonError("Authentication required", 401);

    const userRes = await supabaseAnon.auth.getUser(token);
    const user = userRes.data.user;
    if (!user) return jsonError("Authentication required", 401, userRes.error);

    const today = new Date().toISOString().slice(0, 10);

    const [quizRes, nextQuizRes] = await Promise.all([
      supabaseAdmin.from("quizzes").select("id, difficulty").eq("id", quizId).single(),
      supabaseAdmin
        .from("quizzes")
        .select("id")
        .eq("status", "published")
        .gt("id", quizId)
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    if (quizRes.error || !quizRes.data) return jsonError("Quiz not found", 404, quizRes.error);

    const attemptPayload = {
      user_id: user.id,
      quiz_id: quizId,
      score: body.score,
      words_read: body.words_read,
      created_at: new Date().toISOString(),
    };

    const [attemptRes, completionRes, incrementCompletionRes] = await Promise.all([
      supabaseAdmin.from("quiz_attempts").insert(attemptPayload),
      supabaseAdmin
        .from("quiz_completions")
        .upsert({ user_id: user.id, quiz_id: quizId, completed_at: new Date().toISOString() }, { onConflict: "user_id,quiz_id" }),
      supabaseAdmin.rpc("increment_quiz_completions", { p_quiz_id: quizId }),
    ]);

    if (attemptRes.error) return jsonError("Failed to record quiz attempt", 500, attemptRes.error);
    if (completionRes.error) return jsonError("Failed to record quiz completion", 500, completionRes.error);
    if (incrementCompletionRes.error) {
      await supabaseAdmin.from("quizzes").update({ completions: 1 }).eq("id", quizId).is("completions", null);
      await supabaseAdmin.rpc("increment", { table_name: "quizzes", row_id: quizId, column_name: "completions", by_amount: 1 });
    }

    const progressRes = await supabaseAdmin
      .from("user_progress")
      .select("daily_words_read, total_words_read, current_streak, longest_streak, total_quizzes_completed, daily_target, last_activity_date")
      .eq("user_id", user.id)
      .maybeSingle();

    const prior = progressRes.data ?? {
      daily_words_read: 0,
      total_words_read: 0,
      current_streak: 0,
      longest_streak: 0,
      total_quizzes_completed: 0,
      daily_target: 1000,
      last_activity_date: null,
    };

    const wasToday = prior.last_activity_date === today;
    const wasYesterday =
      prior.last_activity_date === new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const dailyWordsRead = wasToday ? prior.daily_words_read + body.words_read : body.words_read;
    const totalWordsRead = (prior.total_words_read ?? 0) + body.words_read;
    const totalQuizzesCompleted = (prior.total_quizzes_completed ?? 0) + 1;
    const currentStreak = wasToday ? prior.current_streak : wasYesterday ? (prior.current_streak ?? 0) + 1 : 1;
    const longestStreak = Math.max(prior.longest_streak ?? 0, currentStreak);
    const dailyTarget = prior.daily_target ?? 1000;
    const goalReached = dailyWordsRead >= dailyTarget && (prior.daily_words_read ?? 0) < dailyTarget;

    const progressUpsert = await supabaseAdmin.from("user_progress").upsert(
      {
        user_id: user.id,
        daily_words_read: dailyWordsRead,
        total_words_read: totalWordsRead,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        total_quizzes_completed: totalQuizzesCompleted,
        daily_target: dailyTarget,
        last_activity_date: today,
      },
      { onConflict: "user_id" },
    );

    if (progressUpsert.error) return jsonError("Failed to update progress", 500, progressUpsert.error);

    return jsonOk({
      success: true,
      nextQuizId: nextQuizRes.data?.id ?? null,
      goalReached,
      dailyWordsRead,
      dailyTarget,
      currentStreak,
      levelReached: false,
      levelData: null,
    });
  }

  const quizCompleteGuestMatch = path.match(/^quizzes\/(\d+)\/complete-guest$/);
  if (quizCompleteGuestMatch) {
    if (req.method !== "POST") return methodNotAllowed(req.method, ["POST"]);

    const quizId = Number(quizCompleteGuestMatch[1]);
    const body = (await req.json().catch(() => null)) as {
      guest_session_id?: string;
      score?: number;
      words_read?: number;
    } | null;

    if (!body?.guest_session_id || typeof body.score !== "number" || typeof body.words_read !== "number") {
      return jsonError("guest_session_id, score, and words_read are required", 400);
    }

    const insertRes = await supabaseAdmin.from("guest_quiz_attempts").insert({
      quiz_id: quizId,
      guest_session_id: body.guest_session_id,
      score: body.score,
      words_read: body.words_read,
      created_at: new Date().toISOString(),
    });

    if (insertRes.error) {
      return jsonOk({ success: true, stored: false, message: "Guest completion accepted without persistence" });
    }

    return jsonOk({ success: true, stored: true });
  }

  const difficultyContentMatch = path.match(/^difficulty\/([^/]+)\/content$/);
  if (difficultyContentMatch) {
    if (req.method !== "GET") return methodNotAllowed(req.method, ["GET"]);

    const slug = decodeURIComponent(difficultyContentMatch[1]);

    const dbRes = await supabaseAdmin
      .from("difficulty_content")
      .select(
        "difficulty, cefr_level, title, description, what_youll_learn, why_this_level, how_to_progress, meta_description",
      )
      .eq("slug", slug)
      .maybeSingle();

    if (!dbRes.error && dbRes.data) {
      return jsonOk({
        difficulty: dbRes.data.difficulty,
        cefrLevel: dbRes.data.cefr_level,
        title: dbRes.data.title,
        description: dbRes.data.description,
        whatYoullLearn: dbRes.data.what_youll_learn,
        whyThisLevel: dbRes.data.why_this_level,
        howToProgress: dbRes.data.how_to_progress,
        metaDescription: dbRes.data.meta_description,
      });
    }

    const fallback = fallbackDifficultyContent(slug);
    if (!fallback) return jsonError("Difficulty not found", 404);

    return jsonOk(fallback);
  }

  const difficultyRelatedMatch = path.match(/^difficulty\/([^/]+)\/related$/);
  if (difficultyRelatedMatch) {
    if (req.method !== "GET") return methodNotAllowed(req.method, ["GET"]);

    const slug = decodeURIComponent(difficultyRelatedMatch[1]);
    const difficulty = getDifficultyBySlug(slug);
    if (!difficulty) return jsonOk([]);

    const dbRes = await supabaseAdmin
      .from("difficulty_related_topics")
      .select("topic_slug")
      .eq("difficulty_slug", slug)
      .order("sort_order", { ascending: true });

    if (!dbRes.error && dbRes.data && dbRes.data.length > 0) {
      return jsonOk(dbRes.data.map((row) => row.topic_slug).filter(Boolean));
    }

    const quizzesRes = await supabaseAdmin
      .from("quizzes")
      .select("id, title, difficulty, status, topic, created_at, updated_at")
      .eq("status", "published")
      .eq("difficulty", difficulty.name)
      .limit(100);

    if (quizzesRes.error) return jsonError("Failed to fetch related topics", 500, quizzesRes.error);
    const enrichedQuizzes = await enrichQuizzes((quizzesRes.data ?? []) as QuizBase[]);

    const topics = Array.from(
      new Set(
        enrichedQuizzes
          .flatMap((quiz) => (Array.isArray(quiz.topics) ? quiz.topics : []))
          .map((topic) => String(topic).trim().toLowerCase().replace(/\s+/g, "-"))
          .filter(Boolean),
      ),
    );

    return jsonOk(topics.slice(0, 8));
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

    const token = getAuthToken(req);
    if (!token) return jsonOk({ access_level: null });

    const { data } = await supabaseAnon.auth.getUser(token);
    if (!data.user) return jsonOk({ access_level: null });

    return jsonOk({
      id: data.user.id,
      email: data.user.email,
      access_level: data.user.user_metadata?.access_level ?? null,
    });
  }

  if (path === "progress") {
    if (req.method !== "GET") return methodNotAllowed(req.method, ["GET"]);

    const url = new URL(req.url, "http://localhost");
    const localDate = url.searchParams.get("local_date") ?? new Date().toISOString().slice(0, 10);
    const token = getAuthToken(req);
    if (!token) {
      return jsonOk({
        daily_words_read: 0,
        total_words_read: 0,
        current_streak: 0,
        longest_streak: 0,
        total_quizzes_completed: 0,
        daily_target: 1000,
        last_activity_date: null,
        quiz_words: 0,
        external_words: 0,
      });
    }

    const userRes = await supabaseAnon.auth.getUser(token);
    const user = userRes.data.user;
    if (!user) {
      return jsonOk({
        daily_words_read: 0,
        total_words_read: 0,
        current_streak: 0,
        longest_streak: 0,
        total_quizzes_completed: 0,
        daily_target: 1000,
        last_activity_date: null,
        quiz_words: 0,
        external_words: 0,
      });
    }

    const [progressRes, externalRes] = await Promise.all([
      supabaseAdmin
        .from("user_progress")
        .select("daily_words_read, total_words_read, current_streak, longest_streak, total_quizzes_completed, daily_target, last_activity_date")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("external_reading_logs")
        .select("words_read")
        .eq("user_id", user.id)
        .eq("reading_date", localDate),
    ]);

    if (progressRes.error) return jsonError("Failed to fetch user progress", 500, progressRes.error);
    if (externalRes.error) return jsonError("Failed to fetch external reading progress", 500, externalRes.error);

    const progress = progressRes.data ?? {
      daily_words_read: 0,
      total_words_read: 0,
      current_streak: 0,
      longest_streak: 0,
      total_quizzes_completed: 0,
      daily_target: 1000,
      last_activity_date: null,
    };
    const externalWords = (externalRes.data ?? []).reduce((sum, row) => sum + (row.words_read ?? 0), 0);

    return jsonOk({
      ...progress,
      quiz_words: progress.daily_words_read ?? 0,
      external_words: externalWords,
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
      .select("id, title, difficulty, status, topic, created_at, updated_at")
      .order("id", { ascending: false });

    if (error) return jsonError("Failed to fetch quizzes", 500, error);
    return jsonOk(await enrichQuizzes((data ?? []) as QuizBase[]));
  }

  if (path === "admin/quizzes/bulk-export-all") {
    if (req.method !== "GET") return methodNotAllowed(req.method, ["GET"]);

    const { data, error } = await supabaseAdmin
      .from("questions")
      .select("quiz_id, question_order, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, quizzes(title,difficulty)")
      .order("quiz_id", { ascending: true })
      .order("question_order", { ascending: true });

    if (error) return jsonError("Failed to export quizzes", 500, error);

    const quizIds = Array.from(new Set((data ?? []).map((item) => item.quiz_id).filter(Boolean)));
    const [quizTopicsRes, topicsRes] = await Promise.all([
      supabaseAdmin.from("quiz_topics").select("quiz_id, topic_id").in("quiz_id", quizIds),
      supabaseAdmin.from("topics").select("id, name"),
    ]);
    if (quizTopicsRes.error) return jsonError("Failed to fetch quiz topics", 500, quizTopicsRes.error);
    if (topicsRes.error) return jsonError("Failed to fetch topics", 500, topicsRes.error);

    const topicNameById = new Map<number, string>((topicsRes.data ?? []).map((topic) => [topic.id, topic.name]));
    const topicsByQuiz = new Map<number, string[]>();
    for (const row of quizTopicsRes.data ?? []) {
      const topicName = topicNameById.get(row.topic_id);
      if (!topicName) continue;
      const list = topicsByQuiz.get(row.quiz_id) ?? [];
      list.push(topicName);
      topicsByQuiz.set(row.quiz_id, list);
    }

    const rows = (data ?? []).map((item) => ({
      quiz_id: item.quiz_id,
      quiz_title: item.quizzes?.title ?? "",
      difficulty: item.quizzes?.difficulty ?? "",
      topics: (topicsByQuiz.get(item.quiz_id) ?? []).join(","),
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
  } catch (error) {
    const details =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error;
    return jsonError("Unhandled API route error", 500, details);
  }
}
