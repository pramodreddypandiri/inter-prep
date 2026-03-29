import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "InterviewAce - AI-Powered Interview Preparation",
    template: "%s | InterviewAce",
  },
  description:
    "Prepare for interviews with AI-powered research, adaptive quizzes, and realistic mock interviews tailored to your target role.",
  keywords: [
    "interview preparation",
    "AI interview prep",
    "mock interviews",
    "interview practice",
    "job interview",
    "career preparation",
  ],
  authors: [{ name: "InterviewAce" }],
  creator: "InterviewAce",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://myinterviewprep.vercel.app"
  ),
  openGraph: {
    title: "InterviewAce - AI-Powered Interview Preparation",
    description:
      "Ace your next interview with AI-powered research, adaptive quizzes, and realistic mock interviews.",
    siteName: "InterviewAce",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "InterviewAce - AI-Powered Interview Preparation",
    description:
      "Ace your next interview with AI-powered research, adaptive quizzes, and realistic mock interviews.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=Syne:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
