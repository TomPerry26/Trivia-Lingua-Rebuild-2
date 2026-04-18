import { createClient } from "../../shared/supabase-client";
import { validateSupabaseEnvironment } from "../../shared/env-validation";

const {
  VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY,
  VITE_DEPLOYMENT_TIER,
  VITE_VERCEL_ENV,
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
});

export const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, {
  auth: {
    flowType: "pkce",
    detectSessionInUrl: false,
  },
});
