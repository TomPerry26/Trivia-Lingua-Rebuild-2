import { createClient } from "../shared/supabase-client.js";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const missingServerEnvVars = [
  ["SUPABASE_URL (or VITE_SUPABASE_URL)", supabaseUrl],
  ["SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY)", supabaseAnonKey],
].filter(([, value]) => !value);

if (missingServerEnvVars.length > 0) {
  const missingNames = missingServerEnvVars.map(([name]) => name).join(", ");
  throw new Error(`Missing required Supabase server environment variable(s): ${missingNames}.`);
}

const resolvedSupabaseUrl = supabaseUrl as string;
const resolvedSupabaseAnonKey = supabaseAnonKey as string;

export const supabaseAnon = createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey);

export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(resolvedSupabaseUrl, supabaseServiceRoleKey)
  : supabaseAnon;
