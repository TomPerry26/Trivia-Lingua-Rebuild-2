export type DeploymentTier = "staging" | "production";

type RuntimeContext = "server" | "client";

type EnvPair = readonly [name: string, value: string | undefined];

type SupabaseEnvValidationOptions = {
  context: RuntimeContext;
  requiredVars: readonly EnvPair[];
  supabaseUrl: string | undefined;
  supabaseUrlVarName: string;
  deploymentTier?: string | undefined;
  deploymentTierSourceName?: string;
  vercelEnv?: string | undefined;
  vercelEnvSourceName?: string;
  stagingHost?: string | undefined;
  stagingHostVarName: string;
  productionHost?: string | undefined;
  productionHostVarName: string;
};

const normalizeValue = (value: string | undefined) => value?.trim().toLowerCase() ?? "";

const normalizeHostValue = (value: string | undefined) => {
  const normalized = normalizeValue(value);
  if (!normalized) return "";

  try {
    return new URL(normalized).host.toLowerCase();
  } catch {
    return normalized.replace(/^https?:\/\//, "").split("/")[0] ?? "";
  }
};

const joinEnvNames = (names: string[]) => names.join(", ");

const formatEnvError = (context: RuntimeContext, details: string[]) =>
  new Error(`[env-validation:${context}] ${details.join(" ")}`);

export const parseDeploymentTier = (rawTier: string | undefined): DeploymentTier | null => {
  const normalizedTier = normalizeValue(rawTier);

  if (normalizedTier === "preview" || normalizedTier === "staging") {
    return "staging";
  }

  if (normalizedTier === "production" || normalizedTier === "prod") {
    return "production";
  }

  return null;
};

const parseSupabaseUrlHost = ({
  supabaseUrl,
  sourceName,
  context,
}: {
  supabaseUrl: string;
  sourceName: string;
  context: RuntimeContext;
}) => {
  try {
    return new URL(supabaseUrl).host.toLowerCase();
  } catch {
    throw formatEnvError(context, [
      `Invalid Supabase URL in ${sourceName}: "${supabaseUrl}".`,
      'Expected a full URL like "https://<project>.supabase.co".',
    ]);
  }
};

export const validateSupabaseEnvironment = ({
  context,
  requiredVars,
  supabaseUrl,
  supabaseUrlVarName,
  deploymentTier,
  deploymentTierSourceName = "DEPLOYMENT_TIER",
  vercelEnv,
  vercelEnvSourceName = "VERCEL_ENV",
  stagingHost,
  stagingHostVarName,
  productionHost,
  productionHostVarName,
}: SupabaseEnvValidationOptions) => {
  const missingRequiredVars = requiredVars.filter(([, value]) => !value).map(([name]) => name);

  if (missingRequiredVars.length > 0) {
    throw formatEnvError(context, [`Missing required variable(s): ${joinEnvNames(missingRequiredVars)}.`]);
  }

  const resolvedSupabaseUrl = supabaseUrl as string;

  if (deploymentTier && vercelEnv) {
    const resolvedDeploymentTier = parseDeploymentTier(deploymentTier);
    const resolvedVercelTier = parseDeploymentTier(vercelEnv);

    if (resolvedDeploymentTier && resolvedVercelTier && resolvedDeploymentTier !== resolvedVercelTier) {
      throw formatEnvError(context, [
        `Tier mismatch: ${deploymentTierSourceName} resolved to "${resolvedDeploymentTier}" from "${deploymentTier}" while`,
        `${vercelEnvSourceName} resolved to "${resolvedVercelTier}" from "${vercelEnv}".`,
      ]);
    }
  }

  const tierRaw = deploymentTier ?? vercelEnv;
  const tierSourceName = deploymentTier ? deploymentTierSourceName : vercelEnvSourceName;
  const resolvedTier = parseDeploymentTier(tierRaw);

  if (!resolvedTier) {
    return;
  }

  const expectedHost =
    resolvedTier === "staging" ? normalizeHostValue(stagingHost) : normalizeHostValue(productionHost);

  if (!expectedHost) {
    const missingHostVarName = resolvedTier === "staging" ? stagingHostVarName : productionHostVarName;
    throw formatEnvError(context, [
      `Missing required tier variable for ${resolvedTier} deployments: ${missingHostVarName}.`,
    ]);
  }

  const actualHost = parseSupabaseUrlHost({
    supabaseUrl: resolvedSupabaseUrl,
    sourceName: supabaseUrlVarName,
    context,
  });

  if (actualHost !== expectedHost) {
    throw formatEnvError(context, [
      `Supabase host mismatch for ${resolvedTier} tier from ${tierSourceName}="${tierRaw}".`,
      `Expected host "${expectedHost}" but received "${actualHost}" from ${supabaseUrlVarName}.`,
    ]);
  }
};
