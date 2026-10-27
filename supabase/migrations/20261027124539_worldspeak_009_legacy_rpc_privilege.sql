-- Forward-only: remove the retained hosted service-role grant on the legacy alias.
-- The supported SECURITY DEFINER wrapper keeps its existing grants and owner call.
revoke execute on function public.submit_legacy_inference_job(uuid,text,uuid,text) from service_role;
