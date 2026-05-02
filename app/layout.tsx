import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "Stagehand — Stop guessing why you didn't get the job",
    template: "%s · Stagehand",
  },
  description:
    "Upload your interview recording. Get brutally honest AI feedback in 60 seconds. Land the next one.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "Stagehand",
    description: "Brutally honest AI feedback on your interview recordings.",
    url: "/",
    siteName: "Stagehand",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
