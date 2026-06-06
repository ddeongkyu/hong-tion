# Hong-tion

Hong-tion is a collaborative document workspace inspired by Notion.

## Structure

```txt
apps/
  web/  Next.js 15 app
  api/  Phoenix API and realtime server
infra/
  supabase/
docs/
```

## Local Development

Frontend:

```sh
npm run dev:web
```

Backend:

```sh
npm run dev:api
```

Phoenix reads `apps/api/.env` in development. Use the Supabase Session pooler connection string for `DATABASE_URL` unless your network can resolve the Direct connection host.

Database check:

```sh
curl http://localhost:4000/api/health/db
```

Backend tests:

```sh
docker compose -f docker-compose.test.yml up -d
cd apps/api
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:55432/hongtion_api_test mix test
```

Smoke check:

```sh
npm run smoke
```

Initial API:

```sh
curl http://localhost:4000/api/workspaces \
  -H "Authorization: Bearer <supabase-access-token>"
```

Phoenix verifies Supabase access tokens with the project's JWKS endpoint. If a
project still uses legacy shared-secret JWTs, set `SUPABASE_PUBLISHABLE_KEY` in
`apps/api/.env` so the backend can validate tokens through Supabase Auth. Use
the same Supabase Publishable key as `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Production safety:

- Set `ALLOW_DEV_USER_HEADER=false` or leave it unset.
- Set `CORS_ORIGINS` to the deployed frontend origin.
- Set `PHX_HOST`, `DATABASE_URL`, `SECRET_KEY_BASE`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY`.
- Apply Supabase SQL through `014_alpha_safety_guards.sql`.

See `docs/alpha-runbook.md` before inviting alpha users.

## Default Ports

- Web: http://localhost:3000
- API: http://localhost:4000
- Health: http://localhost:4000/api/health
- DB Health: http://localhost:4000/api/health/db
