# Supabase setup (cloud sync)

Follow these steps to enable **account-based cloud sync** across devices.

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

**Note:** The schema drops old household tables if they exist. This resets cloud data when migrating from the previous household model.

## 4. Create the photos bucket

1. Dashboard → **Storage** → **New bucket**
2. Name: `photos`
3. Enable **Public bucket**
4. Re-run the storage policy section at the bottom of `schema.sql` if policies failed before the bucket existed

## 5. Auth settings (recommended)

Dashboard → **Authentication** → **Providers** → Email:

- For easiest testing, turn **off** “Confirm email” (optional for personal use)
- Set minimum password length to 6

## How account sync works

| Step | Action |
|------|--------|
| 1 | **Sign up** with email and password |
| 2 | Add clothes and outfits — saved to your account |
| 3 | **Sign in** on any device → see your own closet |

Each account has its own private closet synced across devices.

Data is stored in Supabase (Postgres + Storage), not only in the browser.

## Without Supabase

If env vars are missing, the app falls back to **local-only** storage (IndexedDB) with no sign-in screen.
