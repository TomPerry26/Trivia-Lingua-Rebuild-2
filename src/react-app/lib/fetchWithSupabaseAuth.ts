import { supabase } from "@/react-app/lib/supabase";
import { authTelemetry } from "@/react-app/lib/authTelemetry";

export async function fetchWithSupabaseAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const isUsersMeRequest = requestUrl.includes("/api/users/me");

  if (isUsersMeRequest) {
    authTelemetry.info({
      stage: "users_me",
      event: "users_me_request_started",
      outcome: "attempt",
    });
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init?.headers);

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (isUsersMeRequest) {
    authTelemetry.info({
      stage: "users_me",
      event: "users_me_request_completed",
      outcome: response.ok ? "success" : "failure",
      details: {
        status: response.status,
      },
    });
  }

  return response;
}
