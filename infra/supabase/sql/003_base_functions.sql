create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.block_plain_text(content jsonb)
returns text
language sql
immutable
as $$
  with item_text as (
    select string_agg(item.value #>> '{}', ' ') as value
    from jsonb_array_elements(coalesce(content -> 'items', '[]'::jsonb)) as item(value)
  )
  select trim(
    concat_ws(
      ' ',
      content ->> 'text',
      content ->> 'title',
      content ->> 'caption',
      content ->> 'url',
      content ->> 'language',
      (select value from item_text)
    )
  );
$$;

create or replace function public.try_uuid(value text)
returns uuid
language plpgsql
immutable
as $$
begin
  if value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return value::uuid;
  end if;

  return null;
end;
$$;
