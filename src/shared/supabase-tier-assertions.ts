type DeploymentTier = "staging" | "production";

type SupabaseTierAssertionOptions = {
  deploymentTierRaw: string | undefined;
  supabaseUrl: string;
  stagingHost: string | undefined;
  productionHost: string | undefined;
  context: "server" | "client";
  sourceName: string;
};

type DeploymentTierConsistencyOptions = {
  deploymentTier: string | undefined;
  vercelEnv: string | undefined;
  context: "server" | "client";
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

export const assertDeploymentTierConsistency = ({
  deploymentTier,
  vercelEnv,
  context,
}: DeploymentTierConsistencyOptions) => {
  if (!deploymentTier || !vercelEnv) return;

  const resolvedDeploymentTier = resolveTier(deploymentTier);
  const resolvedVercelTier = resolveTier(vercelEnv);

  if (!resolvedDeploymentTier || !resolvedVercelTier) return;
  if (resolvedDeploymentTier === resolvedVercelTier) return;

  throw new Error(
    [
      `Deployment tier mismatch for ${context}.`,
      `DEPLOYMENT_TIER resolved to "${resolvedDeploymentTier}" from "${deploymentTier}".`,
      `VERCEL_ENV resolved to "${resolvedVercelTier}" from "${vercelEnv}".`,
      "Align environment scoping in Vercel Preview vs Production before continuing.",
    ].join(" "),
  );
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

  const expectedHost = tier === "staging" ? normalizedStagingHost : normalizedProductionHost;

  if (!expectedHost) {
    const missingVariableName = tier === "staging" ? "stagingHost" : "productionHost";
    throw new Error(
      `Missing required Supabase host assertion variable for ${context} ${tier} deployment: ${missingVariableName}.`,
    );
  }

  const actualHost = getHostFromUrl(supabaseUrl, sourceName, context);

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
