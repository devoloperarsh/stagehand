import { createClient } from "@supabase/supabase-js";

// Service-role client. NEVER import from client components.
// Used by webhooks, cron, and background jobs to bypass RLS.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
