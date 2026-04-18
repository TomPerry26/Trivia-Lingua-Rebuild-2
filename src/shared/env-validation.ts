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

type SupabaseAlignmentOptions = {
  context: RuntimeContext;
  primaryUrl: string;
  primaryVarName: string;
  secondaryUrl: string;
  secondaryVarName: string;
};

type SupabaseKeyAlignmentOptions = {
  context: RuntimeContext;
  supabaseUrl: string;
  supabaseUrlVarName: string;
  supabaseKey: string;
  supabaseKeyVarName: string;
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

export const assertSupabaseUrlsShareHost = ({
  context,
  primaryUrl,
  primaryVarName,
  secondaryUrl,
  secondaryVarName,
}: SupabaseAlignmentOptions) => {
  const primaryHost = parseSupabaseUrlHost({
    supabaseUrl: primaryUrl,
    sourceName: primaryVarName,
    context,
  });
  const secondaryHost = parseSupabaseUrlHost({
    supabaseUrl: secondaryUrl,
    sourceName: secondaryVarName,
    context,
  });

  if (primaryHost !== secondaryHost) {
    throw formatEnvError(context, [
      `Supabase host mismatch between ${primaryVarName} and ${secondaryVarName}.`,
      `Received "${primaryHost}" vs "${secondaryHost}".`,
      "This causes auth/session drift between browser and API clients.",
    ]);
  }
};

const parseJwtPayload = (jwt: string): Record<string, unknown> => {
  const parts = jwt.split(".");
  if (parts.length < 2) {
    throw new Error("JWT is malformed.");
  }

  const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const encodedPayload = `${normalized}${padding}`;
  const decoded =
    typeof atob === "function"
      ? atob(encodedPayload)
      : Buffer.from(encodedPayload, "base64").toString("utf8");
  return JSON.parse(decoded) as Record<string, unknown>;
};

export const assertSupabaseKeyMatchesUrlHost = ({
  context,
  supabaseUrl,
  supabaseUrlVarName,
  supabaseKey,
  supabaseKeyVarName,
}: SupabaseKeyAlignmentOptions) => {
  const urlHost = parseSupabaseUrlHost({
    supabaseUrl,
    sourceName: supabaseUrlVarName,
    context,
  });

  let issuerHost: string | null = null;
  try {
    const payload = parseJwtPayload(supabaseKey);
    const issuer = typeof payload.iss === "string" ? payload.iss : null;
    issuerHost = issuer ? new URL(issuer).host.toLowerCase() : null;
  } catch {
    throw formatEnvError(context, [
      `Invalid Supabase key in ${supabaseKeyVarName}.`,
      "Expected a JWT-formatted Supabase key with an issuer host.",
    ]);
  }

  if (!issuerHost) {
    throw formatEnvError(context, [
      `Invalid Supabase key in ${supabaseKeyVarName}.`,
      "Missing JWT issuer host.",
    ]);
  }

  if (issuerHost !== urlHost) {
    throw formatEnvError(context, [
      `Supabase key mismatch between ${supabaseKeyVarName} and ${supabaseUrlVarName}.`,
      `Issuer host "${issuerHost}" does not match URL host "${urlHost}".`,
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
}: SupabaseEnvValidationOptions) => {
  const missingRequiredVars = requiredVars.filter(([, value]) => !value).map(([name]) => name);

  if (missingRequiredVars.length > 0) {
    throw formatEnvError(context, [`Missing required variable(s): ${joinEnvNames(missingRequiredVars)}.`]);
  }

  const resolvedSupabaseUrl = supabaseUrl as string;
  parseSupabaseUrlHost({
    supabaseUrl: resolvedSupabaseUrl,
    sourceName: supabaseUrlVarName,
    context,
  });

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
