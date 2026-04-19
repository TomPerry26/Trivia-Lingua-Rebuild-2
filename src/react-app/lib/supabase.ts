import { createClient } from "../../shared/supabase-client";
import { validateSupabaseEnvironment } from "../../shared/env-validation";

const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = import.meta.env;

validateSupabaseEnvironment({
  context: "client",
  requiredVars: [
    ["VITE_SUPABASE_URL", VITE_SUPABASE_URL],
    ["VITE_SUPABASE_ANON_KEY", VITE_SUPABASE_ANON_KEY],
  ],
  supabaseUrlVarName: "VITE_SUPABASE_URL",
});

export const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);
