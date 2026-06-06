# Hong-tion DB Spec v0.1

## Ownership

- Supabase Auth owns user accounts in `auth.users`.
- Hong-tion app data lives in `public`.
- Phoenix owns business logic and realtime coordination.
- RLS is enabled on every app table as defense in depth.

## Core Tables

- `profiles`: app profile for each Supabase user.
- `workspaces`: top-level personal or team space.
- `workspace_members`: membership and role per workspace.
- `workspace_invitations`: email invite records.
- `pages`: hierarchical document tree with soft delete.
- `page_favorites`: per-user favorite pages.
- `page_shares`: link-share tokens and access level.
- `blocks`: block editor content as JSONB plus searchable text.
- `file_assets`: database metadata for Supabase Storage objects.

## Database View Tables

- `document_databases`: Notion-style database container.
- `database_properties`: field definitions.
- `database_records`: row/card/list item records.
- `database_property_values`: JSONB values per record/property.
- `database_views`: table, board, gallery, calendar, and list configs.

## Collaboration Tables

- `comments`: page/block comments and resolve state.
- `notifications`: in-app notifications.
- `page_versions`: restore snapshots.
- `page_events`: append-only page activity events.

## Realtime

Phoenix Channels should publish realtime events. The database stores durable
state, comments, history, and notification records. Presence/cursors can stay in
Phoenix memory unless we later need analytics or replay.

## Storage Path Convention

- Avatars: `<user_id>/<file_name>`
- Workspace files: `<workspace_id>/<page_id or general>/<file_name>`

Storage policies parse the first path segment to enforce user/workspace access.
