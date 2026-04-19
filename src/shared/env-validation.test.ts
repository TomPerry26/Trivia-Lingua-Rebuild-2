import assert from "node:assert/strict";
import test from "node:test";

import { validateSupabaseEnvironment } from "./env-validation.ts";

const baseOptions = {
  context: "server" as const,
  requiredVars: [
    ["SUPABASE_URL", "https://example.supabase.co"],
    ["SUPABASE_ANON_KEY", "anon-key"],
  ] as const,
  supabaseUrlVarName: "SUPABASE_URL",
};

test("validateSupabaseEnvironment passes when required variables are present", () => {
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

test("validateSupabaseEnvironment includes URL guidance when SUPABASE_URL is missing", () => {
  assert.throws(
    () =>
      validateSupabaseEnvironment({
        ...baseOptions,
        requiredVars: [
          ["SUPABASE_URL", ""],
          ["SUPABASE_ANON_KEY", "anon-key"],
        ],
      }),
    /Set SUPABASE_URL to a full URL like "https:\/\/<project>\.supabase\.co"\./,
  );
});

test("validateSupabaseEnvironment reports multiple missing variables", () => {
  assert.throws(
    () =>
      validateSupabaseEnvironment({
        ...baseOptions,
        requiredVars: [
          ["SUPABASE_URL", ""],
          ["SUPABASE_ANON_KEY", undefined],
        ],
      }),
    /Missing required variable\(s\): SUPABASE_URL, SUPABASE_ANON_KEY\./,
  );
});
