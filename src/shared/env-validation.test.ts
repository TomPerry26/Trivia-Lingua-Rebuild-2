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
  stagingHost: "preview-project.supabase.co",
  stagingHostVarName: "SUPABASE_PREVIEW_HOST",
  productionHost: "prod-project.supabase.co",
  productionHostVarName: "SUPABASE_PRODUCTION_HOST",
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

test("validateSupabaseEnvironment accepts full URL tier host variables", () => {
  assert.doesNotThrow(() =>
    validateSupabaseEnvironment({
      ...baseOptions,
      stagingHost: "https://preview-project.supabase.co",
      productionHost: "https://prod-project.supabase.co",
    }),
  );
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

test("validateSupabaseEnvironment requires the tier-specific host variable", () => {
  assert.throws(
    () =>
      validateSupabaseEnvironment({
        ...baseOptions,
        stagingHost: "",
      }),
    /Missing required tier variable for staging deployments: SUPABASE_PREVIEW_HOST\./,
  );
});

test("validateSupabaseEnvironment catches mismatched tier host", () => {
  assert.throws(
    () =>
      validateSupabaseEnvironment({
        ...baseOptions,
        supabaseUrl: "https://wrong-host.supabase.co",
      }),
    /Supabase host mismatch for staging tier/,
  );
});
