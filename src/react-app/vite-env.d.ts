/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_DEPLOYMENT_TIER?: string;
  readonly VITE_VERCEL_ENV?: string;
  readonly VITE_SUPABASE_STAGING_HOST?: string;
  readonly VITE_SUPABASE_PRODUCTION_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
