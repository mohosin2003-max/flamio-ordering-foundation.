# Replit setup

## Run the app

The project uses Node.js 22 and Vite/TanStack Start.

```sh
npm run dev -- --host 0.0.0.0 --port 5000
```

The Replit workflow named `Start application` runs this command automatically
and serves the web preview on port 5000.

## Environment

Supabase-backed features use the following environment variables:

- `SUPABASE_PROJECT_ID`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`

Keep these values in Replit Secrets or environment variables rather than
committing them to the repository.

## Checks

```sh
npm run build
npm run lint
```

The production build currently passes. The imported source has existing
Prettier lint findings; lint is useful for identifying those separately from
runtime setup.