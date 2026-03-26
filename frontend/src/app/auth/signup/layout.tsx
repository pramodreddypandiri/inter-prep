import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Sign up for InterviewAce and start preparing for your next interview with AI-powered research, adaptive quizzes, and mock interviews.",
  openGraph: {
    title: "Create Account | InterviewAce",
    description:
      "Join InterviewAce and prepare for interviews with AI-powered tools.",
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
