type RuntimeContext = "server" | "client";

type EnvPair = readonly [name: string, value: string | undefined];

type SupabaseEnvValidationOptions = {
  context: RuntimeContext;
  requiredVars: readonly EnvPair[];
  supabaseUrlVarName: string;
};

const joinEnvNames = (names: string[]) => names.join(", ");

const formatEnvError = (context: RuntimeContext, details: string[]) =>
  new Error(`[env-validation:${context}] ${details.join(" ")}`);

export const validateSupabaseEnvironment = ({
  context,
  requiredVars,
  supabaseUrlVarName,
}: SupabaseEnvValidationOptions) => {
  const missingRequiredVars = requiredVars.filter(([, value]) => !value).map(([name]) => name);

  if (missingRequiredVars.length > 0) {
    const messageDetails = [`Missing required variable(s): ${joinEnvNames(missingRequiredVars)}.`];

    if (missingRequiredVars.includes(supabaseUrlVarName)) {
      messageDetails.push(
        `Set ${supabaseUrlVarName} to a full URL like "https://<project>.supabase.co".`,
      );
    }

    throw formatEnvError(context, messageDetails);
  }
};
