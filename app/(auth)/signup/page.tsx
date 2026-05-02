import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AuthForm } from "../auth-form";

export default function SignupPage() {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-8">
        <h1 className="text-2xl font-bold">Get your first analysis free</h1>
        <p className="mt-1 text-sm text-muted-foreground">No credit card required.</p>
        <div className="mt-6">
          <Suspense fallback={null}>
            <AuthForm mode="signup" />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </p>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          By signing up you agree to our{" "}
          <Link href="/terms" className="underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
