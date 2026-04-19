import { createClient } from "../../shared/supabase-client";
import { validateSupabaseEnvironment } from "../../shared/env-validation";

const {
  VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY,
  VITE_DEPLOYMENT_TIER,
  VITE_VERCEL_ENV,
  VITE_SUPABASE_PREVIEW_HOST,
  VITE_SUPABASE_PRODUCTION_HOST,
} = import.meta.env;

validateSupabaseEnvironment({
  context: "client",
  requiredVars: [
    ["VITE_SUPABASE_URL", VITE_SUPABASE_URL],
    ["VITE_SUPABASE_ANON_KEY", VITE_SUPABASE_ANON_KEY],
  ],
  supabaseUrl: VITE_SUPABASE_URL,
  supabaseUrlVarName: "VITE_SUPABASE_URL",
  deploymentTier: VITE_DEPLOYMENT_TIER,
  deploymentTierSourceName: "VITE_DEPLOYMENT_TIER",
  vercelEnv: VITE_VERCEL_ENV,
  vercelEnvSourceName: "VITE_VERCEL_ENV",
  stagingHost: VITE_SUPABASE_PREVIEW_HOST,
  stagingHostVarName: "VITE_SUPABASE_PREVIEW_HOST",
  productionHost: VITE_SUPABASE_PRODUCTION_HOST,
  productionHostVarName: "VITE_SUPABASE_PRODUCTION_HOST",
});

export const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);
