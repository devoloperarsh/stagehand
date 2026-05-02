import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { ProfileForm } from "./profile-form";
import { SubscriptionPanel } from "./subscription-panel";
import { DeleteDataButton } from "./delete-data-button";
import type { UserRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single<UserRow>();
  if (!profile) redirect("/login");

  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <section className="mt-8 space-y-2">
        <h2 className="text-lg font-semibold">Profile</h2>
        <Card>
          <CardContent className="p-6">
            <ProfileForm
              email={profile.email}
              fullName={profile.full_name}
              userId={profile.id}
            />
          </CardContent>
        </Card>
      </section>

      <section className="mt-10 space-y-2">
        <h2 className="text-lg font-semibold">Subscription</h2>
        <Card>
          <CardContent className="p-6">
            <SubscriptionPanel profile={profile} />
          </CardContent>
        </Card>
      </section>

      <section className="mt-10 space-y-2">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Email notifications when reports are ready are enabled by default.
            Per-channel controls are coming in V1.1.
          </CardContent>
        </Card>
      </section>

      <section className="mt-10 space-y-2">
        <h2 className="text-lg font-semibold text-destructive">Danger zone</h2>
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all uploaded interviews, transcripts, and
              analyses. This cannot be undone.
            </p>
            <DeleteDataButton />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
