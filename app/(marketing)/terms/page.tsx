export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <div className="container max-w-2xl py-20 prose prose-neutral">
      <h1>Terms of Service</h1>
      <p className="text-sm text-muted-foreground">Last updated: April 2026</p>
      <p>
        By using Stagehand you agree to upload only recordings of conversations you legally have
        the right to record and analyze. You retain all rights to your content.
      </p>
      <h2>Acceptable use</h2>
      <p>
        Stagehand is a coaching tool. Do not use it to record live interviews without consent or
        to analyze content you do not own. Don&apos;t attempt to reverse-engineer the service.
      </p>
      <h2>Refunds</h2>
      <p>7-day money-back guarantee on all paid plans. Email hello@stagehand.app.</p>
      <h2>Liability</h2>
      <p>
        AI feedback is informational and may be incorrect. We make no warranty that using
        Stagehand will result in any specific job outcome.
      </p>
    </div>
  );
}
