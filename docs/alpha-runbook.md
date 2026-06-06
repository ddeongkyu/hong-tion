# Hong-tion Alpha Runbook

## Release Gates

- Phoenix prod must have `ALLOW_DEV_USER_HEADER` unset or `false`.
- `CORS_ORIGINS` must contain only deployed frontend origins.
- `PHX_HOST`, `DATABASE_URL`, `SECRET_KEY_BASE`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY` must be present.
- Fly API app must use release migration command `/app/bin/migrate`.
- Supabase SQL files through `014_alpha_safety_guards.sql` must be applied.
- Storage bucket `workspace-files` must exist with the policies from `010_storage.sql`.

## Smoke Test

```sh
npm run smoke
```

Optional authenticated checks:

```sh
SMOKE_API_URL=https://api.example.com \
SMOKE_ACCESS_TOKEN=<supabase-access-token> \
SMOKE_WORKSPACE_ID=<workspace-id> \
npm run smoke
```

Fly API check:

```sh
SMOKE_API_URL=https://ddeongkyu-hong-tion-api.fly.dev npm run smoke
```

## Alpha User Checklist

- Invite the user from the share panel.
- If the invitation is pending, send the copied invite link.
- Ask the user to sign up or sign in from that link.
- Confirm the user lands in the workspace and can create one page.
- Ask them to upload one small allowed file type, such as `.txt`, `.png`, or `.pdf`.

## Permission UX Checklist

Run this once before adding real alpha users, and repeat after changing member or sharing code.

- Owner can change page sharing, invite members, upload files, restore trash/history, and manage member roles.
- Owner cannot demote or remove the owner account from the member list.
- Editor can create, rename, edit, duplicate, delete, restore pages, upload files, invite members, and comment.
- Editor cannot change other members' roles or remove members.
- Viewer can open pages, search, copy links, and comment.
- Viewer sees page title, block editor, upload, restore, delete, and member-management controls as read-only or disabled.
- API returns `403 Forbidden` when an editor or viewer calls owner-only member management endpoints.

## Real Invite Checklist

Use two separate browser profiles or an incognito window so the invited user has a clean session.

- Invite an email that does not exist in Supabase Auth yet.
- Confirm the pending invitation row exposes a copyable invite link.
- Open the link as the invited user, sign up with the exact invited email, and confirm the invite becomes accepted.
- Try opening the same link again and confirm it no longer grants a second acceptance.
- Invite an email that already exists in Supabase Auth and confirm membership is applied immediately.
- Open an invite link while signed in as a different email and confirm the forbidden screen appears.
- Confirm the invited user appears in the member list with the selected `viewer` or `editor` role.
- Confirm the invited user receives the expected role UX after refresh.

## Supported Uploads

- Maximum size: 10 MB.
- MIME types: PNG, JPEG, WebP, GIF, PDF, plain text, Markdown, CSV, JSON, DOCX, XLSX, ZIP.

## Storage Checklist

Run these in the same Supabase project used by the alpha.

- Confirm bucket `workspace-files` exists.
- Confirm SQL from `010_storage.sql` has been applied, including Storage policies.
- Upload a small `.txt` file from the page tools panel and confirm a file block appears.
- Upload a small `.png` or `.jpg` and confirm the signed URL preview renders in the document.
- Upload a file over 10 MB and confirm the client blocks it before upload.
- Upload an unsupported type, such as `.exe`, and confirm it is rejected.
- Confirm a viewer cannot trigger upload controls from the UI and receives API/storage denial if attempting manually.
- Confirm file rows are scoped to the workspace and do not appear for a user outside the workspace.
- After a failed upload, confirm no orphaned object remains under `workspace-files/<workspace_id>/<page_id>/`.

## Rollback Notes

- Page delete is soft delete; restore from the page tools trash section.
- Page content can be restored from the page tools version history.
- Avoid permanent deletes during the alpha unless the user explicitly asks.
