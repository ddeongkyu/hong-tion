create index if not exists profiles_display_name_trgm_idx
on public.profiles using gin (display_name gin_trgm_ops);

create index if not exists workspace_members_user_id_idx
on public.workspace_members (user_id);

create index if not exists workspace_invitations_workspace_status_idx
on public.workspace_invitations (workspace_id, status);

create index if not exists workspace_invitations_email_idx
on public.workspace_invitations (email);

create index if not exists pages_workspace_parent_position_idx
on public.pages (workspace_id, parent_id, position);

create index if not exists pages_workspace_deleted_idx
on public.pages (workspace_id, is_deleted, deleted_at);

create index if not exists pages_search_vector_idx
on public.pages using gin (search_vector);

create index if not exists page_shares_token_idx
on public.page_shares (token);

create index if not exists blocks_page_parent_position_idx
on public.blocks (page_id, parent_block_id, position);

create index if not exists blocks_search_vector_idx
on public.blocks using gin (search_vector);

create index if not exists file_assets_workspace_idx
on public.file_assets (workspace_id, page_id, block_id);

create index if not exists document_databases_workspace_idx
on public.document_databases (workspace_id);

create index if not exists database_properties_database_position_idx
on public.database_properties (database_id, position);

create index if not exists database_records_database_position_idx
on public.database_records (database_id, position);

create index if not exists database_records_search_vector_idx
on public.database_records using gin (search_vector);

create index if not exists database_property_values_value_idx
on public.database_property_values using gin (value);

create index if not exists database_views_database_position_idx
on public.database_views (database_id, position);

create index if not exists comments_page_block_idx
on public.comments (page_id, block_id);

create index if not exists comments_unresolved_idx
on public.comments (page_id)
where resolved_at is null;

create index if not exists comments_search_vector_idx
on public.comments using gin (search_vector);

create index if not exists notifications_recipient_unread_idx
on public.notifications (recipient_id, created_at desc)
where read_at is null;

create index if not exists page_versions_page_created_idx
on public.page_versions (page_id, created_at desc);

create index if not exists page_events_page_created_idx
on public.page_events (page_id, created_at desc);
