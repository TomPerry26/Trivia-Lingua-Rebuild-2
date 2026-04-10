import { supabaseAdmin } from "../../api/_lib/supabase";

export async function listTopics() {
  const { data, error } = await supabaseAdmin
    .from("topics")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listBlogPosts() {
  const { data, error } = await supabaseAdmin
    .from("blog_posts")
    .select("id, slug, title, excerpt, author, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function listAdminMessages() {
  const { data, error } = await supabaseAdmin
    .from("user_messages")
    .select("id, user_id, user_email, subject, message, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function listAdminFeedback() {
  const [feedbackRes, reportsRes] = await Promise.all([
    supabaseAdmin
      .from("question_feedback")
      .select("id, user_id, question_id, quiz_id, rating, reason, comment, created_at, question_text, quiz_title")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("question_reports")
      .select("id, user_id, question_id, quiz_id, issue_type, description, created_at, question_text, quiz_title")
      .order("created_at", { ascending: false }),
  ]);

  if (feedbackRes.error) throw feedbackRes.error;
  if (reportsRes.error) throw reportsRes.error;

  return {
    feedback: feedbackRes.data ?? [],
    reports: reportsRes.data ?? [],
  };
}
