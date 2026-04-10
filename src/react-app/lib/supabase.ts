import { createClient } from "@supabase/supabase-js";

const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = import.meta.env;

const missingClientEnvVars = [
  ["VITE_SUPABASE_URL", VITE_SUPABASE_URL],
  ["VITE_SUPABASE_ANON_KEY", VITE_SUPABASE_ANON_KEY],
].filter(([, value]) => !value);

if (missingClientEnvVars.length > 0) {
  const missingNames = missingClientEnvVars.map(([name]) => name).join(", ");
  throw new Error(
    `Missing required Supabase client environment variable(s): ${missingNames}. Add them to your .env file before starting the app.`,
  );
}

export const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
