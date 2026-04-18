export type AuthStage = "start" | "redirect" | "callback" | "session_ready" | "users_me";

type AuthLogLevel = "info" | "warn" | "error";

type AuthTelemetryPayload = {
  stage: AuthStage;
  event: string;
  outcome: "attempt" | "success" | "failure";
  details?: Record<string, unknown>;
};

const emit = (level: AuthLogLevel, payload: AuthTelemetryPayload) => {
  const line = {
    scope: "auth",
    ts: new Date().toISOString(),
    ...payload,
  };

  if (level === "error") {
    console.error("[auth]", JSON.stringify(line));
    return;
  }

  if (level === "warn") {
    console.warn("[auth]", JSON.stringify(line));
    return;
  }

  console.info("[auth]", JSON.stringify(line));
};

export const authTelemetry = {
  info(payload: AuthTelemetryPayload) {
    emit("info", payload);
  },
  warn(payload: AuthTelemetryPayload) {
    emit("warn", payload);
  },
  error(payload: AuthTelemetryPayload) {
    emit("error", payload);
  },
};
