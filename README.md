## Trivia Lingua

This app was created using https://getmocha.com.
Need help or want to join the community? Join our [Discord](https://discord.gg/shDEGBSe2d).

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create a local env file from the example and set your Supabase values:

```bash
cp .env.example .env
```

Required client variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

> `VITE_` variables are bundled into browser code by Vite, so only the **anon** key should use this prefix.

3. Run the app:

```bash
npm run dev
```

## Vercel deployment notes

- Set the Vercel **Build Command** to `npm run build` (or leave it empty so Vercel uses the package script default).
- Configure the following environment variables in your Vercel project settings:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Keep `SUPABASE_SERVICE_ROLE_KEY` **server-only** (Vercel function environment variables only).
- Never prefix the service role key with `VITE_`, or it will be exposed to browser bundles.
