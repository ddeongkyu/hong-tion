# Hong-tion Architecture

## v0.1 Direction

- Next.js owns the user interface, routing, editor shell, and i18n.
- Supabase owns Auth, Storage, and managed PostgreSQL infrastructure.
- Phoenix owns business logic, authorization checks, Ecto migrations, APIs, and realtime collaboration channels.
- Phoenix Channels are the single realtime collaboration path for document editing, cursor presence, and block events.
- Phoenix verifies Supabase access tokens from `Authorization: Bearer <token>` before assigning the current user.

## Runtime Flow

```txt
Next.js -> Supabase Auth
Next.js -> Phoenix JSON API
Next.js -> Phoenix Channels
Phoenix -> Supabase Postgres via Ecto
Phoenix -> Supabase Storage signed URLs
```
