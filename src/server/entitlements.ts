import { supabaseAdmin } from "./supabase.js";

export const ENTITLEMENT_TIERS = ["free", "pro", "trial"] as const;

export type EntitlementTier = (typeof ENTITLEMENT_TIERS)[number];

export interface UserEntitlement {
  tier: EntitlementTier;
  source: "default-free" | "user_entitlements" | "profiles";
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
  updatedAt: string | null;
}

export const DEFAULT_ENTITLEMENT: UserEntitlement = {
  tier: "free",
  source: "default-free",
  trialEndsAt: null,
  currentPeriodEndsAt: null,
  updatedAt: null,
};

type EntitlementRow = {
  entitlement_tier?: string | null;
  trial_ends_at?: string | null;
  current_period_ends_at?: string | null;
  updated_at?: string | null;
};

const normalizeTier = (value: string | null | undefined): EntitlementTier => {
  if (value === "pro" || value === "trial") return value;
  return "free";
};

const fromRow = (row: EntitlementRow | null | undefined, source: UserEntitlement["source"]): UserEntitlement => {
  if (!row) return DEFAULT_ENTITLEMENT;
  return {
    tier: normalizeTier(row.entitlement_tier),
    source,
    trialEndsAt: row.trial_ends_at ?? null,
    currentPeriodEndsAt: row.current_period_ends_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
};

export const getUserEntitlement = async (userId: string | null | undefined): Promise<UserEntitlement> => {
  if (!userId) return DEFAULT_ENTITLEMENT;

  const entitlementsRes = await supabaseAdmin
    .from("user_entitlements")
    .select("entitlement_tier, trial_ends_at, current_period_ends_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!entitlementsRes.error && entitlementsRes.data) {
    return fromRow(entitlementsRes.data, "user_entitlements");
  }

  // Backward-compatible fallback if teams choose to keep entitlement columns on profiles instead.
  const profilesRes = await supabaseAdmin
    .from("profiles")
    .select("entitlement_tier, trial_ends_at, current_period_ends_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profilesRes.error && profilesRes.data) {
    return fromRow(profilesRes.data, "profiles");
  }

  return DEFAULT_ENTITLEMENT;
};

export const hasEntitlement = (entitlement: UserEntitlement, allowedTiers: readonly EntitlementTier[]): boolean =>
  allowedTiers.includes(entitlement.tier);

export const requireEntitlement = async (params: {
  userId: string | null | undefined;
  allowedTiers: readonly EntitlementTier[];
}) => {
  const entitlement = await getUserEntitlement(params.userId);
  return {
    entitlement,
    allowed: hasEntitlement(entitlement, params.allowedTiers),
  };
};
