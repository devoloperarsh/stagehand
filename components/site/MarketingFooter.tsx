import Link from "next/link";
import { Logo } from "./Logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container py-12">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <Logo />
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Stop guessing why you didn&apos;t get the job. Brutally honest AI feedback on your interviews.
            </p>
          </div>
          <nav className="flex flex-wrap gap-6 text-sm">
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="text-muted-foreground hover:text-foreground">
              Terms
            </Link>
            <Link
              href="mailto:hello@stagehand.app"
              className="text-muted-foreground hover:text-foreground"
            >
              Contact
            </Link>
          </nav>
        </div>
        <div className="mt-8 flex items-center justify-between border-t border-border pt-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Stagehand</span>
          <span>Made for job seekers, by job seekers.</span>
        </div>
      </div>
    </footer>
  );
}
