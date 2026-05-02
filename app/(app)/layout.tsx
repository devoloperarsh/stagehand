import { redirect } from "next/navigation";
import { AppNav } from "@/components/site/AppNav";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("email, full_name, subscription_tier")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppNav
        email={profile?.email ?? user.email ?? ""}
        fullName={profile?.full_name ?? null}
        tier={profile?.subscription_tier ?? "free"}
      />
      <main className="flex-1">{children}</main>
    </div>
  );
}
