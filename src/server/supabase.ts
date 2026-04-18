import { createClient } from "../shared/supabase-client.js";
import {
  assertSupabaseKeyMatchesUrlHost,
  assertSupabaseUrlsShareHost,
  validateSupabaseEnvironment,
} from "../shared/env-validation.js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const viteSupabaseUrl = process.env.VITE_SUPABASE_URL;
const viteSupabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

validateSupabaseEnvironment({
  context: "server",
  requiredVars: [
    ["SUPABASE_URL", supabaseUrl],
    ["SUPABASE_ANON_KEY", supabaseAnonKey],
  ],
  supabaseUrl,
  supabaseUrlVarName: "SUPABASE_URL",
  deploymentTier: process.env.DEPLOYMENT_TIER,
  deploymentTierSourceName: "DEPLOYMENT_TIER",
  vercelEnv: process.env.VERCEL_ENV,
  vercelEnvSourceName: "VERCEL_ENV",
});

const resolvedSupabaseUrl = supabaseUrl as string;
const resolvedSupabaseAnonKey = supabaseAnonKey as string;

if (viteSupabaseUrl) {
  assertSupabaseUrlsShareHost({
    context: "server",
    primaryUrl: resolvedSupabaseUrl,
    primaryVarName: "SUPABASE_URL",
    secondaryUrl: viteSupabaseUrl,
    secondaryVarName: "VITE_SUPABASE_URL",
  });
}

if (viteSupabaseAnonKey && viteSupabaseAnonKey !== resolvedSupabaseAnonKey) {
  throw new Error(
    '[env-validation:server] SUPABASE_ANON_KEY and VITE_SUPABASE_ANON_KEY must match to avoid auth token validation drift.',
  );
}

assertSupabaseKeyMatchesUrlHost({
  context: "server",
  supabaseUrl: resolvedSupabaseUrl,
  supabaseUrlVarName: "SUPABASE_URL",
  supabaseKey: resolvedSupabaseAnonKey,
  supabaseKeyVarName: "SUPABASE_ANON_KEY",
});

export const supabaseAnon = createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey);

if (!supabaseServiceRoleKey) {
  throw new Error("Missing required Supabase server environment variable: SUPABASE_SERVICE_ROLE_KEY.");
}

assertSupabaseKeyMatchesUrlHost({
  context: "server",
  supabaseUrl: resolvedSupabaseUrl,
  supabaseUrlVarName: "SUPABASE_URL",
  supabaseKey: supabaseServiceRoleKey,
  supabaseKeyVarName: "SUPABASE_SERVICE_ROLE_KEY",
});

export const supabaseAdmin = createClient(resolvedSupabaseUrl, supabaseServiceRoleKey);

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
