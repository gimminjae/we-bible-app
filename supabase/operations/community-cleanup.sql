-- Run after deploying community-attachment-cleanup and creating these Vault secrets:
-- community_project_url: https://<project-ref>.supabase.co
-- community_cleanup_secret: identical to the Edge Function's COMMUNITY_CLEANUP_SECRET
-- Enable pg_cron and pg_net in the Supabase dashboard first.
do $$
begin
  if not exists(select 1 from vault.decrypted_secrets where name='community_project_url')
    or not exists(select 1 from vault.decrypted_secrets where name='community_cleanup_secret') then
    raise exception 'Create the community Vault secrets before scheduling cleanup';
  end if;
end $$;
select cron.schedule('community-attachment-cleanup','15 * * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='community_project_url') || '/functions/v1/community-attachment-cleanup',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' ||
      (select decrypted_secret from vault.decrypted_secrets where name='community_cleanup_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
$job$);
