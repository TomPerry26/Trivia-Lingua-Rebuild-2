import { createClient } from "../shared/supabase-client.js";
import { assertSupabaseHostMatchesDeploymentTier } from "../shared/supabase-tier-assertions.js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const deploymentTier = process.env.DEPLOYMENT_TIER ?? process.env.VERCEL_ENV;
const supabaseStagingHost = process.env.SUPABASE_STAGING_HOST;
const supabaseProductionHost = process.env.SUPABASE_PRODUCTION_HOST;

const missingServerEnvVars = [
  ["SUPABASE_URL", supabaseUrl],
  ["SUPABASE_ANON_KEY", supabaseAnonKey],
].filter(([, value]) => !value);

if (missingServerEnvVars.length > 0) {
  const missingNames = missingServerEnvVars.map(([name]) => name).join(", ");
  throw new Error(`Missing required Supabase server environment variable(s): ${missingNames}.`);
}

const resolvedSupabaseUrl = supabaseUrl as string;
const resolvedSupabaseAnonKey = supabaseAnonKey as string;

assertSupabaseHostMatchesDeploymentTier({
  deploymentTierRaw: deploymentTier,
  supabaseUrl: resolvedSupabaseUrl,
  stagingHost: supabaseStagingHost,
  productionHost: supabaseProductionHost,
  context: "server",
  sourceName: process.env.DEPLOYMENT_TIER ? "DEPLOYMENT_TIER" : "VERCEL_ENV",
});

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
