# Digital Closet

A mobile-first wardrobe app built with React, TypeScript, and Vite. Add clothing photos, organize by category, and plan outfits for trips and events.

## Features

- Closet with Top / Bottom / Cap / Shoes categories
- Background removal on photo upload
- Outfit planner with folders
- **Local storage** — data stays on your device (IndexedDB)
- **Export / Import** — backup your closet as a JSON file

## Deploy on Vercel

1. Push this repo to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. No environment variables required
4. Deploy

## Local development

```bash
npm install
npm run dev
```

## Backup

Use **Export** in the app header to download a backup file. Use **Import** to restore it (replaces current data on that device).

Data is stored in your browser. Clearing site data will remove your closet unless you have an export.
