export type SupabaseError = {
  message: string;
  status?: number;
};

export type SupabaseResponse<T> = {
  data: T;
  error: SupabaseError | null;
};

export type User = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  created_at?: string;
};

export type Session = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user?: User;
};

type OAuthProvider = "google" | "github" | "apple" | "azure" | "discord" | "gitlab" | string;

type OAuthOptions = {
  redirectTo?: string;
  skipBrowserRedirect?: boolean;
};

const toError = (message: string, status?: number): SupabaseError => ({ message, status });

class QueryBuilder<T = unknown> implements PromiseLike<SupabaseResponse<T>> {
  private method: "GET" | "POST" | "PATCH" | "DELETE" = "GET";
  private body: unknown;
  private readonly params = new URLSearchParams();

  constructor(
    private readonly url: string,
    private readonly table: string,
    private readonly headers: Record<string, string>,
  ) {}

  select(columns = "*") {
    this.method = "GET";
    this.params.set("select", columns);
    return this;
  }

  insert(payload: unknown) {
    this.method = "POST";
    this.body = payload;
    return this;
  }

  update(payload: unknown) {
    this.method = "PATCH";
    this.body = payload;
    return this;
  }

  delete() {
    this.method = "DELETE";
    return this;
  }

  eq(column: string, value: string | number | boolean) {
    this.params.set(column, `eq.${value}`);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    const direction = options?.ascending === false ? "desc" : "asc";
    const existing = this.params.get("order");
    const nextValue = `${column}.${direction}`;
    this.params.set("order", existing ? `${existing},${nextValue}` : nextValue);
    return this;
  }

  limit(count: number) {
    this.params.set("limit", String(count));
    return this;
  }

  async execute(): Promise<SupabaseResponse<T>> {
    const endpoint = `${this.url}/rest/v1/${this.table}?${this.params.toString()}`;

    try {
      const response = await fetch(endpoint, {
        method: this.method,
        headers: {
          ...this.headers,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: this.body ? JSON.stringify(this.body) : undefined,
      });

      const raw = await response.text();
      const parsed = raw ? JSON.parse(raw) : null;

      if (!response.ok) {
        const message = parsed?.message || `Supabase request failed with status ${response.status}.`;
        return { data: null as T, error: toError(message, response.status) };
      }

      return { data: parsed as T, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Supabase request error.";
      return { data: null as T, error: toError(message) };
    }
  }

  then<TResult1 = SupabaseResponse<T>, TResult2 = never>(
    onfulfilled?: ((value: SupabaseResponse<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled ?? undefined, onrejected ?? undefined);
  }
}

const createAuthClient = (url: string, key: string) => {
  const authHeaders = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  return {
    async getSession(): Promise<SupabaseResponse<{ session: Session | null }>> {
      return { data: { session: null }, error: null };
    },

    onAuthStateChange(callback: (event: string, session: Session | null) => void) {
      callback("INITIAL_SESSION", null);
      return {
        data: {
          subscription: {
            unsubscribe: () => undefined,
          },
        },
      };
    },

    async signInWithOAuth({
      provider,
      options,
    }: {
      provider: OAuthProvider;
      options?: OAuthOptions;
    }): Promise<SupabaseResponse<{ provider: OAuthProvider; url: string }>> {
      const oauthUrl = new URL(`${url}/auth/v1/authorize`);
      oauthUrl.searchParams.set("provider", provider);
      if (options?.redirectTo) {
        oauthUrl.searchParams.set("redirect_to", options.redirectTo);
      }

      const href = oauthUrl.toString();
      if (!options?.skipBrowserRedirect && typeof window !== "undefined") {
        window.location.assign(href);
      }

      return {
        data: { provider, url: href },
        error: null,
      };
    },

    async signOut(): Promise<SupabaseResponse<null>> {
      return { data: null, error: null };
    },

    async setSession(_session: Session): Promise<SupabaseResponse<{ session: Session | null }>> {
      return { data: { session: null }, error: null };
    },

    async exchangeCodeForSession(_callbackUrl: string): Promise<SupabaseResponse<{ session: Session | null }>> {
      return { data: { session: null }, error: null };
    },

    async getUser(token?: string): Promise<SupabaseResponse<{ user: User | null }>> {
      if (!token) {
        return { data: { user: null }, error: null };
      }

      try {
        const response = await fetch(`${url}/auth/v1/user`, {
          headers: {
            ...authHeaders,
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          return {
            data: { user: null },
            error: toError(`Unable to fetch user. HTTP ${response.status}.`, response.status),
          };
        }

        const user = (await response.json()) as User;
        return { data: { user }, error: null };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown auth error.";
        return { data: { user: null }, error: toError(message) };
      }
    },
  };
};

export const createClient = (url: string, key: string, _options?: unknown) => {
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };

  return {
    from: <T = unknown>(table: string) => new QueryBuilder<T>(url, table, headers),
    auth: createAuthClient(url, key),
  };
};
