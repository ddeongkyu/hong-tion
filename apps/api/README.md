# HongtionApi

To start your Phoenix server:

* Run `mix setup` to install and setup dependencies
* Start Phoenix endpoint with `mix phx.server` or inside IEx with `iex -S mix phx.server`

Now you can visit [`localhost:4000`](http://localhost:4000) from your browser.

To run tests with the local test database:

```sh
docker compose -f ../../docker-compose.test.yml up -d
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:55432/hongtion_api_test mix test
```

## Fly.io Deployment

The API release is configured with `Dockerfile`, `fly.toml`, and a release
migration command. Register secrets before the first deploy:

```sh
fly apps create ddeongkyu-hong-tion-api

fly secrets set \
  ALLOW_DEV_USER_HEADER=false \
  CORS_ORIGINS=https://your-web-domain.example \
  DATABASE_URL='postgresql://postgres.<project-ref>:<password>@<supabase-pooler-host>:5432/postgres' \
  SECRET_KEY_BASE="$(mix phx.gen.secret)" \
  SUPABASE_PUBLISHABLE_KEY='<supabase-publishable-key>' \
  SUPABASE_URL='https://<project-ref>.supabase.co'
```

Deploy from this directory:

```sh
fly deploy
```

Check the deployed API:

```sh
curl https://ddeongkyu-hong-tion-api.fly.dev/api/health
curl https://ddeongkyu-hong-tion-api.fly.dev/api/health/db
```

Use the Supabase Session pooler connection string for Phoenix/Ecto. It runs on
port `5432` and supports prepared statements.

Ready to run in production? Please [check our deployment guides](https://hexdocs.pm/phoenix/deployment.html).

## Learn more

* Official website: https://www.phoenixframework.org/
* Guides: https://hexdocs.pm/phoenix/overview.html
* Docs: https://hexdocs.pm/phoenix
* Forum: https://elixirforum.com/c/phoenix-forum
* Source: https://github.com/phoenixframework/phoenix
