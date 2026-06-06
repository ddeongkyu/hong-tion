do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'file_assets_size_limit_check'
  ) then
    alter table public.file_assets
    add constraint file_assets_size_limit_check
    check (size_bytes is null or size_bytes <= 10485760);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'file_assets_mime_type_check'
  ) then
    alter table public.file_assets
    add constraint file_assets_mime_type_check
    check (
      mime_type is null or mime_type = any (
        array[
          'application/json',
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/zip',
          'image/gif',
          'image/jpeg',
          'image/png',
          'image/webp',
          'text/csv',
          'text/markdown',
          'text/plain'
        ]::text[]
      )
    );
  end if;
end $$;
