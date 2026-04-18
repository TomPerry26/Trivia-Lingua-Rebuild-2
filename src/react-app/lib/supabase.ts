import { createClient } from "../../shared/supabase-client";
import { assertSupabaseHostMatchesDeploymentTier } from "../../shared/supabase-tier-assertions";

const {
  VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY,
  VITE_DEPLOYMENT_TIER,
  VITE_VERCEL_ENV,
  VITE_SUPABASE_STAGING_HOST,
  VITE_SUPABASE_PRODUCTION_HOST,
} = import.meta.env;

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

assertSupabaseHostMatchesDeploymentTier({
  deploymentTierRaw: VITE_DEPLOYMENT_TIER ?? VITE_VERCEL_ENV,
  supabaseUrl: VITE_SUPABASE_URL,
  stagingHost: VITE_SUPABASE_STAGING_HOST,
  productionHost: VITE_SUPABASE_PRODUCTION_HOST,
  context: "client",
  sourceName: VITE_DEPLOYMENT_TIER ? "VITE_DEPLOYMENT_TIER" : "VITE_VERCEL_ENV",
});

export const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
