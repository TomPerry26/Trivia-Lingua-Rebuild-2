import { createClient } from "../shared/supabase-client.js";
import { validateSupabaseEnvironment } from "../shared/env-validation.js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

validateSupabaseEnvironment({
  context: "server",
  requiredVars: [
    ["SUPABASE_URL", supabaseUrl],
    ["SUPABASE_ANON_KEY", supabaseAnonKey],
  ],
  supabaseUrlVarName: "SUPABASE_URL",
});

const resolvedSupabaseUrl = supabaseUrl as string;
const resolvedSupabaseAnonKey = supabaseAnonKey as string;

export const supabaseAnon = createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey);

const isVercelPreview = process.env.VERCEL_ENV === "preview";

if (!supabaseServiceRoleKey && !isVercelPreview) {
  throw new Error("Missing required Supabase server environment variable: SUPABASE_SERVICE_ROLE_KEY.");
}

if (!supabaseServiceRoleKey && isVercelPreview) {
  console.warn("SUPABASE_SERVICE_ROLE_KEY is missing in preview. Falling back to SUPABASE_ANON_KEY.");
}

export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(resolvedSupabaseUrl, supabaseServiceRoleKey)
  : supabaseAnon;

export const createSupabaseUserClient = (accessToken: string) =>
  createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
