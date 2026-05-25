-- Fix: Worker (service_role) must read public_results_v for /public/candidates
GRANT SELECT ON public.public_results_v TO service_role;
