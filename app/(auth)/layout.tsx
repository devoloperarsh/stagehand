import Link from "next/link";
import { Logo } from "@/components/site/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-secondary/30">
      <header className="container flex h-16 items-center">
        <Logo />
      </header>
      <main className="container flex flex-1 items-start justify-center py-10">{children}</main>
      <footer className="container flex h-16 items-center justify-center text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          ← Back to home
        </Link>
      </footer>
    </div>
  );
}
