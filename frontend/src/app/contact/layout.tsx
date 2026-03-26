import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the InterviewAce team. Report bugs, share feedback, or request support for your interview preparation.",
  openGraph: {
    title: "Contact Us | InterviewAce",
    description:
      "Reach out to the InterviewAce team for feedback, bug reports, or support.",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
