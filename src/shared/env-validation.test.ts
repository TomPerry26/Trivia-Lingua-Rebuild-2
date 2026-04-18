import assert from "node:assert/strict";
import test from "node:test";

import {
  assertSupabaseKeyMatchesUrlHost,
  assertSupabaseUrlsShareHost,
  parseDeploymentTier,
  validateSupabaseEnvironment,
} from "./env-validation.ts";

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

test("assertSupabaseUrlsShareHost passes when URLs share host", () => {
  assert.doesNotThrow(() =>
    assertSupabaseUrlsShareHost({
      context: "server",
      primaryUrl: "https://abc.supabase.co",
      primaryVarName: "SUPABASE_URL",
      secondaryUrl: "https://abc.supabase.co",
      secondaryVarName: "VITE_SUPABASE_URL",
    }),
  );
});

test("assertSupabaseUrlsShareHost fails for mismatched hosts", () => {
  assert.throws(
    () =>
      assertSupabaseUrlsShareHost({
        context: "server",
        primaryUrl: "https://abc.supabase.co",
        primaryVarName: "SUPABASE_URL",
        secondaryUrl: "https://xyz.supabase.co",
        secondaryVarName: "VITE_SUPABASE_URL",
      }),
    /Supabase host mismatch between SUPABASE_URL and VITE_SUPABASE_URL/,
  );
});

test("assertSupabaseKeyMatchesUrlHost passes when key issuer host matches URL host", () => {
  const payload = Buffer.from(
    JSON.stringify({
      iss: "https://abc.supabase.co/auth/v1",
      role: "anon",
    }),
  ).toString("base64url");
  const fakeJwt = `aaa.${payload}.zzz`;

  assert.doesNotThrow(() =>
    assertSupabaseKeyMatchesUrlHost({
      context: "server",
      supabaseUrl: "https://abc.supabase.co",
      supabaseUrlVarName: "SUPABASE_URL",
      supabaseKey: fakeJwt,
      supabaseKeyVarName: "SUPABASE_ANON_KEY",
    }),
  );
});

test("assertSupabaseKeyMatchesUrlHost fails when key issuer host mismatches URL host", () => {
  const payload = Buffer.from(
    JSON.stringify({
      iss: "https://xyz.supabase.co/auth/v1",
      role: "anon",
    }),
  ).toString("base64url");
  const fakeJwt = `aaa.${payload}.zzz`;

  assert.throws(
    () =>
      assertSupabaseKeyMatchesUrlHost({
        context: "server",
        supabaseUrl: "https://abc.supabase.co",
        supabaseUrlVarName: "SUPABASE_URL",
        supabaseKey: fakeJwt,
        supabaseKeyVarName: "SUPABASE_ANON_KEY",
      }),
    /Supabase key mismatch between SUPABASE_ANON_KEY and SUPABASE_URL/,
  );
});
