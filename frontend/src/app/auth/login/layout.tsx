import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to InterviewAce to access your AI-powered interview preparation sessions, mock interviews, and adaptive quizzes.",
  openGraph: {
    title: "Sign In | InterviewAce",
    description:
      "Sign in to access your AI-powered interview preparation sessions.",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
