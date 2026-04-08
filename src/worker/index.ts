import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import {
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  authMiddleware,
  deleteSession,
  getCurrentUser,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";
import { getCookie, setCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import Papa from "papaparse";
import { generateSitemap, generateBlogSitemap } from "./sitemap";
import { hasAccess, type AccessLevel } from "../shared/access-levels";
import { generateSlug } from "../shared/slug-utils";

const app = new Hono<{ Bindings: Env }>();

// Admin middleware - checks if authenticated user is in admins table
const adminMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);
  
  // Allow preview sessions (development)
  if (sessionToken && sessionToken.startsWith("preview_session_")) {
    return next();
  }
  
  // Get authenticated user
  const user = c.get("user") as { id: string; email: string } | undefined;
  if (!user || !user.email) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  // Check if user's email is in admins table
  const admin = await c.env.DB.prepare(
    "SELECT id FROM admins WHERE email = ?"
  ).bind(user.email).first();
  
  if (!admin) {
    return c.json({ error: "Admin access required" }, 403);
  }
  
  return next();
});

// Preview-only endpoint for skipping login in sandbox
app.post("/api/preview/login", async (c) => {
  // Only allow in development/preview environment
  const host = c.req.header("host") || "";
  const isPreview = host.includes("localhost") || host.includes("127.0.0.1");
  
  if (!isPreview) {
    return c.json({ error: "Not available in production" }, 403);
  }
  
  try {
    // Get the first admin user
    const admin = await c.env.DB.prepare(
      "SELECT * FROM admins LIMIT 1"
    ).first();
    
    if (!admin) {
      return c.json({ error: "No admin user found" }, 404);
    }
    
    // Create or get user in Mocha's user service
    // For preview mode, we'll create a mock session token
    const mockSessionToken = `preview_session_${Date.now()}_${admin.email}`;
    
    setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, mockSessionToken, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: false,
      maxAge: 60 * 60, // 1 hour for preview
    });
    
    return c.json({ 
      success: true,
      email: admin.email 
    });
  } catch (error) {
    console.error("Error in preview login:", error);
    return c.json({ error: "Failed to create preview session" }, 500);
  }
});

// Auth routes
app.get("/api/oauth/google/redirect_url", async (c) => {
  try {
    const redirectUrl = await getOAuthRedirectUrl("google", {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });

    return c.json({ redirectUrl }, 200);
  } catch (error) {
    console.error("Error getting OAuth redirect URL:", error);
    return c.json({ error: "Failed to get redirect URL" }, 500);
  }
});

app.post("/api/sessions", async (c) => {
  try {
    const body = await c.req.json();

    if (!body.code) {
      return c.json({ error: "No authorization code provided" }, 400);
    }

    const sessionToken = await exchangeCodeForSessionToken(body.code, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });

    // Get the host to determine cookie domain
    const host = c.req.header("host") || "";
    const cookieOptions: any = {
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: true,
      maxAge: 60 * 24 * 60 * 60, // 60 days
    };

    // Set domain for custom domains (not localhost or mocha.app)
    if (host && !host.includes("localhost") && !host.includes("127.0.0.1") && !host.includes("mocha.app")) {
      // Extract apex domain (e.g., trivialingua.com from www.trivialingua.com)
      const parts = host.split(".");
      if (parts.length >= 2) {
        // Use the last two parts (domain.tld) with a leading dot to include all subdomains
        const apexDomain = `.${parts.slice(-2).join(".")}`;
        cookieOptions.domain = apexDomain;
      }
    }

    setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, cookieOptions);

    return c.json({ success: true }, 200);
  } catch (error) {
    console.error("Error exchanging code for session token:", error);
    return c.json({ 
      error: error instanceof Error ? error.message : "Failed to exchange code for session token" 
    }, 400);
  }
});

app.get("/api/users/me", async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);
  
  // Check if it's a preview session
  if (sessionToken && sessionToken.startsWith("preview_session_")) {
    const admin = await c.env.DB.prepare(
      "SELECT * FROM admins LIMIT 1"
    ).first();
    
    if (admin) {
      return c.json({
        id: `preview_${admin.id}`,
        email: admin.email,
        created_at: new Date().toISOString(),
        access_level: 'beta' as AccessLevel, // Admin/preview users get full access
      });
    }
  }
  
  // Try to get authenticated user using getCurrentUser (works with session tokens)
  let user;
  try {
    user = await getCurrentUser(sessionToken || "", {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  } catch (error) {
    // Not authenticated
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  // Check if user is an admin by email
  const admin = await c.env.DB.prepare(
    "SELECT id FROM admins WHERE email = ?"
  ).bind(user.email).first();
  
  if (admin) {
    return c.json({
      ...user,
      access_level: 'beta' as AccessLevel,
    });
  }
  
  // Get user's access level from user_progress
  const progress = await c.env.DB.prepare(
    "SELECT access_level FROM user_progress WHERE user_id = ?"
  ).bind(user.id).first();
  
  return c.json({
    ...user,
    access_level: (progress?.access_level as AccessLevel) || 'member',
  });
});

app.get("/api/logout", async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === "string") {
    try {
      await deleteSession(sessionToken, {
        apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
        apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
      });
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  }

  // Get the host to determine cookie domain
  const host = c.req.header("host") || "";
  const cookieOptions: any = {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 0,
  };

  // Set domain for custom domains (not localhost or mocha.app)
  if (host && !host.includes("localhost") && !host.includes("127.0.0.1") && !host.includes("mocha.app")) {
    // Extract apex domain (e.g., trivialingua.com from www.trivialingua.com)
    const parts = host.split(".");
    if (parts.length >= 2) {
      // Use the last two parts (domain.tld) with a leading dot to include all subdomains
      const apexDomain = `.${parts.slice(-2).join(".")}`;
      cookieOptions.domain = apexDomain;
    }
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, "", cookieOptions);

  return c.json({ success: true }, 200);
});

// Progress routes
// Optimized progress page endpoint - combines all progress data in one request
app.get("/api/progress-data", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const year = c.req.query("year");
  const month = c.req.query("month");
  const localDate = c.req.query("local_date");
  const today = localDate || new Date().toISOString().split('T')[0];

  // Get user progress
  const progress = await c.env.DB.prepare(
    "SELECT * FROM user_progress WHERE user_id = ?"
  ).bind(user.id).first();

  if (!progress) {
    // Create initial progress
    await c.env.DB.prepare(
      "INSERT INTO user_progress (user_id, daily_words_read, total_words_read, current_streak, longest_streak, total_quizzes_completed, daily_target) VALUES (?, 0, 0, 0, 0, 0, 1000)"
    ).bind(user.id).run();
  }

  // Get today's quiz words
  const quizWordsResult = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(words_read), 0) as total
     FROM quiz_attempts
     WHERE user_id = ? AND DATE(created_at) = ?`
  ).bind(user.id, today).first();

  // Get today's external words
  const externalWordsResult = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(words_read), 0) as total
     FROM external_reading
     WHERE user_id = ? AND reading_date = ?`
  ).bind(user.id, today).first();

  // Get recent quiz attempts (last 10)
  const { results: recentAttempts } = await c.env.DB.prepare(
    `SELECT qa.id, q.title as quiz_title, qa.score, qa.words_read, qa.created_at 
     FROM quiz_attempts qa 
     JOIN quizzes q ON qa.quiz_id = q.id 
     WHERE qa.user_id = ? 
     ORDER BY qa.created_at DESC
     LIMIT 10`
  ).bind(user.id).all();

  // Get daily activity for the specified month (or current month if not specified)
  let dailyActivity: Array<{ date: string; total_words: number }> = [];
  let dailyTarget = (progress?.daily_target as number) || 1000;
  let currentStreak = (progress?.current_streak as number) || 0;
  let lastActivityDate = (progress?.last_activity_date as string) || null;

  if (year && month) {
    // Get quiz attempts for the month
    const { results: quizResults } = await c.env.DB.prepare(
      `SELECT DATE(created_at) as date, SUM(words_read) as total_words
       FROM quiz_attempts
       WHERE user_id = ? 
       AND strftime('%Y', created_at) = ?
       AND strftime('%m', created_at) = ?
       GROUP BY DATE(created_at)`
    ).bind(user.id, year, month).all();

    // Get external reading for the month
    const { results: externalResults } = await c.env.DB.prepare(
      `SELECT reading_date as date, SUM(words_read) as total_words
       FROM external_reading
       WHERE user_id = ? 
       AND strftime('%Y', reading_date) = ?
       AND strftime('%m', reading_date) = ?
       GROUP BY reading_date`
    ).bind(user.id, year, month).all();

    // Combine quiz and external reading
    const activityMap = new Map<string, number>();
    
    quizResults.forEach((result: any) => {
      activityMap.set(result.date, (activityMap.get(result.date) || 0) + (result.total_words || 0));
    });
    
    externalResults.forEach((result: any) => {
      activityMap.set(result.date, (activityMap.get(result.date) || 0) + (result.total_words || 0));
    });
    
    dailyActivity = Array.from(activityMap.entries())
      .map(([date, total_words]) => ({ date, total_words }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  const progressData = progress || {
    daily_words_read: 0,
    total_words_read: 0,
    current_streak: 0,
    longest_streak: 0,
    total_quizzes_completed: 0,
    daily_target: 1000,
  };

  return c.json({
    progress: {
      ...progressData,
      quiz_words: quizWordsResult?.total || 0,
      external_words: externalWordsResult?.total || 0,
    },
    recentAttempts,
    dailyActivity,
    dailyTarget,
    currentStreak,
    lastActivityDate,
  });
});

app.get("/api/progress", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const progress = await c.env.DB.prepare(
    "SELECT * FROM user_progress WHERE user_id = ?"
  ).bind(user.id).first();

  if (!progress) {
    // Create initial progress
    await c.env.DB.prepare(
      "INSERT INTO user_progress (user_id, daily_words_read, total_words_read, current_streak, longest_streak, total_quizzes_completed, daily_target) VALUES (?, 0, 0, 0, 0, 0, 1000)"
    ).bind(user.id).run();

    return c.json({
      daily_words_read: 0,
      total_words_read: 0,
      current_streak: 0,
      longest_streak: 0,
      total_quizzes_completed: 0,
      daily_target: 1000,
      quiz_words: 0,
      external_words: 0,
    });
  }

  // Get user's local date from query parameter (YYYY-MM-DD format)
  const localDate = c.req.query("local_date");
  const today = localDate || new Date().toISOString().split('T')[0];
  
  const quizWordsResult = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(words_read), 0) as total
     FROM quiz_attempts
     WHERE user_id = ? AND DATE(created_at) = ?`
  ).bind(user.id, today).first();
  
  // Get today's external words
  const externalWordsResult = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(words_read), 0) as total
     FROM external_reading
     WHERE user_id = ? AND reading_date = ?`
  ).bind(user.id, today).first();

  // Calculate actual daily words read for today (not the cached value from user_progress)
  const actualDailyWords = ((quizWordsResult?.total as number) || 0) + ((externalWordsResult?.total as number) || 0);

  return c.json({
    ...progress,
    daily_words_read: actualDailyWords,
    quiz_words: quizWordsResult?.total || 0,
    external_words: externalWordsResult?.total || 0,
  });
});

app.patch(
  "/api/progress/target",
  authMiddleware,
  zValidator("json", z.object({ daily_target: z.number().min(100).max(10000) })),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const { daily_target } = c.req.valid("json");

    await c.env.DB.prepare(
      "UPDATE user_progress SET daily_target = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
    ).bind(daily_target, user.id).run();

    return c.json({ success: true });
  }
);

app.patch(
  "/api/progress/email-opt-in",
  authMiddleware,
  zValidator("json", z.object({ email_opt_in: z.boolean() })),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const { email_opt_in } = c.req.valid("json");

    await c.env.DB.prepare(
      "UPDATE user_progress SET email_opt_in = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
    ).bind(email_opt_in ? 1 : 0, user.id).run();

    return c.json({ success: true });
  }
);

// Quiz routes - paginated with filters for Quizzes page
app.get("/api/quizzes/paginated", async (c) => {
  // Optional auth - check for preview session, otherwise treat as guest
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);
  let user = null;
  
  if (sessionToken?.startsWith("preview_session_")) {
    const admin = await c.env.DB.prepare("SELECT * FROM admins LIMIT 1").first();
    if (admin) {
      user = {
        id: `preview_${admin.id}`,
        email: admin.email,
        created_at: new Date().toISOString(),
      };
    }
  } else if (sessionToken) {
    // Try to validate real session token using the SDK
    try {
      user = await getCurrentUser(sessionToken, {
        apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
        apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
      });
    } catch (error) {
      // Silently fail - treat as guest
      console.error("Error validating session:", error);
    }
  }
  
  // Pagination parameters
  const limit = parseInt(c.req.query("limit") || "24");
  const offset = parseInt(c.req.query("offset") || "0");
  
  // Filter parameters
  const difficulties = c.req.query("difficulties")?.split(",").filter(d => d) || [];
  const topics = c.req.query("topics")?.split(",").filter(t => t) || [];
  const sortBy = c.req.query("sort") || "latest";
  
  // Build WHERE conditions
  let whereConditions: string[] = ["q.status = 'published'"];
  let queryParams: any[] = [];
  
  // Difficulty filter
  if (difficulties.length > 0) {
    whereConditions.push(`q.difficulty IN (${difficulties.map(() => '?').join(',')})`);
    queryParams.push(...difficulties);
  }
  
  // Topic filter - uses quiz_topics table
  if (topics.length > 0) {
    whereConditions.push(`q.id IN (
      SELECT qt.quiz_id FROM quiz_topics qt
      JOIN topics t ON qt.topic_id = t.id
      WHERE t.name IN (${topics.map(() => '?').join(',')})
    )`);
    queryParams.push(...topics);
  }
  
  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
  
  // Determine sort order
  let orderByClause = 'ORDER BY q.id DESC'; // latest by default
  if (sortBy === 'popular') {
    orderByClause = 'ORDER BY completion_count DESC, q.id DESC';
  } else if (sortBy === 'a-z') {
    orderByClause = 'ORDER BY q.title ASC';
  }
  
  // Get total count for this filter
  const countQuery = `
    SELECT COUNT(DISTINCT q.id) as total
    FROM quizzes q
    ${whereClause}
  `;
  const countResult = await c.env.DB.prepare(countQuery).bind(...queryParams).first();
  const totalCount = (countResult?.total as number) || 0;
  
  // Main query with joins for completions
  const mainQuery = `
    SELECT 
      q.id,
      q.quiz_id,
      q.title,
      q.topic,
      q.difficulty,
      q.status,
      q.created_at,
      q.updated_at,
      q.min_access_level,
      q.url_slug,
      COALESCE(SUM(qu.word_count), 0) as total_word_count,
      COALESCE(cc.count, 0) as completion_count
    FROM quizzes q
    LEFT JOIN questions qu ON q.id = qu.quiz_id
    LEFT JOIN (
      SELECT quiz_id, COUNT(*) as count
      FROM quiz_attempts
      GROUP BY quiz_id
    ) cc ON q.id = cc.quiz_id
    ${whereClause}
    GROUP BY q.id, q.quiz_id, q.title, q.topic, q.difficulty, q.status, q.created_at, q.updated_at, q.min_access_level, q.url_slug, cc.count
    ${orderByClause}
    LIMIT ${limit} OFFSET ${offset}
  `;
  
  const { results: quizzes } = await c.env.DB.prepare(mainQuery).bind(...queryParams).all();
  
  // Get all topics for the returned quizzes
  const quizIds = quizzes.map((q: any) => q.id);
  let topicsByQuiz = new Map<number, string[]>();
  
  if (quizIds.length > 0) {
    const { results: topicsData } = await c.env.DB.prepare(
      `SELECT qt.quiz_id, t.name 
       FROM quiz_topics qt 
       JOIN topics t ON qt.topic_id = t.id
       WHERE qt.quiz_id IN (${quizIds.map(() => '?').join(',')})`
    ).bind(...quizIds).all();
    
    topicsData.forEach((row: any) => {
      if (!topicsByQuiz.has(row.quiz_id)) {
        topicsByQuiz.set(row.quiz_id, []);
      }
      topicsByQuiz.get(row.quiz_id)!.push(row.name);
    });
  }
  
  // Get user's completed quizzes
  let completedQuizIds = new Set<number>();
  if (user && typeof user === 'object' && user !== null && 'id' in user && quizIds.length > 0) {
    const { results: completedQuizzes } = await c.env.DB.prepare(
      `SELECT DISTINCT quiz_id 
       FROM quiz_attempts 
       WHERE user_id = ?`
    ).bind((user as any).id).all();
    
    completedQuizIds = new Set(completedQuizzes.map((cq: any) => cq.quiz_id as number));
  }
  
  // Build response with metadata
  const quizzesWithMetadata = quizzes.map((quiz: any) => ({
    ...quiz,
    completions: quiz.completion_count || 0,
    topics: topicsByQuiz.get(quiz.id) || [],
    is_completed: completedQuizIds.has(quiz.id),
  }));
  
  return c.json({
    quizzes: quizzesWithMetadata,
    total: totalCount,
    limit,
    offset,
  });
});

app.get("/api/quizzes", authMiddleware, async (c) => {
  const user = c.get("user");
  
  // Support pagination for scalability
  const limit = parseInt(c.req.query("limit") || "0");
  const offset = parseInt(c.req.query("offset") || "0");
  
  // Build query based on pagination parameters
  let query = `SELECT 
      q.*,
      COALESCE(SUM(qu.word_count), 0) as total_word_count
    FROM quizzes q
    LEFT JOIN questions qu ON q.id = qu.quiz_id
    WHERE q.status = 'published'
    GROUP BY q.id
    ORDER BY q.difficulty, q.id`;
  
  // Add pagination if requested
  if (limit > 0) {
    query += ` LIMIT ${limit}`;
    if (offset > 0) {
      query += ` OFFSET ${offset}`;
    }
  }
  
  const { results: quizzes } = await c.env.DB.prepare(query).all();
  
  // Get completion counts for all quizzes in one query
  const { results: completionCounts } = await c.env.DB.prepare(
    `SELECT quiz_id, COUNT(*) as count
     FROM quiz_attempts
     GROUP BY quiz_id`
  ).all();
  
  const completionsByQuiz = new Map<number, number>();
  completionCounts.forEach((row: any) => {
    completionsByQuiz.set(row.quiz_id as number, row.count as number);
  });

  // Get all topics in one query
  const { results: allTopics } = await c.env.DB.prepare(
    `SELECT qt.quiz_id, t.name 
     FROM quiz_topics qt 
     JOIN topics t ON qt.topic_id = t.id`
  ).all();
  
  // Group topics by quiz_id
  const topicsByQuiz = new Map<number, string[]>();
  allTopics.forEach((row: any) => {
    if (!topicsByQuiz.has(row.quiz_id)) {
      topicsByQuiz.set(row.quiz_id, []);
    }
    topicsByQuiz.get(row.quiz_id)!.push(row.name);
  });
  
  // Get user's completed quizzes
  let completedQuizIds = new Set<number>();
  if (user) {
    // Avoid parameter limit by using a subquery instead of IN clause with bindings
    const { results: completedQuizzes } = await c.env.DB.prepare(
      `SELECT DISTINCT quiz_id 
       FROM quiz_attempts 
       WHERE user_id = ?`
    ).bind(user.id).all();
    
    completedQuizIds = new Set(completedQuizzes.map((cq: any) => cq.quiz_id as number));
  }
  
  // Add topics, completions, and completion status to each quiz
  const quizzesWithMetadata = quizzes.map((quiz: any) => ({
    ...quiz,
    completions: completionsByQuiz.get(quiz.id) || 0,
    topics: topicsByQuiz.get(quiz.id) || [],
    is_completed: completedQuizIds.has(quiz.id),
  }));

  // Add cache headers to reduce database load
  // Cache for 5 minutes for non-paginated requests (small responses)
  // Cache for 10 minutes for paginated requests (larger lists)
  const cacheSeconds = limit > 0 ? 600 : 300;
  c.header('Cache-Control', `public, max-age=${cacheSeconds}, stale-while-revalidate=60`);
  c.header('Vary', 'Cookie'); // Vary by user since is_completed differs per user

  return c.json(quizzesWithMetadata);
});

// Optimized home page endpoint - only fetches what's needed for the home page
app.get("/api/home-data", async (c) => {
  // Optional auth - check for preview session or real session
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);
  let user = null;
  
  if (sessionToken?.startsWith("preview_session_")) {
    const admin = await c.env.DB.prepare("SELECT * FROM admins LIMIT 1").first();
    if (admin) {
      user = {
        id: `preview_${admin.id}`,
        email: admin.email,
        created_at: new Date().toISOString(),
      };
    }
  } else if (sessionToken) {
    // Try to validate real session token using the SDK
    try {
      user = await getCurrentUser(sessionToken, {
        apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
        apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
      });
    } catch (error) {
      // Silently fail - treat as guest
      console.error("Error validating session:", error);
    }
  }
  
  // Get active home rows first to know which topics we need
  const { results: homeRows } = await c.env.DB.prepare(
    "SELECT * FROM home_rows WHERE is_active = 1 ORDER BY display_order"
  ).all();
  
  const topicTags = homeRows.map((row: any) => row.topic_tag);
  
  // Get latest 6 quizzes - optimized with single aggregated query
  const { results: latestQuizzes } = await c.env.DB.prepare(
    `SELECT 
      q.id,
      q.quiz_id,
      q.title,
      q.difficulty,
      q.created_at,
      q.updated_at,
      q.min_access_level,
      q.url_slug,
      COALESCE(SUM(qu.word_count), 0) as total_word_count
    FROM quizzes q
    LEFT JOIN questions qu ON q.id = qu.quiz_id
    WHERE q.status = 'published'
    GROUP BY q.id, q.quiz_id, q.title, q.difficulty, q.created_at, q.updated_at, q.min_access_level, q.url_slug
    ORDER BY q.id DESC
    LIMIT 6`
  ).all();
  
  // Get all quizzes for home rows in one query if we have topic tags
  let rowQuizzesData: any[] = [];
  if (topicTags.length > 0 && topicTags.length <= 50) {
    // Only use IN clause if we have reasonable number of tags
    const { results } = await c.env.DB.prepare(
      `SELECT 
        q.id,
        q.quiz_id,
        q.title,
        q.difficulty,
        q.created_at,
        q.updated_at,
        q.min_access_level,
        q.url_slug,
        t.name as topic_name,
        COALESCE(SUM(qu.word_count), 0) as total_word_count
      FROM quizzes q
      LEFT JOIN questions qu ON q.id = qu.quiz_id
      JOIN quiz_topics qt ON q.id = qt.quiz_id
      JOIN topics t ON qt.topic_id = t.id
      WHERE t.name IN (${topicTags.map(() => '?').join(',')}) AND q.status = 'published'
      GROUP BY q.id, q.quiz_id, q.title, q.difficulty, q.created_at, q.updated_at, q.min_access_level, q.url_slug, t.name
      ORDER BY q.id DESC`
    ).bind(...topicTags).all();
    
    rowQuizzesData = results;
  } else if (topicTags.length > 50) {
    // Too many tags - fetch all and filter in memory
    const { results: allQuizTopics } = await c.env.DB.prepare(
      `SELECT 
        q.id,
        q.quiz_id,
        q.title,
        q.difficulty,
        q.created_at,
        q.updated_at,
        q.min_access_level,
        q.url_slug,
        t.name as topic_name,
        COALESCE(SUM(qu.word_count), 0) as total_word_count
      FROM quizzes q
      LEFT JOIN questions qu ON q.id = qu.quiz_id
      JOIN quiz_topics qt ON q.id = qt.quiz_id
      JOIN topics t ON qt.topic_id = t.id
      WHERE q.status = 'published'
      GROUP BY q.id, q.quiz_id, q.title, q.difficulty, q.created_at, q.updated_at, q.min_access_level, q.url_slug, t.name
      ORDER BY q.id DESC`
    ).all();
    
    rowQuizzesData = allQuizTopics.filter((q: any) => topicTags.includes(q.topic_name));
  }
  
  // Get all unique quiz IDs we need to fetch data for
  const latestQuizIds = latestQuizzes.map((q: any) => q.id);
  const rowQuizIds = [...new Set(rowQuizzesData.map((q: any) => q.id))];
  const allQuizIds = [...new Set([...latestQuizIds, ...rowQuizIds])];
  
  // Fetch all topics for these quizzes - avoid parameter limit by fetching all if needed
  let topicsByQuiz = new Map<number, string[]>();
  if (allQuizIds.length > 0 && allQuizIds.length <= 99) {
    // Safe to use IN clause
    const { results: topicsData } = await c.env.DB.prepare(
      `SELECT qt.quiz_id, t.name 
       FROM quiz_topics qt 
       JOIN topics t ON qt.topic_id = t.id
       WHERE qt.quiz_id IN (${allQuizIds.map(() => '?').join(',')})`
    ).bind(...allQuizIds).all();
    
    topicsData.forEach((row: any) => {
      if (!topicsByQuiz.has(row.quiz_id)) {
        topicsByQuiz.set(row.quiz_id, []);
      }
      topicsByQuiz.get(row.quiz_id)!.push(row.name);
    });
  } else if (allQuizIds.length >= 99) {
    // Too many IDs - fetch all topics and filter in memory
    const { results: allTopicsData } = await c.env.DB.prepare(
      `SELECT qt.quiz_id, t.name 
       FROM quiz_topics qt 
       JOIN topics t ON qt.topic_id = t.id`
    ).all();
    
    const relevantQuizIds = new Set(allQuizIds);
    allTopicsData.forEach((row: any) => {
      if (relevantQuizIds.has(row.quiz_id)) {
        if (!topicsByQuiz.has(row.quiz_id)) {
          topicsByQuiz.set(row.quiz_id, []);
        }
        topicsByQuiz.get(row.quiz_id)!.push(row.name);
      }
    });
  }
  
  // Fetch completion counts - avoid parameter limit by fetching all if needed
  let completionsByQuiz = new Map<number, number>();
  if (allQuizIds.length > 0 && allQuizIds.length <= 99) {
    // Safe to use IN clause
    const { results: completionsData } = await c.env.DB.prepare(
      `SELECT quiz_id, COUNT(*) as count
       FROM quiz_attempts
       WHERE quiz_id IN (${allQuizIds.map(() => '?').join(',')})
       GROUP BY quiz_id`
    ).bind(...allQuizIds).all();
    
    completionsData.forEach((row: any) => {
      completionsByQuiz.set(row.quiz_id as number, row.count as number);
    });
  } else if (allQuizIds.length >= 99) {
    // Too many IDs - fetch all completions and filter in memory
    const { results: allCompletionsData } = await c.env.DB.prepare(
      `SELECT quiz_id, COUNT(*) as count
       FROM quiz_attempts
       GROUP BY quiz_id`
    ).all();
    
    const relevantQuizIds = new Set(allQuizIds);
    allCompletionsData.forEach((row: any) => {
      if (relevantQuizIds.has(row.quiz_id as number)) {
        completionsByQuiz.set(row.quiz_id as number, row.count as number);
      }
    });
  }
  
  // Get user's completed quizzes - always fetch all and filter in memory
  let completedQuizIds = new Set<number>();
  if (user && typeof user === 'object' && user !== null && 'id' in user) {
    const { results: userCompletions } = await c.env.DB.prepare(
      `SELECT DISTINCT quiz_id 
       FROM quiz_attempts 
       WHERE user_id = ?`
    ).bind((user as any).id).all();
    
    completedQuizIds = new Set(userCompletions.map((row: any) => row.quiz_id as number));
  }
  
  // Build the response - group row quizzes by topic
  const rowQuizzesByTopic = new Map<string, any[]>();
  rowQuizzesData.forEach((quiz: any) => {
    if (!rowQuizzesByTopic.has(quiz.topic_name)) {
      rowQuizzesByTopic.set(quiz.topic_name, []);
    }
    
    // Only add if we haven't reached the limit of 8 for this topic
    const topicQuizzes = rowQuizzesByTopic.get(quiz.topic_name)!;
    if (topicQuizzes.length < 8) {
      topicQuizzes.push({
        id: quiz.id,
        quiz_id: quiz.quiz_id,
        title: quiz.title,
        difficulty: quiz.difficulty,
        created_at: quiz.created_at,
        updated_at: quiz.updated_at,
        min_access_level: quiz.min_access_level,
        total_word_count: quiz.total_word_count,
        topics: topicsByQuiz.get(quiz.id) || [],
        completions: completionsByQuiz.get(quiz.id) || 0,
        is_completed: completedQuizIds.has(quiz.id),
      });
    }
  });
  
  // Format home rows with their quizzes
  const formattedHomeRows = homeRows.map((row: any) => ({
    row,
    quizzes: rowQuizzesByTopic.get(row.topic_tag) || [],
  }));

  return c.json({
    latestQuizzes: latestQuizzes.map((q: any) => ({
      id: q.id,
      quiz_id: q.quiz_id,
      title: q.title,
      difficulty: q.difficulty,
      created_at: q.created_at,
      updated_at: q.updated_at,
      min_access_level: q.min_access_level,
      total_word_count: q.total_word_count,
      topics: topicsByQuiz.get(q.id) || [],
      completions: completionsByQuiz.get(q.id) || 0,
      is_completed: completedQuizIds.has(q.id),
    })),
    homeRows: formattedHomeRows,
  });
});

app.get("/api/quizzes/:id", async (c) => {
  const quizId = c.req.param("id");

  const quiz = await c.env.DB.prepare(
    "SELECT id, quiz_id, title, topic, difficulty, status, created_at, updated_at, min_access_level, url_slug FROM quizzes WHERE id = ?"
  ).bind(quizId).first();

  if (!quiz) {
    return c.json({ error: "Quiz not found" }, 404);
  }

  const { results: questions } = await c.env.DB.prepare(
    "SELECT id, quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, image_url, explanation_image_url, word_count, question_order FROM questions WHERE quiz_id = ? ORDER BY question_order"
  ).bind(quizId).all();

  return c.json({
    ...quiz,
    min_access_level: (quiz.min_access_level as AccessLevel) || 'member',
    questions,
  });
});

app.post(
  "/api/quizzes/:id/complete",
  authMiddleware,
  zValidator("json", z.object({ score: z.number(), words_read: z.number() })),
  async (c) => {
    // Get authenticated user
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const quizId = c.req.param("id");
    const { score, words_read } = c.req.valid("json");

    // Get user's access level and quiz's required level
    const [progress, quiz] = await Promise.all([
      c.env.DB.prepare("SELECT access_level FROM user_progress WHERE user_id = ?").bind(user.id).first(),
      c.env.DB.prepare("SELECT difficulty, min_access_level FROM quizzes WHERE id = ?").bind(quizId).first(),
    ]);
    
    if (!quiz) {
      return c.json({ error: "Quiz not found" }, 404);
    }
    
    // Check access level
    const userAccessLevel = (progress?.access_level as AccessLevel) || 'member';
    const quizRequiredLevel = (quiz.min_access_level as AccessLevel) || 'member';
    
    if (!hasAccess(userAccessLevel, quizRequiredLevel)) {
      return c.json({ error: "Insufficient access level" }, 403);
    }

    // Level thresholds
    const LEVEL_THRESHOLDS = [
      { level: 1, threshold: 1000, name: "First Steps" },
      { level: 2, threshold: 5000, name: "Building Momentum" },
      { level: 3, threshold: 10000, name: "Word Explorer" },
      { level: 4, threshold: 25000, name: "Dedicated Reader" },
      { level: 5, threshold: 50000, name: "Input Enthusiast" },
      { level: 6, threshold: 100000, name: "Hundred Thousand Club" },
      { level: 7, threshold: 250000, name: "Quarter Million Milestone" },
      { level: 8, threshold: 500000, name: "Half Million Reader" },
      { level: 9, threshold: 1000000, name: "Million Word Milestone" },
    ];

    const getCurrentLevel = (wordsRead: number) => {
      for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (wordsRead >= LEVEL_THRESHOLDS[i].threshold) {
          return {
            current: LEVEL_THRESHOLDS[i],
            next: LEVEL_THRESHOLDS[i + 1] || null,
          };
        }
      }
      return { current: null, next: LEVEL_THRESHOLDS[0] };
    };

    // Query today's words BEFORE recording this attempt to detect goal completion
    const today = new Date().toISOString().split('T')[0];
    
    const [progressData, todayQuizWords, todayExternalWords] = await Promise.all([
      c.env.DB.prepare("SELECT * FROM user_progress WHERE user_id = ?").bind(user.id).first(),
      c.env.DB.prepare("SELECT COALESCE(SUM(words_read), 0) as total FROM quiz_attempts WHERE user_id = ? AND DATE(created_at) = ?").bind(user.id, today).first(),
      c.env.DB.prepare("SELECT COALESCE(SUM(words_read), 0) as total FROM external_reading WHERE user_id = ? AND reading_date = ?").bind(user.id, today).first(),
    ]);
    
    // Record the quiz attempt AFTER getting today's words (important for goal detection)
    await c.env.DB.prepare("INSERT INTO quiz_attempts (user_id, quiz_id, score, words_read) VALUES (?, ?, ?, ?)").bind(user.id, quizId, score, words_read).run();

    // Calculate if goal was just reached
    const dailyTarget = (progressData?.daily_target as number) || 1000;
    const previousTodayWords = ((todayQuizWords?.total as number) || 0) + ((todayExternalWords?.total as number) || 0);
    const wasUnderGoal = previousTodayWords < dailyTarget;
    const newTodayWords = previousTodayWords + words_read;
    const isNowOverGoal = newTodayWords >= dailyTarget;
    const goalJustReached = wasUnderGoal && isNowOverGoal;

    // Calculate if level was just reached
    const previousTotalWords = (progressData?.total_words_read as number) || 0;
    const newTotalWords = previousTotalWords + words_read;
    const previousLevel = getCurrentLevel(previousTotalWords);
    const newLevel = getCurrentLevel(newTotalWords);
    const levelJustReached = previousLevel.current?.level !== newLevel.current?.level && newLevel.current !== null;
    
    // Fetch next quiz and update progress in parallel
    const nextQuizPromise = quiz 
      ? c.env.DB.prepare("SELECT id FROM quizzes WHERE difficulty = ? AND id != ? ORDER BY RANDOM() LIMIT 1").bind(quiz.difficulty, quizId).all()
      : Promise.resolve({ results: [] });

    // Update progress asynchronously (fire-and-forget after calculating values)
    const updateProgressAsync = async () => {
      if (!progressData) {
        await c.env.DB.prepare(
          "INSERT INTO user_progress (user_id, daily_words_read, total_words_read, current_streak, longest_streak, total_quizzes_completed, last_activity_date) VALUES (?, ?, ?, 1, 1, 1, DATE('now'))"
        ).bind(user.id, words_read, words_read).run();
      } else {
        const lastActivityDate = progressData.last_activity_date as string | null;
        let newDailyWords = words_read;
        let newStreak = (progressData.current_streak as number) || 0;
        
        if (lastActivityDate === today) {
          newDailyWords = ((progressData.daily_words_read as number) || 0) + words_read;
        } else {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          
          if (lastActivityDate === yesterdayStr) {
            newStreak = ((progressData.current_streak as number) || 0) + 1;
          } else {
            newStreak = 1;
          }
        }

        const newLongestStreak = Math.max(newStreak, (progressData.longest_streak as number) || 0);
        const newTotalWords = ((progressData.total_words_read as number) || 0) + words_read;
        const newTotalQuizzes = ((progressData.total_quizzes_completed as number) || 0) + 1;
        const currentLevel = getCurrentLevel(newTotalWords);
        const newLastLevel = currentLevel.current?.level || 0;

        await c.env.DB.prepare(
          "UPDATE user_progress SET daily_words_read = ?, total_words_read = ?, current_streak = ?, longest_streak = ?, total_quizzes_completed = ?, last_level = ?, last_activity_date = DATE('now'), updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
        ).bind(newDailyWords, newTotalWords, newStreak, newLongestStreak, newTotalQuizzes, newLastLevel, user.id).run();
      }
    };
    
    // Start progress update but don't wait for it
    c.executionCtx.waitUntil(updateProgressAsync());

    // Wait only for next quiz suggestion
    const { results: sameDifficultyQuizzes } = await nextQuizPromise;
    const nextQuizId = sameDifficultyQuizzes.length > 0 ? sameDifficultyQuizzes[0].id : null;

    // Calculate streak for response
    let currentStreak = (progressData?.current_streak as number) || 0;
    const lastActivityDate = progressData?.last_activity_date as string | null;
    if (lastActivityDate === today) {
      // Same day - keep current streak
      currentStreak = (progressData?.current_streak as number) || 0;
    } else {
      // New day - calculate new streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastActivityDate === yesterdayStr) {
        currentStreak = ((progressData?.current_streak as number) || 0) + 1;
      } else {
        currentStreak = 1;
      }
    }

    return c.json({ 
      success: true,
      nextQuizId: nextQuizId,
      goalReached: goalJustReached,
      currentStreak: currentStreak,
      dailyWordsRead: newTodayWords,
      dailyTarget: dailyTarget,
      levelReached: levelJustReached,
      levelData: levelJustReached ? {
        level: newLevel.current!.level,
        levelName: newLevel.current!.name,
        nextLevel: newLevel.next?.level || null,
        totalWords: newTotalWords,
        quizzesCompleted: ((progress?.total_quizzes_completed as number) || 0) + 1,
        bestStreak: Math.max(currentStreak, (progress?.longest_streak as number) || 0),
      } : null,
    });
  }
);

// Quiz attempts route
app.get("/api/quiz-attempts", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const { results } = await c.env.DB.prepare(
    `SELECT qa.id, q.title as quiz_title, qa.score, qa.words_read, qa.created_at 
     FROM quiz_attempts qa 
     JOIN quizzes q ON qa.quiz_id = q.id 
     WHERE qa.user_id = ? 
     ORDER BY qa.created_at DESC`
  ).bind(user.id).all();

  return c.json(results);
});

// Daily activity route
app.get("/api/daily-activity", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const year = c.req.query("year");
  const month = c.req.query("month");
  
  if (!year || !month) {
    return c.json({ error: "Year and month are required" }, 400);
  }
  
  // Get quiz attempts for the user in the specified month
  const { results: quizResults } = await c.env.DB.prepare(
    `SELECT DATE(created_at) as date, SUM(words_read) as total_words
     FROM quiz_attempts
     WHERE user_id = ? 
     AND strftime('%Y', created_at) = ?
     AND strftime('%m', created_at) = ?
     GROUP BY DATE(created_at)`
  ).bind(user.id, year, month).all();
  
  // Get external reading for the user in the specified month
  const { results: externalResults } = await c.env.DB.prepare(
    `SELECT reading_date as date, SUM(words_read) as total_words
     FROM external_reading
     WHERE user_id = ? 
     AND strftime('%Y', reading_date) = ?
     AND strftime('%m', reading_date) = ?
     GROUP BY reading_date`
  ).bind(user.id, year, month).all();
  
  // Combine quiz and external reading
  const activityMap = new Map<string, number>();
  
  quizResults.forEach((result: any) => {
    activityMap.set(result.date, (activityMap.get(result.date) || 0) + (result.total_words || 0));
  });
  
  externalResults.forEach((result: any) => {
    activityMap.set(result.date, (activityMap.get(result.date) || 0) + (result.total_words || 0));
  });
  
  const dailyActivity = Array.from(activityMap.entries())
    .map(([date, total_words]) => ({ date, total_words }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  // Get user's daily target
  const progress = await c.env.DB.prepare(
    "SELECT daily_target, current_streak, last_activity_date FROM user_progress WHERE user_id = ?"
  ).bind(user.id).first();
  
  return c.json({
    dailyActivity,
    dailyTarget: progress?.daily_target || 1000,
    currentStreak: progress?.current_streak || 0,
    lastActivityDate: progress?.last_activity_date || null
  });
});

// Admin routes
app.get("/api/admin/check", authMiddleware, adminMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const admin = await c.env.DB.prepare(
    "SELECT * FROM admins WHERE email = ?"
  ).bind(user.email).first();
  
  return c.json({ isAdmin: !!admin });
});

// Dashboard stats
app.get("/api/admin/dashboard", authMiddleware, adminMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const admin = await c.env.DB.prepare(
    "SELECT * FROM admins WHERE email = ?"
  ).bind(user.email).first();
  
  if (!admin) {
    return c.json({ error: "Unauthorized" }, 403);
  }
  
  // Get filters from query params
  const timeframe = c.req.query("timeframe") || "all";
  const difficultyFilter = c.req.query("difficulty") || "all";
  
  // Build timeframe SQL condition for subquery
  let timeframeCondition = "";
  if (timeframe === "today") {
    timeframeCondition = "WHERE DATE(created_at) = DATE('now')";
  } else if (timeframe === "week") {
    timeframeCondition = "WHERE created_at >= datetime('now', '-7 days')";
  } else if (timeframe === "month") {
    timeframeCondition = "WHERE created_at >= datetime('now', '-30 days')";
  }
  
  // Build difficulty SQL condition for quizzes WHERE clause
  let quizWhereConditions = ["q.status = 'published'"];
  if (difficultyFilter !== "all") {
    // Use LOWER() for case-insensitive comparison since DB has capitalized values
    quizWhereConditions.push(`LOWER(q.difficulty) = '${difficultyFilter.toLowerCase()}'`);
  }
  const quizWhereClause = `WHERE ${quizWhereConditions.join(' AND ')}`;
  
  const today = new Date().toISOString().split('T')[0];
  
  // OPTIMIZATION 1: Parallelize independent queries into groups
  // Group 1: Basic counts and breakdowns (can all run in parallel)
  const [
    totalQuizzesResult,
    totalWordsResult,
    { results: difficultyBreakdown },
    totalUsersResult,
    totalRegisteredResult,
    totalAttemptsResult,
    totalTopicsResult,
    { results: recentActivity },
  ] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) as count FROM quizzes").first(),
    c.env.DB.prepare("SELECT SUM(word_count) as total FROM questions").first(),
    c.env.DB.prepare("SELECT difficulty, COUNT(*) as count FROM quizzes GROUP BY difficulty ORDER BY difficulty").all(),
    c.env.DB.prepare("SELECT COUNT(DISTINCT user_id) as count FROM user_progress").first(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM user_progress").first(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM quiz_attempts").first(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM topics").first(),
    c.env.DB.prepare(
      `SELECT 
        DATE(created_at) as date, 
        COUNT(*) as attempts, 
        SUM(words_read) as words, 
        COUNT(DISTINCT CASE WHEN user_id NOT LIKE 'guest_%' THEN user_id END) as unique_users,
        COUNT(DISTINCT CASE WHEN user_id LIKE 'guest_%' THEN user_id END) as unique_guests
       FROM quiz_attempts
       WHERE created_at >= datetime('now', '-7 days')
       GROUP BY DATE(created_at)
       ORDER BY date DESC`
    ).all(),
  ]);
  
  const totalQuizzes = (totalQuizzesResult?.count as number) || 0;
  const totalWords = (totalWordsResult?.total as number) || 0;
  const totalUsers = (totalUsersResult?.count as number) || 0;
  const totalRegistered = (totalRegisteredResult?.count as number) || 0;
  const totalAttempts = (totalAttemptsResult?.count as number) || 0;
  const totalTopics = (totalTopicsResult?.count as number) || 0;
  
  // Get signups by day for the last 7 days
  const { results: signupsByDay } = await c.env.DB.prepare(
    `SELECT DATE(created_at) as date, COUNT(*) as signups
     FROM user_progress
     WHERE created_at >= datetime('now', '-7 days')
     GROUP BY DATE(created_at)`
  ).all();
  
  // Merge signups into recentActivity
  const signupsMap = new Map(signupsByDay.map((s: any) => [s.date, s.signups]));
  recentActivity.forEach((day: any) => {
    day.signups = signupsMap.get(day.date) || 0;
  });
  
  // Group 2: User signup stats and words read stats (can run in parallel)
  // OPTIMIZATION 2: Combine words read queries into single aggregated query
  const [
    signupsTodayResult,
    signupsWeekResult,
    totalWordsReadResult,
    { results: wordsReadStats },
    { results: popularQuizzes },
  ] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) as count FROM user_progress WHERE DATE(created_at) = ?").bind(today).first(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM user_progress WHERE created_at >= datetime('now', '-7 days')").first(),
    c.env.DB.prepare("SELECT SUM(total_words_read) as total FROM user_progress").first(),
    // Combined query for words read today and this week
    c.env.DB.prepare(
      `SELECT 
        'today_quiz' as period, SUM(words_read) as total, COUNT(DISTINCT user_id) as users
        FROM quiz_attempts WHERE DATE(created_at) = ?
      UNION ALL
      SELECT 
        'today_external' as period, SUM(words_read) as total, COUNT(DISTINCT user_id) as users
        FROM external_reading WHERE reading_date = ?
      UNION ALL
      SELECT 
        'week_quiz' as period, SUM(words_read) as total, COUNT(DISTINCT user_id) as users
        FROM quiz_attempts WHERE created_at >= datetime('now', '-7 days')
      UNION ALL
      SELECT 
        'week_external' as period, SUM(words_read) as total, COUNT(DISTINCT user_id) as users
        FROM external_reading WHERE reading_date >= date('now', '-7 days')`
    ).bind(today, today).all(),
    c.env.DB.prepare(
      `SELECT q.id, q.title, q.difficulty, COALESCE(cc.count, 0) as completions
       FROM quizzes q
       LEFT JOIN (
         SELECT quiz_id, COUNT(*) as count
         FROM quiz_attempts
         ${timeframeCondition}
         GROUP BY quiz_id
       ) cc ON q.id = cc.quiz_id
       ${quizWhereClause}
       GROUP BY q.id, q.title, q.difficulty, cc.count
       ORDER BY completions DESC
       LIMIT 10`
    ).all(),
  ]);
  
  const signupsToday = (signupsTodayResult?.count as number) || 0;
  const signupsWeek = (signupsWeekResult?.count as number) || 0;
  const totalWordsRead = (totalWordsReadResult?.total as number) || 0;
  
  // Process combined words read stats
  const statsMap = new Map<string, { total: number; users: Set<string> }>();
  wordsReadStats.forEach((row: any) => {
    const period = row.period as string;
    if (!statsMap.has(period)) {
      statsMap.set(period, { total: 0, users: new Set() });
    }
    const stat = statsMap.get(period)!;
    stat.total += (row.total as number) || 0;
  });
  
  const wordsReadToday = 
    ((statsMap.get('today_quiz')?.total || 0) + 
     (statsMap.get('today_external')?.total || 0));
  const wordsReadWeek = 
    ((statsMap.get('week_quiz')?.total || 0) + 
     (statsMap.get('week_external')?.total || 0));
  
  // Get active users counts in parallel
  const [
    activeUsersTodayResult,
    activeUsersWeekResult,
  ] = await Promise.all([
    c.env.DB.prepare(
      `SELECT COUNT(DISTINCT user_id) as count FROM (
        SELECT user_id FROM quiz_attempts WHERE DATE(created_at) = ?
        UNION
        SELECT user_id FROM external_reading WHERE reading_date = ?
      )`
    ).bind(today, today).first(),
    c.env.DB.prepare(
      `SELECT COUNT(DISTINCT user_id) as count FROM (
        SELECT user_id FROM quiz_attempts WHERE created_at >= datetime('now', '-7 days')
        UNION
        SELECT user_id FROM external_reading WHERE reading_date >= date('now', '-7 days')
      )`
    ).first(),
  ]);
  
  const activeUsersToday = (activeUsersTodayResult?.count as number) || 0;
  const activeUsersWeek = (activeUsersWeekResult?.count as number) || 0;
  
  const avgWordsPerUserDaily = activeUsersToday > 0 ? Math.round(wordsReadToday / activeUsersToday) : 0;
  const avgWordsPerUserWeekly = activeUsersWeek > 0 ? Math.round(wordsReadWeek / activeUsersWeek) : 0;
  
  // Group 3: Streak statistics (run in parallel)
  const [
    { results: allStreaks },
    { results: longestStreaks },
  ] = await Promise.all([
    c.env.DB.prepare("SELECT current_streak, longest_streak FROM user_progress ORDER BY current_streak").all(),
    c.env.DB.prepare("SELECT longest_streak FROM user_progress ORDER BY longest_streak DESC LIMIT 10").all(),
  ]);
  
  let averageStreak = 0;
  let medianStreak = 0;
  let usersWithWeekStreak = 0;
  
  if (allStreaks.length > 0) {
    const totalStreak = allStreaks.reduce((sum: number, user: any) => sum + ((user.current_streak as number) || 0), 0);
    averageStreak = Math.round(totalStreak / allStreaks.length * 10) / 10;
    
    const midIndex = Math.floor(allStreaks.length / 2);
    if (allStreaks.length % 2 === 0) {
      medianStreak = ((allStreaks[midIndex - 1].current_streak as number) + (allStreaks[midIndex].current_streak as number)) / 2;
    } else {
      medianStreak = allStreaks[midIndex].current_streak as number;
    }
    
    usersWithWeekStreak = allStreaks.filter((user: any) => (user.current_streak as number) >= 7).length;
  }
  
  const percentWithWeekStreak = totalUsers > 0 ? Math.round((usersWithWeekStreak / totalUsers) * 100) : 0;
  
  // Get PWA install count and newsletter subscribers
  const [pwaInstallsResult, newsletterSubsResult] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) as count FROM user_progress WHERE pwa_installed = 1").first(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM user_progress WHERE email_opt_in = 1").first(),
  ]);
  const pwaInstalls = (pwaInstallsResult?.count as number) || 0;
  const newsletterSubscribers = (newsletterSubsResult?.count as number) || 0;
  
  // Calculate weekly totals for Recent Activity
  const weeklyTotals = {
    signups: recentActivity.reduce((sum: number, day: any) => sum + (day.signups as number), 0),
    unique_users: 0, // Will be set below with actual distinct count
    attempts: recentActivity.reduce((sum: number, day: any) => sum + (day.attempts as number), 0),
    words: recentActivity.reduce((sum: number, day: any) => sum + (day.words as number), 0),
  };
  
  // Get actual distinct users and guests for the week
  const weeklyUniqueUsersResult = await c.env.DB.prepare(
    `SELECT 
      COUNT(DISTINCT CASE WHEN user_id NOT LIKE 'guest_%' THEN user_id END) as users,
      COUNT(DISTINCT CASE WHEN user_id LIKE 'guest_%' THEN user_id END) as guests
     FROM quiz_attempts
     WHERE created_at >= datetime('now', '-7 days')`
  ).first();
  weeklyTotals.unique_users = (weeklyUniqueUsersResult?.users as number) || 0;
  const weeklyUniqueGuests = (weeklyUniqueUsersResult?.guests as number) || 0;
  
  return c.json({
    totalQuizzes,
    totalWords,
    totalUsers,
    totalAttempts,
    totalTopics,
    difficultyBreakdown,
    popularQuizzes,
    recentActivity,
    weeklyTotals: {
      ...weeklyTotals,
      unique_guests: weeklyUniqueGuests,
    },
    streakStats: {
      averageStreak,
      medianStreak,
      longestStreaks: longestStreaks.map((s: any) => s.longest_streak as number),
      usersWithWeekStreak,
      percentWithWeekStreak,
    },
    userStats: {
      totalRegistered,
      signupsToday,
      signupsWeek,
      pwaInstalls,
      newsletterSubscribers,
    },
    readingStats: {
      totalWordsRead,
      wordsReadToday,
      wordsReadWeek,
      avgWordsPerUserDaily,
      avgWordsPerUserWeekly,
    },
  });
});

// User data export endpoints
app.get("/api/admin/export/users", authMiddleware, adminMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const admin = await c.env.DB.prepare(
    "SELECT * FROM admins WHERE email = ?"
  ).bind(user.email).first();
  
  if (!admin) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  try {
    const { results: users } = await c.env.DB.prepare(
      `SELECT user_id, created_at 
       FROM user_progress 
       ORDER BY created_at DESC`
    ).all();

    const rows = users.map((u: any) => ({
      user_id: u.user_id,
      created_at: u.created_at,
    }));

    return c.json({ rows });
  } catch (error) {
    console.error("Error exporting users:", error);
    return c.json({ 
      error: "Failed to export users",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.get("/api/admin/export/user-progress", authMiddleware, adminMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const admin = await c.env.DB.prepare(
    "SELECT * FROM admins WHERE email = ?"
  ).bind(user.email).first();
  
  if (!admin) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  try {
    const { results: progress } = await c.env.DB.prepare(
      `SELECT user_id, daily_words_read, total_words_read, current_streak, 
              longest_streak, total_quizzes_completed, daily_target, 
              last_activity_date, email_opt_in, pwa_installed, created_at, updated_at
       FROM user_progress 
       ORDER BY user_id`
    ).all();

    const rows = progress.map((p: any) => ({
      user_id: p.user_id,
      daily_words_read: p.daily_words_read,
      total_words_read: p.total_words_read,
      current_streak: p.current_streak,
      longest_streak: p.longest_streak,
      total_quizzes_completed: p.total_quizzes_completed,
      daily_target: p.daily_target,
      last_activity_date: p.last_activity_date,
      email_opt_in: p.email_opt_in,
      pwa_installed: p.pwa_installed,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));

    return c.json({ rows });
  } catch (error) {
    console.error("Error exporting user progress:", error);
    return c.json({ 
      error: "Failed to export user progress",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.get("/api/admin/export/quiz-attempts", authMiddleware, adminMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const admin = await c.env.DB.prepare(
    "SELECT * FROM admins WHERE email = ?"
  ).bind(user.email).first();
  
  if (!admin) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  try {
    const { results: attempts } = await c.env.DB.prepare(
      `SELECT qa.id, qa.user_id, qa.quiz_id, q.title as quiz_title, 
              qa.score, qa.words_read, qa.created_at
       FROM quiz_attempts qa
       JOIN quizzes q ON qa.quiz_id = q.id
       ORDER BY qa.created_at DESC`
    ).all();

    const rows = attempts.map((a: any) => ({
      id: a.id,
      user_id: a.user_id,
      quiz_id: a.quiz_id,
      quiz_title: a.quiz_title,
      score: a.score,
      words_read: a.words_read,
      created_at: a.created_at,
    }));

    return c.json({ rows });
  } catch (error) {
    console.error("Error exporting quiz attempts:", error);
    return c.json({ 
      error: "Failed to export quiz attempts",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.get("/api/admin/export/external-reading", authMiddleware, adminMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const admin = await c.env.DB.prepare(
    "SELECT * FROM admins WHERE email = ?"
  ).bind(user.email).first();
  
  if (!admin) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  try {
    const { results: reading } = await c.env.DB.prepare(
      `SELECT id, user_id, words_read, source_type, details, 
              reading_date, created_at
       FROM external_reading 
       ORDER BY reading_date DESC`
    ).all();

    const rows = reading.map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      words_read: r.words_read,
      source_type: r.source_type,
      details: r.details || '',
      reading_date: r.reading_date,
      created_at: r.created_at,
    }));

    return c.json({ rows });
  } catch (error) {
    console.error("Error exporting external reading:", error);
    return c.json({ 
      error: "Failed to export external reading",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Bulk export all quizzes - optimized to handle large datasets
app.get("/api/admin/quizzes/bulk-export-all", authMiddleware, adminMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const admin = await c.env.DB.prepare(
    "SELECT * FROM admins WHERE email = ?"
  ).bind(user.email).first();
  
  if (!admin) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  try {
    // Fetch all quizzes with minimal data first
    const { results: quizzes } = await c.env.DB.prepare(
      "SELECT id, quiz_id, title, difficulty FROM quizzes ORDER BY id"
    ).all();

    if (quizzes.length === 0) {
      return c.json({ rows: [] });
    }

    // Fetch all topics with their quiz associations in one query
    const { results: allTopicRows } = await c.env.DB.prepare(
      `SELECT qt.quiz_id, t.name 
       FROM quiz_topics qt 
       JOIN topics t ON qt.topic_id = t.id`
    ).all();

    // Group topics by quiz_id efficiently
    const topicsByQuiz = new Map<number, string[]>();
    for (const row of allTopicRows) {
      const quizId = (row as any).quiz_id as number;
      if (!topicsByQuiz.has(quizId)) {
        topicsByQuiz.set(quizId, []);
      }
      topicsByQuiz.get(quizId)!.push((row as any).name);
    }

    // Fetch all questions in one query with only needed fields
    const { results: allQuestions } = await c.env.DB.prepare(
      `SELECT quiz_id, question_text, option_a, option_b, option_c, option_d, 
              correct_answer, explanation, question_order 
       FROM questions 
       ORDER BY quiz_id, question_order`
    ).all();

    // Group questions by quiz_id for faster lookup
    const questionsByQuiz = new Map<number, any[]>();
    for (const q of allQuestions) {
      const quizId = (q as any).quiz_id as number;
      if (!questionsByQuiz.has(quizId)) {
        questionsByQuiz.set(quizId, []);
      }
      questionsByQuiz.get(quizId)!.push(q);
    }

    // Build rows efficiently
    const rows: any[] = [];
    
    for (const quiz of quizzes) {
      const quizId = (quiz as any).id as number;
      const topics = (topicsByQuiz.get(quizId) || []).join(', ');
      const questions = questionsByQuiz.get(quizId) || [];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        rows.push({
          quiz_id: (quiz as any).quiz_id || `${String((quiz as any).title).toLowerCase().replace(/\s+/g, '_')}_${String(quizId).padStart(2, '0')}`,
          quiz_title: (quiz as any).title,
          difficulty: (quiz as any).difficulty,
          topics: topics,
          question_number: i + 1,
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer,
          explanation: q.explanation
        });
      }
    }

    return c.json({ rows, total: quizzes.length });
  } catch (error) {
    console.error("Error in bulk export all:", error);
    return c.json({ 
      error: "Failed to export quizzes",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Admin route to get all quizzes (including drafts) - MUST come before /:id route
app.get("/api/admin/quizzes/all", authMiddleware, adminMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const admin = await c.env.DB.prepare(
    "SELECT * FROM admins WHERE email = ?"
  ).bind(user.email).first();
  
  if (!admin) {
    return c.json({ error: "Unauthorized" }, 403);
  }
  
  // Get all quizzes (both published and draft)
  const { results: quizzes } = await c.env.DB.prepare(
    `SELECT 
      q.*,
      COALESCE(SUM(qu.word_count), 0) as total_word_count
    FROM quizzes q
    LEFT JOIN questions qu ON q.id = qu.quiz_id
    GROUP BY q.id
    ORDER BY q.id DESC`
  ).all();
  
  // Get completion counts for all quizzes
  const { results: completionCounts } = await c.env.DB.prepare(
    `SELECT quiz_id, COUNT(*) as count
     FROM quiz_attempts
     GROUP BY quiz_id`
  ).all();
  
  const completionsByQuiz = new Map<number, number>();
  completionCounts.forEach((row: any) => {
    completionsByQuiz.set(row.quiz_id as number, row.count as number);
  });

  // Get all topics
  const { results: allTopics } = await c.env.DB.prepare(
    `SELECT qt.quiz_id, t.name 
     FROM quiz_topics qt 
     JOIN topics t ON qt.topic_id = t.id`
  ).all();
  
  // Group topics by quiz_id
  const topicsByQuiz = new Map<number, string[]>();
  allTopics.forEach((row: any) => {
    if (!topicsByQuiz.has(row.quiz_id)) {
      topicsByQuiz.set(row.quiz_id, []);
    }
    topicsByQuiz.get(row.quiz_id)!.push(row.name);
  });
  
  // Add topics and completions to each quiz
  const quizzesWithMetadata = quizzes.map((quiz: any) => ({
    ...quiz,
    completions: completionsByQuiz.get(quiz.id) || 0,
    topics: topicsByQuiz.get(quiz.id) || [],
  }));

  return c.json(quizzesWithMetadata);
});

// Get quiz for editing (with topics)
app.get("/api/admin/quizzes/:id", authMiddleware, adminMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const admin = await c.env.DB.prepare(
    "SELECT * FROM admins WHERE email = ?"
  ).bind(user.email).first();
  
  if (!admin) {
    return c.json({ error: "Unauthorized" }, 403);
  }
  
  const quizId = c.req.param("id");

  const quiz = await c.env.DB.prepare(
    "SELECT id, quiz_id, title, topic, difficulty, status, created_at, updated_at, min_access_level, url_slug FROM quizzes WHERE id = ?"
  ).bind(quizId).first();

  if (!quiz) {
    return c.json({ error: "Quiz not found" }, 404);
  }

  const { results: questions } = await c.env.DB.prepare(
    "SELECT id, quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, image_url, explanation_image_url, word_count, question_order FROM questions WHERE quiz_id = ? ORDER BY question_order"
  ).bind(quizId).all();

  // Get topics for this quiz
  const { results: topicRows } = await c.env.DB.prepare(
    `SELECT t.name FROM topics t 
     JOIN quiz_topics qt ON t.id = qt.topic_id 
     WHERE qt.quiz_id = ?`
  ).bind(quizId).all();
  
  const topics = topicRows.map((row: any) => row.name);

  return c.json({
    ...quiz,
    questions,
    topics,
  });
});

// Update quiz
app.put(
  "/api/admin/quizzes/:id",
  authMiddleware,
  zValidator("json", z.object({
    title: z.string(),
    difficulty: z.string(),
    status: z.enum(['draft', 'published']).optional(),
    topics: z.array(z.string()).optional(),
    questions: z.array(z.object({
      id: z.number().optional(),
      question_text: z.string(),
      correct_answer: z.string(),
      option_a: z.string(),
      option_b: z.string(),
      option_c: z.string(),
      option_d: z.string(),
      explanation: z.string(),
      image_url: z.string().optional().nullable(),
      explanation_image_url: z.string().optional().nullable(),
      question_order: z.number(),
    })),
  })),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const admin = await c.env.DB.prepare(
      "SELECT * FROM admins WHERE email = ?"
    ).bind(user.email).first();
    
    if (!admin) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const quizId = c.req.param("id");
    const { title, difficulty, status, topics, questions } = c.req.valid("json");

    // Update quiz (topic field ignored - using quiz_topics table instead)
    await c.env.DB.prepare(
      "UPDATE quizzes SET title = ?, difficulty = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(title, difficulty, status || 'published', quizId).run();

    // Delete existing topics
    await c.env.DB.prepare(
      "DELETE FROM quiz_topics WHERE quiz_id = ?"
    ).bind(quizId).run();

    // Add new topics
    if (topics && topics.length > 0) {
      for (const topicName of topics) {
        // Find or create topic
        let topicRecord = await c.env.DB.prepare(
          "SELECT id FROM topics WHERE name = ?"
        ).bind(topicName).first();
        
        if (!topicRecord) {
          topicRecord = await c.env.DB.prepare(
            "INSERT INTO topics (name) VALUES (?) RETURNING id"
          ).bind(topicName).first();
        }
        
        // Link topic to quiz
        if (topicRecord) {
          await c.env.DB.prepare(
            "INSERT INTO quiz_topics (quiz_id, topic_id) VALUES (?, ?)"
          ).bind(quizId, topicRecord.id).run();
        }
      }
    }

    // Get existing question IDs
    const { results: existingQuestions } = await c.env.DB.prepare(
      "SELECT id FROM questions WHERE quiz_id = ?"
    ).bind(quizId).all();
    
    const existingIds = new Set(existingQuestions.map((q: any) => q.id as number));
    const newQuestionIds = new Set(questions.filter(q => q.id).map(q => q.id as number));
    
    // Delete questions that are no longer in the list
    for (const existing of existingQuestions) {
      const existingId = (existing as any).id as number;
      if (!newQuestionIds.has(existingId)) {
        await c.env.DB.prepare(
          "DELETE FROM questions WHERE id = ?"
        ).bind(existingId).run();
      }
    }

    // Update or insert questions
    for (const q of questions) {
      const questionWords = q.question_text.split(/\s+/).filter(w => w.trim()).length;
      const optionAWords = q.option_a.split(/\s+/).filter(w => w.trim()).length;
      const optionBWords = q.option_b.split(/\s+/).filter(w => w.trim()).length;
      const optionCWords = q.option_c.split(/\s+/).filter(w => w.trim()).length;
      const optionDWords = q.option_d.split(/\s+/).filter(w => w.trim()).length;
      const explanationWords = q.explanation.split(/\s+/).filter(w => w.trim()).length;
      const wordCount = questionWords + optionAWords + optionBWords + optionCWords + optionDWords + explanationWords;
      
      if (q.id && existingIds.has(q.id)) {
        // Update existing question
        await c.env.DB.prepare(
          "UPDATE questions SET question_text = ?, correct_answer = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, explanation = ?, image_url = ?, explanation_image_url = ?, word_count = ?, question_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).bind(
          q.question_text,
          q.correct_answer,
          q.option_a,
          q.option_b,
          q.option_c,
          q.option_d,
          q.explanation,
          q.image_url || null,
          q.explanation_image_url || null,
          wordCount,
          q.question_order,
          q.id
        ).run();
      } else {
        // Insert new question
        await c.env.DB.prepare(
          "INSERT INTO questions (quiz_id, question_text, correct_answer, option_a, option_b, option_c, option_d, explanation, image_url, explanation_image_url, word_count, question_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
          quizId,
          q.question_text,
          q.correct_answer,
          q.option_a,
          q.option_b,
          q.option_c,
          q.option_d,
          q.explanation,
          q.image_url || null,
          q.explanation_image_url || null,
          wordCount,
          q.question_order
        ).run();
      }
    }

    return c.json({ success: true });
  }
);

// Get all topics that are used by published quizzes
app.get("/api/topics", async (c) => {
  const { results: topics } = await c.env.DB.prepare(
    `SELECT DISTINCT t.* 
     FROM topics t
     JOIN quiz_topics qt ON t.id = qt.topic_id
     JOIN quizzes q ON qt.quiz_id = q.id
     WHERE q.status = 'published'
     ORDER BY t.name`
  ).all();
  
  return c.json(topics);
});

// Get topics with quiz counts
app.get("/api/admin/topics", authMiddleware, adminMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const admin = await c.env.DB.prepare(
    "SELECT * FROM admins WHERE email = ?"
  ).bind(user.email).first();
  
  if (!admin) {
    return c.json({ error: "Unauthorized" }, 403);
  }
  
  const { results: topics } = await c.env.DB.prepare(
    `SELECT t.id, t.name, COUNT(qt.quiz_id) as quiz_count
     FROM topics t
     LEFT JOIN quiz_topics qt ON t.id = qt.topic_id
     GROUP BY t.id, t.name
     ORDER BY t.name`
  ).all();
  
  return c.json(topics);
});

// Create or get topic
app.post(
  "/api/admin/topics",
  authMiddleware,
  zValidator("json", z.object({ name: z.string() })),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const admin = await c.env.DB.prepare(
      "SELECT * FROM admins WHERE email = ?"
    ).bind(user.email).first();
    
    if (!admin) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    
    const { name } = c.req.valid("json");
    
    // Check if topic already exists
    const existing = await c.env.DB.prepare(
      "SELECT * FROM topics WHERE name = ?"
    ).bind(name).first();
    
    if (existing) {
      return c.json(existing);
    }
    
    // Create new topic
    const result = await c.env.DB.prepare(
      "INSERT INTO topics (name) VALUES (?) RETURNING *"
    ).bind(name).first();
    
    return c.json(result);
  }
);

// Update topic
app.put(
  "/api/admin/topics/:id",
  authMiddleware,
  zValidator("json", z.object({ name: z.string() })),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const admin = await c.env.DB.prepare(
      "SELECT * FROM admins WHERE email = ?"
    ).bind(user.email).first();
    
    if (!admin) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    
    const topicId = c.req.param("id");
    const { name } = c.req.valid("json");
    
    await c.env.DB.prepare(
      "UPDATE topics SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(name, topicId).run();
    
    return c.json({ success: true });
  }
);

// Delete topic
app.delete("/api/admin/topics/:id", authMiddleware, adminMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const admin = await c.env.DB.prepare(
    "SELECT * FROM admins WHERE email = ?"
  ).bind(user.email).first();
  
  if (!admin) {
    return c.json({ error: "Unauthorized" }, 403);
  }
  
  const topicId = c.req.param("id");
  
  // Delete quiz_topics entries
  await c.env.DB.prepare(
    "DELETE FROM quiz_topics WHERE topic_id = ?"
  ).bind(topicId).run();
  
  // Delete topic
  await c.env.DB.prepare(
    "DELETE FROM topics WHERE id = ?"
  ).bind(topicId).run();
  
  return c.json({ success: true });
});

app.post(
  "/api/admin/quizzes",
  authMiddleware,
  zValidator("json", z.object({
    title: z.string(),
    difficulty: z.string(),
    topics: z.array(z.string()).optional(),
    questions: z.array(z.object({
      question_text: z.string(),
      correct_answer: z.string(),
      option_a: z.string(),
      option_b: z.string(),
      option_c: z.string(),
      option_d: z.string(),
      explanation: z.string(),
      image_url: z.string().optional().nullable(),
      explanation_image_url: z.string().optional().nullable(),
    })),
  })),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const admin = await c.env.DB.prepare(
      "SELECT * FROM admins WHERE email = ?"
    ).bind(user.email).first();
    
    if (!admin) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const { title, difficulty, topics, questions } = c.req.valid("json");

    // Generate quiz_id from title
    const baseQuizId = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    
    // Get max id to append
    const maxIdResult = await c.env.DB.prepare(
      "SELECT MAX(id) as max_id FROM quizzes"
    ).first();
    const nextId = ((maxIdResult?.max_id as number) || 0) + 1;
    const quizIdValue = `${baseQuizId}_${String(nextId).padStart(2, '0')}`;

    // Insert quiz (topic field set to empty string - we use quiz_topics table instead)
    const quizResult = await c.env.DB.prepare(
      "INSERT INTO quizzes (quiz_id, title, topic, difficulty) VALUES (?, ?, ?, ?) RETURNING id"
    ).bind(quizIdValue, title, '', difficulty).first();

    if (!quizResult) {
      return c.json({ error: "Failed to create quiz" }, 500);
    }

    const quizId = quizResult.id as number;

    // Generate and update url_slug with ID appended
    const baseSlug = generateSlug(title);
    const urlSlug = `${baseSlug}-${quizId}`;
    await c.env.DB.prepare(
      "UPDATE quizzes SET url_slug = ? WHERE id = ?"
    ).bind(urlSlug, quizId).run();

    // Handle topics
    if (topics && topics.length > 0) {
      for (const topicName of topics) {
        // Find or create topic
        let topicRecord = await c.env.DB.prepare(
          "SELECT id FROM topics WHERE name = ?"
        ).bind(topicName).first();
        
        if (!topicRecord) {
          topicRecord = await c.env.DB.prepare(
            "INSERT INTO topics (name) VALUES (?) RETURNING id"
          ).bind(topicName).first();
        }
        
        // Link topic to quiz
        if (topicRecord) {
          await c.env.DB.prepare(
            "INSERT INTO quiz_topics (quiz_id, topic_id) VALUES (?, ?)"
          ).bind(quizId, topicRecord.id).run();
        }
      }
    }

    // Insert questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      // Calculate word count: question + all 4 options + explanation
      const questionWords = q.question_text.split(/\s+/).filter(w => w.trim()).length;
      const optionAWords = q.option_a.split(/\s+/).filter(w => w.trim()).length;
      const optionBWords = q.option_b.split(/\s+/).filter(w => w.trim()).length;
      const optionCWords = q.option_c.split(/\s+/).filter(w => w.trim()).length;
      const optionDWords = q.option_d.split(/\s+/).filter(w => w.trim()).length;
      const explanationWords = q.explanation.split(/\s+/).filter(w => w.trim()).length;
      const wordCount = questionWords + optionAWords + optionBWords + optionCWords + optionDWords + explanationWords;
      
      await c.env.DB.prepare(
        "INSERT INTO questions (quiz_id, question_text, correct_answer, option_a, option_b, option_c, option_d, explanation, image_url, explanation_image_url, word_count, question_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(
        quizId,
        q.question_text,
        q.correct_answer,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.explanation,
        q.image_url || null,
        q.explanation_image_url || null,
        wordCount,
        i + 1
      ).run();
    }

    return c.json({ success: true, quizId });
  }
);

// Bulk import quizzes
app.post("/api/admin/quizzes/bulk-import", authMiddleware, adminMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const admin = await c.env.DB.prepare(
    "SELECT * FROM admins WHERE email = ?"
  ).bind(user.email).first();
  
  if (!admin) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const formData = await c.req.formData();
  const file = formData.get("file");
  const statusesJson = formData.get("statuses");

  if (!file || !(file instanceof File)) {
    return c.json({ error: "No file provided" }, 400);
  }

  // Parse statuses map (quiz_id -> status)
  let statusMap: Record<string, string> = {};
  if (statusesJson && typeof statusesJson === "string") {
    try {
      statusMap = JSON.parse(statusesJson);
    } catch (e) {
      console.error("Failed to parse statuses JSON:", e);
    }
  }

  const csvText = await file.text();
  
  return new Promise((resolve) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        const quizMap = new Map<string, any[]>();
        const details: string[] = [];
        let created = 0;
        let skipped = 0;
        let errors = 0;

        // Group by quiz_id
        rows.forEach((row) => {
          if (!quizMap.has(row.quiz_id)) {
            quizMap.set(row.quiz_id, []);
          }
          quizMap.get(row.quiz_id)!.push(row);
        });

        // Process each quiz
        for (const [csvQuizId, questions] of quizMap.entries()) {
          try {
            // Check if quiz_id already exists
            const existing = await c.env.DB.prepare(
              "SELECT id FROM quizzes WHERE quiz_id = ?"
            ).bind(csvQuizId).first();

            if (existing) {
              skipped++;
              details.push(`Skipped: "${questions[0].quiz_title}" (quiz_id ${csvQuizId} already exists)`);
              continue;
            }

            // Get status for this quiz (default to published if not specified)
            const quizStatus = statusMap[csvQuizId] || 'published';
            
            // Create quiz with the quiz_id from CSV (topic field set to empty string - we use quiz_topics table instead)
            const quizResult = await c.env.DB.prepare(
              "INSERT INTO quizzes (quiz_id, title, topic, difficulty, status) VALUES (?, ?, ?, ?, ?) RETURNING id"
            ).bind(
              csvQuizId,
              questions[0].quiz_title,
              '',
              questions[0].difficulty,
              quizStatus
            ).first();

            if (!quizResult) {
              errors++;
              details.push(`Error: "${questions[0].quiz_title}" - Failed to create quiz`);
              continue;
            }

            const newQuizId = quizResult.id as number;

            // Generate and update url_slug with ID appended
            const baseSlug = generateSlug(questions[0].quiz_title);
            const urlSlug = `${baseSlug}-${newQuizId}`;
            await c.env.DB.prepare(
              "UPDATE quizzes SET url_slug = ? WHERE id = ?"
            ).bind(urlSlug, newQuizId).run();

            // Handle topics from CSV (comma-separated in "topics" column)
            if (questions[0].topics && questions[0].topics.trim()) {
              const topicNames = questions[0].topics.split(',').map((t: string) => t.trim()).filter((t: string) => t);
              
              for (const topicName of topicNames) {
                // Find or create topic
                let topicRecord = await c.env.DB.prepare(
                  "SELECT id FROM topics WHERE name = ?"
                ).bind(topicName).first();
                
                if (!topicRecord) {
                  topicRecord = await c.env.DB.prepare(
                    "INSERT INTO topics (name) VALUES (?) RETURNING id"
                  ).bind(topicName).first();
                }
                
                // Link topic to quiz
                if (topicRecord) {
                  await c.env.DB.prepare(
                    "INSERT INTO quiz_topics (quiz_id, topic_id) VALUES (?, ?)"
                  ).bind(newQuizId, topicRecord.id).run();
                }
              }
            }

            // Insert questions
            for (let i = 0; i < questions.length; i++) {
              const q = questions[i];
              
              // Calculate word count
              const questionWords = q.question_text.split(/\s+/).filter((w: string) => w.trim()).length;
              const optionAWords = q.option_a.split(/\s+/).filter((w: string) => w.trim()).length;
              const optionBWords = q.option_b.split(/\s+/).filter((w: string) => w.trim()).length;
              const optionCWords = q.option_c.split(/\s+/).filter((w: string) => w.trim()).length;
              const optionDWords = q.option_d.split(/\s+/).filter((w: string) => w.trim()).length;
              const explanationWords = q.explanation.split(/\s+/).filter((w: string) => w.trim()).length;
              const wordCount = questionWords + optionAWords + optionBWords + optionCWords + optionDWords + explanationWords;

              await c.env.DB.prepare(
                "INSERT INTO questions (quiz_id, question_text, correct_answer, option_a, option_b, option_c, option_d, explanation, image_url, explanation_image_url, word_count, question_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
              ).bind(
                newQuizId,
                q.question_text,
                q.correct_answer,
                q.option_a,
                q.option_b,
                q.option_c,
                q.option_d,
                q.explanation,
                q.image_url || null,
                q.explanation_image_url || null,
                wordCount,
                parseInt(q.question_number) || i + 1
              ).run();
            }

            created++;
            details.push(`Created: "${questions[0].quiz_title}" (${questions.length} questions)`);
          } catch (error) {
            errors++;
            details.push(`Error: "${questions[0].quiz_title}" - ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        resolve(c.json({
          created,
          skipped,
          errors,
          details
        }));
      }
    });
  });
});

// Bulk export selected quizzes - optimized
app.post(
  "/api/admin/quizzes/bulk-export",
  authMiddleware,
  zValidator("json", z.object({
    quiz_ids: z.array(z.number())
  })),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const admin = await c.env.DB.prepare(
      "SELECT * FROM admins WHERE email = ?"
    ).bind(user.email).first();
    
    if (!admin) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const { quiz_ids } = c.req.valid("json");
    
    if (quiz_ids.length === 0) {
      return c.json({ rows: [] });
    }

    // Fetch all quizzes in one query
    const { results: quizzes } = await c.env.DB.prepare(
      `SELECT id, quiz_id, title, topic, difficulty, status, created_at, updated_at, min_access_level, url_slug FROM quizzes WHERE id IN (${quiz_ids.map(() => '?').join(',')}) ORDER BY id`
    ).bind(...quiz_ids).all();

    // Fetch all topics for these quizzes in one query
    const { results: allTopicRows } = await c.env.DB.prepare(
      `SELECT qt.quiz_id, t.name 
       FROM quiz_topics qt 
       JOIN topics t ON qt.topic_id = t.id 
       WHERE qt.quiz_id IN (${quiz_ids.map(() => '?').join(',')})`
    ).bind(...quiz_ids).all();

    // Group topics by quiz_id
    const topicsByQuiz = new Map<number, string[]>();
    allTopicRows.forEach((row: any) => {
      if (!topicsByQuiz.has(row.quiz_id)) {
        topicsByQuiz.set(row.quiz_id, []);
      }
      topicsByQuiz.get(row.quiz_id)!.push(row.name);
    });

    // Fetch all questions for these quizzes in one query
    const { results: allQuestions } = await c.env.DB.prepare(
      `SELECT * FROM questions 
       WHERE quiz_id IN (${quiz_ids.map(() => '?').join(',')}) 
       ORDER BY quiz_id, question_order`
    ).bind(...quiz_ids).all();

    // Build rows
    const rows: any[] = [];
    
    for (const quiz of quizzes) {
      const topics = (topicsByQuiz.get(quiz.id as number) || []).join(', ');
      const questions = allQuestions.filter((q: any) => q.quiz_id === quiz.id);

      questions.forEach((q: any, index: number) => {
        rows.push({
          quiz_id: quiz.quiz_id || `${String(quiz.title).toLowerCase().replace(/\s+/g, '_')}_${String(quiz.id).padStart(2, '0')}`,
          quiz_title: quiz.title,
          difficulty: quiz.difficulty,
          topics: topics,
          question_number: index + 1,
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer,
          explanation: q.explanation
        });
      });
    }

    return c.json({ rows });
  }
);

// Delete quiz
app.delete("/api/admin/quizzes/:id", authMiddleware, adminMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const admin = await c.env.DB.prepare(
    "SELECT * FROM admins WHERE email = ?"
  ).bind(user.email).first();
  
  if (!admin) {
    return c.json({ error: "Unauthorized" }, 403);
  }
  
  const quizId = c.req.param("id");
  
  // Delete quiz_topics entries
  await c.env.DB.prepare(
    "DELETE FROM quiz_topics WHERE quiz_id = ?"
  ).bind(quizId).run();
  
  // Delete questions
  await c.env.DB.prepare(
    "DELETE FROM questions WHERE quiz_id = ?"
  ).bind(quizId).run();
  
  // Delete quiz attempts
  await c.env.DB.prepare(
    "DELETE FROM quiz_attempts WHERE quiz_id = ?"
  ).bind(quizId).run();
  
  // Delete quiz
  await c.env.DB.prepare(
    "DELETE FROM quizzes WHERE id = ?"
  ).bind(quizId).run();
  
  return c.json({ success: true });
});

// Get FAQs for a specific topic
app.get("/api/topic/:slug/faqs", async (c) => {
  const slug = c.req.param("slug");

  try {
    const { results: faqs } = await c.env.DB.prepare(
      `SELECT question, answer 
       FROM topic_faqs 
       WHERE topic_slug = ? 
       ORDER BY position`
    ).bind(slug).all();

    return c.json(faqs);
  } catch (error) {
    console.error("Error fetching topic FAQs:", error);
    return c.json({ error: "Failed to fetch FAQs" }, 500);
  }
});

// Get content for a specific topic
app.get("/api/topic/:slug/content", async (c) => {
  const slug = c.req.param("slug");

  try {
    const content = await c.env.DB.prepare(
      `SELECT description, why_learn, what_youll_learn, best_for 
       FROM topic_content 
       WHERE topic_slug = ?`
    ).bind(slug).first();

    if (!content) {
      return c.json({ error: "Topic content not found" }, 404);
    }

    return c.json({
      description: content.description,
      whyLearn: content.why_learn,
      whatYoullLearn: content.what_youll_learn,
      bestFor: content.best_for
    });
  } catch (error) {
    console.error("Error fetching topic content:", error);
    return c.json({ error: "Failed to fetch content" }, 500);
  }
});

// Get difficulty content
app.get("/api/difficulty/:slug/content", async (c) => {
  const slug = c.req.param("slug");

  try {
    const content = await c.env.DB.prepare(
      `SELECT difficulty, cefr_level, title, description, what_youll_learn, why_this_level, how_to_progress, meta_description 
       FROM difficulty_content 
       WHERE url_slug = ?`
    ).bind(slug).first();

    if (!content) {
      return c.json({ error: "Difficulty content not found" }, 404);
    }

    return c.json({
      difficulty: content.difficulty,
      cefrLevel: content.cefr_level,
      title: content.title,
      description: content.description,
      whatYoullLearn: content.what_youll_learn,
      whyThisLevel: content.why_this_level,
      howToProgress: content.how_to_progress,
      metaDescription: content.meta_description,
    });
  } catch (error) {
    console.error("Error fetching difficulty content:", error);
    return c.json({ error: "Failed to fetch content" }, 500);
  }
});

// Get related topics for a difficulty level
app.get("/api/difficulty/:slug/related", async (c) => {
  const slug = c.req.param("slug");

  try {
    const { results: relations } = await c.env.DB.prepare(
      `SELECT to_topic_slug 
       FROM difficulty_relations 
       WHERE from_difficulty_slug = ? 
       ORDER BY position`
    ).bind(slug).all();

    return c.json(relations.map(r => r.to_topic_slug));
  } catch (error) {
    console.error("Error fetching related topics for difficulty:", error);
    return c.json({ error: "Failed to fetch related topics" }, 500);
  }
});

// Get related topics for a specific topic
app.get("/api/topic/:slug/related", async (c) => {
  const slug = c.req.param("slug");

  try {
    const { results: relations } = await c.env.DB.prepare(
      `SELECT to_topic_slug 
       FROM topic_relations 
       WHERE from_topic_slug = ? 
       ORDER BY position`
    ).bind(slug).all();

    return c.json(relations.map(r => r.to_topic_slug));
  } catch (error) {
    console.error("Error fetching related topics:", error);
    return c.json({ error: "Failed to fetch related topics" }, 500);
  }
});

// Topic quizzes endpoint - get all quizzes for a specific topic
app.get("/api/topic/:slug/quizzes", async (c) => {
  const topicSlug = c.req.param("slug");
  
  // Convert slug to topic name (e.g., "harry-potter" -> "Harry Potter")
  const topicName = topicSlug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Check if user is authenticated to include completion status
  let userId: string | null = null;
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const userResponse = await fetch(`${c.env.MOCHA_USERS_SERVICE_API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (userResponse.ok) {
        const userData: any = await userResponse.json();
        userId = userData.id;
      }
    } catch (error) {
      // User not authenticated, continue as guest
    }
  }
  
  // Fetch quizzes for this topic using quiz_topics junction table
  const { results: quizzes } = await c.env.DB.prepare(
    `SELECT 
      q.id,
      q.title,
      q.topic,
      q.difficulty,
      q.min_access_level,
      q.url_slug,
      q.created_at,
      q.updated_at,
      COUNT(qu.id) as question_count,
      COALESCE(SUM(qu.word_count), 0) as word_count
    FROM quizzes q
    LEFT JOIN questions qu ON q.id = qu.quiz_id
    WHERE q.status = 'published' AND q.id IN (
      SELECT qt.quiz_id FROM quiz_topics qt
      JOIN topics t ON qt.topic_id = t.id
      WHERE LOWER(t.name) = LOWER(?)
    )
    GROUP BY q.id, q.title, q.topic, q.difficulty, q.min_access_level, q.url_slug, q.created_at, q.updated_at
    ORDER BY q.id DESC`
  ).bind(topicName).all();
  
  // If user is authenticated, get completion status
  if (userId && quizzes.length > 0) {
    const quizIds = quizzes.map((q: any) => q.id);
    const { results: completions } = await c.env.DB.prepare(
      `SELECT DISTINCT quiz_id FROM quiz_attempts WHERE user_id = ? AND quiz_id IN (${quizIds.map(() => '?').join(',')})`
    ).bind(userId, ...quizIds).all();
    
    const completedIds = new Set(completions.map((c: any) => c.quiz_id));
    quizzes.forEach((quiz: any) => {
      quiz.is_completed = completedIds.has(quiz.id);
    });
  }
  
  return c.json(quizzes);
});

// Track PWA installation
app.post("/api/track-pwa-install", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  // Update user_progress to mark PWA as installed
  await c.env.DB.prepare(
    `UPDATE user_progress 
     SET pwa_installed = 1, updated_at = CURRENT_TIMESTAMP 
     WHERE user_id = ? AND pwa_installed = 0`
  ).bind(user.id).run();
  
  return c.json({ success: true });
});

// Contact form submission
app.post(
  "/api/contact",
  authMiddleware,
  zValidator("json", z.object({
    subject: z.string(),
    message: z.string(),
  })),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const { subject, message } = c.req.valid("json");
    
    // Store contact message in database
    await c.env.DB.prepare(
      "INSERT INTO contact_messages (user_id, user_email, subject, message) VALUES (?, ?, ?, ?)"
    ).bind(user.id, user.email, subject, message).run();
    
    // In a production app, you might send an email notification here
    
    return c.json({ success: true });
  }
);

// Admin messages route
app.get("/api/admin/messages", authMiddleware, adminMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const admin = await c.env.DB.prepare(
    "SELECT * FROM admins WHERE email = ?"
  ).bind(user.email).first();
  
  if (!admin) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const { results: messages } = await c.env.DB.prepare(
    "SELECT * FROM contact_messages ORDER BY created_at DESC"
  ).all();

  return c.json(messages);
});

// Delete message
app.delete("/api/admin/messages/:id", authMiddleware, adminMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const admin = await c.env.DB.prepare(
    "SELECT * FROM admins WHERE email = ?"
  ).bind(user.email).first();
  
  if (!admin) {
    return c.json({ error: "Unauthorized" }, 403);
  }
  
  const id = c.req.param("id");
  
  await c.env.DB.prepare(
    "DELETE FROM contact_messages WHERE id = ?"
  ).bind(id).run();
  
  return c.json({ success: true });
});

// External reading routes
app.post(
  "/api/external-reading",
  authMiddleware,
  zValidator("json", z.object({
    words_read: z.number().positive(),
    source_type: z.string(),
    details: z.string().optional(),
    reading_date: z.string(),
  })),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const { words_read, source_type, details, reading_date } = c.req.valid("json");
    
    // Insert external reading record
    await c.env.DB.prepare(
      "INSERT INTO external_reading (user_id, words_read, source_type, details, reading_date) VALUES (?, ?, ?, ?, ?)"
    ).bind(user.id, words_read, source_type, details || null, reading_date).run();
    
    // Update user progress
    const progress = await c.env.DB.prepare(
      "SELECT * FROM user_progress WHERE user_id = ?"
    ).bind(user.id).first();
    
    if (!progress) {
      // Create new progress
      await c.env.DB.prepare(
        "INSERT INTO user_progress (user_id, daily_words_read, total_words_read, current_streak, longest_streak, total_quizzes_completed, last_activity_date) VALUES (?, ?, ?, 1, 1, 0, ?)"
      ).bind(user.id, words_read, words_read, reading_date).run();
    } else {
      const today = new Date().toISOString().split('T')[0];
      const lastActivityDate = progress.last_activity_date as string | null;
      
      let newDailyWords = words_read;
      let newStreak = (progress.current_streak as number) || 0;
      
      if (reading_date === today && lastActivityDate === today) {
        // Same day as last activity - add to daily words
        newDailyWords = ((progress.daily_words_read as number) || 0) + words_read;
      } else if (reading_date === today && lastActivityDate !== today) {
        // New day
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (lastActivityDate === yesterdayStr) {
          // Consecutive day - increment streak
          newStreak = ((progress.current_streak as number) || 0) + 1;
        } else {
          // Streak broken - reset to 1
          newStreak = 1;
        }
      } else if (reading_date !== today) {
        // Backdating - don't update streak or daily words, just total
        const newTotalWords = ((progress.total_words_read as number) || 0) + words_read;
        await c.env.DB.prepare(
          "UPDATE user_progress SET total_words_read = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
        ).bind(newTotalWords, user.id).run();
        
        return c.json({ success: true });
      }
      
      const newLongestStreak = Math.max(newStreak, (progress.longest_streak as number) || 0);
      const newTotalWords = ((progress.total_words_read as number) || 0) + words_read;
      
      await c.env.DB.prepare(
        "UPDATE user_progress SET daily_words_read = ?, total_words_read = ?, current_streak = ?, longest_streak = ?, last_activity_date = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
      ).bind(newDailyWords, newTotalWords, newStreak, newLongestStreak, reading_date, user.id).run();
    }
    
    return c.json({ success: true });
  }
);

// Home rows routes
app.get("/api/home-rows", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM home_rows WHERE is_active = 1 ORDER BY display_order"
  ).all();
  
  return c.json(results);
});

app.get("/api/admin/home-rows", authMiddleware, adminMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const admin = await c.env.DB.prepare(
    "SELECT * FROM admins WHERE email = ?"
  ).bind(user.email).first();
  
  if (!admin) {
    return c.json({ error: "Unauthorized" }, 403);
  }
  
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM home_rows ORDER BY display_order"
  ).all();
  
  return c.json(results);
});

app.post(
  "/api/admin/home-rows",
  authMiddleware,
  zValidator("json", z.object({
    title: z.string(),
    topic_tag: z.string(),
  })),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const admin = await c.env.DB.prepare(
      "SELECT * FROM admins WHERE email = ?"
    ).bind(user.email).first();
    
    if (!admin) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    
    const { title, topic_tag } = c.req.valid("json");
    
    // Get max display_order
    const maxOrder = await c.env.DB.prepare(
      "SELECT MAX(display_order) as max_order FROM home_rows"
    ).first();
    
    const nextOrder = ((maxOrder?.max_order as number) || 0) + 1;
    
    const result = await c.env.DB.prepare(
      "INSERT INTO home_rows (title, topic_tag, display_order) VALUES (?, ?, ?) RETURNING *"
    ).bind(title, topic_tag, nextOrder).first();
    
    return c.json(result);
  }
);

app.put(
  "/api/admin/home-rows/:id",
  authMiddleware,
  zValidator("json", z.object({
    title: z.string(),
    topic_tag: z.string(),
    is_active: z.boolean().optional(),
  })),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const admin = await c.env.DB.prepare(
      "SELECT * FROM admins WHERE email = ?"
    ).bind(user.email).first();
    
    if (!admin) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    
    const id = c.req.param("id");
    const { title, topic_tag, is_active } = c.req.valid("json");
    
    await c.env.DB.prepare(
      "UPDATE home_rows SET title = ?, topic_tag = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(title, topic_tag, is_active !== undefined ? (is_active ? 1 : 0) : 1, id).run();
    
    return c.json({ success: true });
  }
);

app.delete("/api/admin/home-rows/:id", authMiddleware, adminMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const admin = await c.env.DB.prepare(
    "SELECT * FROM admins WHERE email = ?"
  ).bind(user.email).first();
  
  if (!admin) {
    return c.json({ error: "Unauthorized" }, 403);
  }
  
  const id = c.req.param("id");
  
  await c.env.DB.prepare(
    "DELETE FROM home_rows WHERE id = ?"
  ).bind(id).run();
  
  return c.json({ success: true });
});

app.put(
  "/api/admin/home-rows/reorder",
  authMiddleware,
  zValidator("json", z.object({
    rows: z.array(z.object({
      id: z.number(),
      display_order: z.number(),
    })),
  })),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const admin = await c.env.DB.prepare(
      "SELECT * FROM admins WHERE email = ?"
    ).bind(user.email).first();
    
    if (!admin) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    
    const { rows } = c.req.valid("json");
    
    // Update display_order for each row
    for (const row of rows) {
      await c.env.DB.prepare(
        "UPDATE home_rows SET display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).bind(row.display_order, row.id).run();
    }
    
    return c.json({ success: true });
  }
);

// Question feedback routes
app.post(
  "/api/question-feedback",
  authMiddleware,
  zValidator("json", z.object({
    question_id: z.number(),
    quiz_id: z.number(),
    rating: z.enum(["up", "down"]),
    reason: z.string().optional(),
    comment: z.string().optional(),
  })),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { question_id, quiz_id, rating, reason, comment } = c.req.valid("json");

    await c.env.DB.prepare(
      "INSERT INTO question_feedback (user_id, question_id, quiz_id, rating, reason, comment) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(user.id, question_id, quiz_id, rating, reason || null, comment || null).run();

    return c.json({ success: true });
  }
);

app.post(
  "/api/question-reports",
  authMiddleware,
  zValidator("json", z.object({
    question_id: z.number(),
    quiz_id: z.number(),
    issue_type: z.string(),
    description: z.string().optional(),
  })),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { question_id, quiz_id, issue_type, description } = c.req.valid("json");

    await c.env.DB.prepare(
      "INSERT INTO question_reports (user_id, question_id, quiz_id, issue_type, description) VALUES (?, ?, ?, ?, ?)"
    ).bind(user.id, question_id, quiz_id, issue_type, description || null).run();

    return c.json({ success: true });
  }
);

// Admin feedback routes
app.get("/api/admin/question-feedback", authMiddleware, adminMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const admin = await c.env.DB.prepare(
    "SELECT * FROM admins WHERE email = ?"
  ).bind(user.email).first();
  
  if (!admin) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const { results: feedback } = await c.env.DB.prepare(
    `SELECT 
      qf.*,
      q.question_text,
      qu.title as quiz_title
     FROM question_feedback qf
     JOIN questions q ON qf.question_id = q.id
     JOIN quizzes qu ON qf.quiz_id = qu.id
     ORDER BY qf.created_at DESC`
  ).all();

  const { results: reports } = await c.env.DB.prepare(
    `SELECT 
      qr.*,
      q.question_text,
      qu.title as quiz_title
     FROM question_reports qr
     JOIN questions q ON qr.question_id = q.id
     JOIN quizzes qu ON qr.quiz_id = qu.id
     ORDER BY qr.created_at DESC`
  ).all();

  return c.json({ feedback, reports });
});

// Delete question feedback
app.delete("/api/admin/question-feedback/:id", authMiddleware, adminMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const admin = await c.env.DB.prepare(
    "SELECT * FROM admins WHERE email = ?"
  ).bind(user.email).first();
  
  if (!admin) {
    return c.json({ error: "Unauthorized" }, 403);
  }
  
  const id = c.req.param("id");
  
  await c.env.DB.prepare(
    "DELETE FROM question_feedback WHERE id = ?"
  ).bind(id).run();
  
  return c.json({ success: true });
});

// Delete question report
app.delete("/api/admin/question-reports/:id", authMiddleware, adminMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const admin = await c.env.DB.prepare(
    "SELECT * FROM admins WHERE email = ?"
  ).bind(user.email).first();
  
  if (!admin) {
    return c.json({ error: "Unauthorized" }, 403);
  }
  
  const id = c.req.param("id");
  
  await c.env.DB.prepare(
    "DELETE FROM question_reports WHERE id = ?"
  ).bind(id).run();
  
  return c.json({ success: true });
});

// Blog endpoints
app.get("/api/blog", async (c) => {
  try {
    const { results: posts } = await c.env.DB.prepare(
      `SELECT id, slug, title, excerpt, author, published_at 
       FROM blog_posts 
       WHERE status = 'published'
       ORDER BY published_at DESC`
    ).all();

    return c.json(posts);
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return c.json({ error: "Failed to fetch blog posts" }, 500);
  }
});

app.get("/api/blog/:slug", async (c) => {
  const slug = c.req.param("slug");

  try {
    const post = await c.env.DB.prepare(
      `SELECT id, slug, title, excerpt, content, author, meta_description, published_at 
       FROM blog_posts 
       WHERE slug = ? AND status = 'published'`
    ).bind(slug).first();

    if (!post) {
      return c.json({ error: "Blog post not found" }, 404);
    }

    return c.json(post);
  } catch (error) {
    console.error("Error fetching blog post:", error);
    return c.json({ error: "Failed to fetch blog post" }, 500);
  }
});

// Sitemap endpoint
app.get("/sitemap.xml", generateSitemap);
app.get("/sitemap-blog.xml", generateBlogSitemap);

export default app;
