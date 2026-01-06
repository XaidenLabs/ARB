-- FUNCTON: delete_user_from_auth
-- Purpose: Deletes a user from auth.users when called.
-- Security: SECURITY DEFINER allows it to access auth.schema which is normally restricted.

create or replace function public.delete_user_from_auth()
returns trigger as $$
begin
  delete from auth.users where id = old.id;
  return old;
end;
$$ language plpgsql security definer;

-- TRIGGER: on_auth_user_delete
-- Purpose: Runs the above function after a row is deleted from public.users

drop trigger if exists on_auth_user_delete on public.users;

create trigger on_auth_user_delete
  after delete on public.users
  for each row execute procedure public.delete_user_from_auth();
