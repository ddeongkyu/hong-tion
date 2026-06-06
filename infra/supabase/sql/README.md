# Hong-tion Supabase SQL

Run these files in order:

1. `001_extensions.sql`
2. `002_types.sql`
3. `003_base_functions.sql`
4. `004_core_tables.sql`
5. `005_database_tables.sql`
6. `006_collaboration_tables.sql`
7. `007_integrity_triggers.sql`
8. `008_indexes.sql`
9. `009_rls_policies.sql`
10. `010_storage.sql`
11. `012_mvp_collaboration_patch.sql`
12. `013_search_trash_history_patch.sql`
13. `014_alpha_safety_guards.sql`

Notes:

- The app schema lives in `public`.
- User identity references Supabase Auth through `auth.users`.
- Phoenix will own business logic, but RLS is still enabled as defense in depth.
- If you already ran `001` through `010`, run `012_mvp_collaboration_patch.sql`, `013_search_trash_history_patch.sql`, `014_alpha_safety_guards.sql`, and rerun `010_storage.sql` before testing file uploads.
- Storage paths should use this convention:
  - Workspace files: `<workspace_id>/<page_id or general>/<file_name>`
  - Avatars: `<user_id>/<file_name>`
