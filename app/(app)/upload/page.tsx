import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { userCanAnalyze } from "@/lib/billing";
import { UploadFlow } from "./upload-flow";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const can = profile ? userCanAnalyze(profile) : { allowed: false, reason: "Profile missing" };

  if (!can.allowed) {
    return (
      <div className="container max-w-xl py-20">
        <Card>
          <CardContent className="p-10 text-center">
            <h1 className="text-2xl font-bold">Upgrade to keep going</h1>
            <p className="mt-2 text-muted-foreground">{can.reason}</p>
            <Button asChild size="lg" className="mt-6">
              <Link href="/pricing">See plans</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-10">
      <h1 className="text-3xl font-bold tracking-tight">Analyze a new interview</h1>
      <p className="mt-1 text-muted-foreground">
        Two quick steps. We&apos;ll have your report ready in 2-5 minutes.
      </p>
      <div className="mt-8">
        <UploadFlow userId={user.id} />
      </div>
    </div>
  );
}
