-- Development cleanup only.
-- Removes Codex-created E2E users and their owned workspaces.

begin;

delete from public.workspaces
where owner_id in (
  select id
  from auth.users
  where email like 'codex.e2e.%@example.com'
);

delete from auth.users
where email like 'codex.e2e.%@example.com';

commit;
