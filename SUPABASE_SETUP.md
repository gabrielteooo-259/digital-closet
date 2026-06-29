# Supabase setup (cloud sync)

Follow these steps to enable **shared household closets** across devices.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In **Project Settings → API**, copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

## 2. Configure environment variables

**Locally** — create `.env` in the project root:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Vercel** — Project → Settings → Environment Variables → add the same two keys, then redeploy.

## 3. Run the database schema

1. Supabase Dashboard → **SQL Editor** → New query
2. Paste the contents of `supabase/schema.sql`
3. Click **Run**

## 4. Create the photos bucket

1. Dashboard → **Storage** → **New bucket**
2. Name: `photos`
3. Enable **Public bucket**
4. Re-run the storage policy section at the bottom of `schema.sql` if policies failed before the bucket existed

## 5. Auth settings (recommended)

Dashboard → **Authentication** → **Providers** → Email:

- For easiest testing, turn **off** “Confirm email” (optional for personal use)
- Set minimum password length to 6

## How household sharing works

| Step | Who | Action |
|------|-----|--------|
| 1 | You | **Create** account + household → get an **invite code** |
| 2 | Partner | **Join** with that invite code (new account) |
| 3 | Both | Sign in on any device → same clothes & outfits |

Data is stored in Supabase (Postgres + Storage), not only in the browser.

## Without Supabase

If env vars are missing, the app falls back to **local-only** storage (IndexedDB) with no sign-in screen.
