"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

interface Props {
  email: string;
  fullName: string | null;
  userId: string;
}

export function ProfileForm({ email, fullName, userId }: Props) {
  const router = useRouter();
  const [name, setName] = useState(fullName ?? "");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setInfo(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({ full_name: name })
      .eq("id", userId);
    setLoading(false);
    if (error) setInfo(error.message);
    else {
      setInfo("Saved.");
      router.refresh();
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} disabled className="mt-1.5" />
        <p className="mt-1.5 text-xs text-muted-foreground">
          Contact support to change your email — it requires re-verification.
        </p>
      </div>
      <div>
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5"
        />
      </div>
      {info && <p className="text-sm text-muted-foreground">{info}</p>}
      <div>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Save
        </Button>
      </div>
    </form>
  );
}
