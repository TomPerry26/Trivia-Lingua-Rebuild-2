import assert from "node:assert/strict";
import test from "node:test";

import { parseDeploymentTier, validateSupabaseEnvironment } from "./env-validation.ts";

const baseOptions = {
  context: "server" as const,
  requiredVars: [
    ["SUPABASE_URL", "https://example.supabase.co"],
    ["SUPABASE_ANON_KEY", "anon-key"],
  ] as const,
  supabaseUrl: "https://preview-project.supabase.co",
  supabaseUrlVarName: "SUPABASE_URL",
  deploymentTier: "preview",
  deploymentTierSourceName: "DEPLOYMENT_TIER",
  vercelEnv: "preview",
  vercelEnvSourceName: "VERCEL_ENV",
};

test("parseDeploymentTier normalizes aliases", () => {
  assert.equal(parseDeploymentTier("preview"), "staging");
  assert.equal(parseDeploymentTier("STAGING"), "staging");
  assert.equal(parseDeploymentTier("prod"), "production");
  assert.equal(parseDeploymentTier("production"), "production");
  assert.equal(parseDeploymentTier("local"), null);
});

test("validateSupabaseEnvironment passes for valid staging config", () => {
  assert.doesNotThrow(() => validateSupabaseEnvironment(baseOptions));
});

test("validateSupabaseEnvironment fails with uniform missing variable error", () => {
  assert.throws(
    () =>
      validateSupabaseEnvironment({
        ...baseOptions,
        requiredVars: [["SUPABASE_ANON_KEY", undefined]],
      }),
    /\[env-validation:server\] Missing required variable\(s\): SUPABASE_ANON_KEY\./,
  );
});

test("validateSupabaseEnvironment catches invalid Supabase URL", () => {
  assert.throws(
    () =>
      validateSupabaseEnvironment({
        ...baseOptions,
        supabaseUrl: "not-a-valid-url",
      }),
    /Invalid Supabase URL in SUPABASE_URL/,
  );
});

test("validateSupabaseEnvironment catches deployment tier mismatch", () => {
  assert.throws(
    () =>
      validateSupabaseEnvironment({
        ...baseOptions,
        deploymentTier: "production",
        vercelEnv: "preview",
      }),
    /Tier mismatch/,
  );
});
