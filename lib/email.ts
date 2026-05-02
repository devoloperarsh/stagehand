import { Resend } from "resend";

let _client: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (_client) return _client;
  _client = new Resend(process.env.RESEND_API_KEY);
  return _client;
}

const FROM = process.env.RESEND_FROM_EMAIL ?? "Stagehand <hello@stagehand.app>";

export async function sendAnalysisReadyEmail(args: {
  to: string;
  interviewTitle: string;
  reportUrl: string;
}) {
  const resend = getResend();
  if (!resend) return;
  await resend.emails.send({
    from: FROM,
    to: args.to,
    subject: `Your Stagehand report is ready — ${args.interviewTitle}`,
    html: `<p>Hey,</p>
<p>Your interview analysis for <strong>${args.interviewTitle}</strong> is ready.</p>
<p><a href="${args.reportUrl}">View your report →</a></p>
<p>— Stagehand</p>`,
  });
}

export async function sendWelcomeEmail(args: { to: string; name?: string | null }) {
  const resend = getResend();
  if (!resend) return;
  const name = args.name?.split(" ")[0] ?? "there";
  await resend.emails.send({
    from: FROM,
    to: args.to,
    subject: "Welcome to Stagehand",
    html: `<p>Hey ${name},</p>
<p>You've got 1 free interview analysis on us. Upload a recording and get brutally honest AI feedback in 60 seconds.</p>
<p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/upload">Analyze your first interview →</a></p>
<p>— Stagehand</p>`,
  });
}
