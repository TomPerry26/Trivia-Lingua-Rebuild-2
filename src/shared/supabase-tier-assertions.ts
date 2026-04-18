type DeploymentTier = "staging" | "production";

type SupabaseTierAssertionOptions = {
  deploymentTierRaw: string | undefined;
  supabaseUrl: string;
  stagingHost: string | undefined;
  productionHost: string | undefined;
  context: "server" | "client";
  sourceName: string;
};

const normalizeHost = (value: string | undefined) => value?.trim().toLowerCase() || "";

const getHostFromUrl = (supabaseUrl: string, sourceName: string, context: "server" | "client") => {
  try {
    return new URL(supabaseUrl).host.toLowerCase();
  } catch {
    throw new Error(
      `Invalid Supabase URL in ${sourceName} (${context}): "${supabaseUrl}". Expected a full URL like "https://<project>.supabase.co".`,
    );
  }
};

const resolveTier = (deploymentTierRaw: string | undefined): DeploymentTier | null => {
  const normalizedTier = deploymentTierRaw?.trim().toLowerCase();
  if (normalizedTier === "preview" || normalizedTier === "staging") return "staging";
  if (normalizedTier === "production" || normalizedTier === "prod") return "production";
  return null;
};

export const assertSupabaseHostMatchesDeploymentTier = ({
  deploymentTierRaw,
  supabaseUrl,
  stagingHost,
  productionHost,
  context,
  sourceName,
}: SupabaseTierAssertionOptions) => {
  const tier = resolveTier(deploymentTierRaw);
  if (!tier) return;

  const normalizedStagingHost = normalizeHost(stagingHost);
  const normalizedProductionHost = normalizeHost(productionHost);

  const missingExpectedHosts = [
    ["staging", normalizedStagingHost],
    ["production", normalizedProductionHost],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missingExpectedHosts.length > 0) {
    throw new Error(
      `Missing required Supabase host assertion variable(s) for ${context}: ${missingExpectedHosts.join(
        ", ",
      )}. Set both staging and production expected hosts to enforce deployment-tier safety checks.`,
    );
  }

  const actualHost = getHostFromUrl(supabaseUrl, sourceName, context);
  const expectedHost = tier === "staging" ? normalizedStagingHost : normalizedProductionHost;

  if (actualHost !== expectedHost) {
    throw new Error(
      [
        `Supabase host mismatch for ${context} ${tier} deployment.`,
        `Tier source "${sourceName}" resolved to "${deploymentTierRaw}".`,
        `Expected host: "${expectedHost}".`,
        `Actual host from Supabase URL: "${actualHost}".`,
        "Fix your environment variable scoping before deploying to avoid auth failures.",
      ].join(" "),
    );
  }
};
