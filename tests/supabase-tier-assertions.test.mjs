import test from "node:test";
import assert from "node:assert/strict";

import { assertSupabaseHostMatchesDeploymentTier } from "../src/shared/supabase-tier-assertions.ts";

const baseOptions = {
  supabaseUrl: "https://abc.supabase.co",
  context: "server",
  sourceName: "DEPLOYMENT_TIER",
};

test("staging tier missing staging host throws", () => {
  assert.throws(
    () =>
      assertSupabaseHostMatchesDeploymentTier({
        ...baseOptions,
        deploymentTierRaw: "preview",
        stagingHost: undefined,
        productionHost: "prod.supabase.co",
      }),
    /stagingHost/,
  );
});

test("staging tier with staging host set passes", () => {
  assert.doesNotThrow(() =>
    assertSupabaseHostMatchesDeploymentTier({
      ...baseOptions,
      deploymentTierRaw: "staging",
      stagingHost: "abc.supabase.co",
      productionHost: undefined,
    }),
  );
});

test("production tier missing production host throws", () => {
  assert.throws(
    () =>
      assertSupabaseHostMatchesDeploymentTier({
        ...baseOptions,
        deploymentTierRaw: "prod",
        stagingHost: "staging.supabase.co",
        productionHost: undefined,
      }),
    /productionHost/,
  );
});

test("production tier with production host set passes", () => {
  assert.doesNotThrow(() =>
    assertSupabaseHostMatchesDeploymentTier({
      ...baseOptions,
      deploymentTierRaw: "production",
      stagingHost: undefined,
      productionHost: "abc.supabase.co",
    }),
  );
});

test("unknown tier is a no-op", () => {
  assert.doesNotThrow(() =>
    assertSupabaseHostMatchesDeploymentTier({
      ...baseOptions,
      deploymentTierRaw: "local",
      stagingHost: undefined,
      productionHost: undefined,
    }),
  );
});
