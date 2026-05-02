import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Best-effort storage cleanup. RLS allows the user to delete their own
  // objects, but we use admin to also wipe orphans across both buckets.
  for (const bucket of ["interviews", "practice"]) {
    const { data: list } = await admin.storage.from(bucket).list(user.id);
    if (list?.length) {
      await admin.storage
        .from(bucket)
        .remove(list.map((o) => `${user.id}/${o.name}`));
    }
  }

  // The auth user delete cascades through the public.users foreign key,
  // which in turn cascades to interviews, transcripts, analyses, etc.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sign the cookie session out
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
