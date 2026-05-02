export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="container max-w-2xl py-20 prose prose-neutral">
      <h1>Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: April 2026</p>
      <p>
        Stagehand is built for job seekers. Your interview recordings, transcripts, and analyses
        are private to your account, encrypted at rest, and never shared with third parties or used
        to train AI models.
      </p>
      <h2>Data we collect</h2>
      <ul>
        <li>Account info: email, name, avatar (if you sign in with Google).</li>
        <li>Audio/video files you upload, plus their derived transcripts and AI analyses.</li>
        <li>Billing metadata from Stripe / Razorpay (we never see your card number).</li>
      </ul>
      <h2>Retention</h2>
      <p>
        Audio files are deleted automatically after 90 days. You can delete everything immediately
        from Settings → Danger Zone.
      </p>
      <h2>Subprocessors</h2>
      <ul>
        <li>Supabase (database, auth, storage)</li>
        <li>Deepgram (transcription)</li>
        <li>Anthropic (analysis)</li>
        <li>Stripe / Razorpay (billing)</li>
        <li>Resend (transactional email)</li>
        <li>Vercel (hosting)</li>
      </ul>
      <h2>Contact</h2>
      <p>Questions? Email hello@stagehand.app.</p>
    </div>
  );
}
