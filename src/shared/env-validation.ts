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
};

const normalizeValue = (value: string | undefined) => value?.trim().toLowerCase() ?? "";

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

export const validateSupabaseEnvironment = ({
  context,
  requiredVars,
  supabaseUrl,
  supabaseUrlVarName,
  deploymentTier,
  deploymentTierSourceName = "DEPLOYMENT_TIER",
  vercelEnv,
  vercelEnvSourceName = "VERCEL_ENV",
}: SupabaseEnvValidationOptions) => {
  const missingRequiredVars = requiredVars.filter(([, value]) => !value).map(([name]) => name);

  if (missingRequiredVars.length > 0) {
    throw formatEnvError(context, [`Missing required variable(s): ${joinEnvNames(missingRequiredVars)}.`]);
  }

  const resolvedSupabaseUrl = supabaseUrl as string;
  try {
    new URL(resolvedSupabaseUrl);
  } catch {
    throw formatEnvError(context, [
      `Invalid Supabase URL in ${supabaseUrlVarName}: "${resolvedSupabaseUrl}".`,
      'Expected a full URL like "https://<project>.supabase.co".',
    ]);
  }

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

  return;
};
