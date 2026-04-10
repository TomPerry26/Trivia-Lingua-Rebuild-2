import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const missingServerEnvVars = [
  ["SUPABASE_URL", supabaseUrl],
  ["SUPABASE_ANON_KEY", supabaseAnonKey],
].filter(([, value]) => !value);

if (missingServerEnvVars.length > 0) {
  const missingNames = missingServerEnvVars.map(([name]) => name).join(", ");
  throw new Error(`Missing required Supabase server environment variable(s): ${missingNames}.`);
}

export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : supabaseAnon;
