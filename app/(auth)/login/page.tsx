import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AuthForm } from "../auth-form";

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-8">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to your Stagehand account.</p>
        <div className="mt-6">
          <Suspense fallback={null}>
            <AuthForm mode="login" />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/signup" className="font-medium text-foreground hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
