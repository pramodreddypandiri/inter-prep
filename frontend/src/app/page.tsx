import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "InterviewAce",
  description:
    "AI-powered interview preparation platform with mock interviews, adaptive quizzes, and personalized research.",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "AI-powered interview research",
    "Adaptive quizzes",
    "Realistic mock interviews",
    "Personalized feedback",
  ],
};

const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
    ),
    title: "Smart Prep Materials",
    desc: "AI generates company snapshots, interview processes, and technical topics from your resume + JD.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>
    ),
    title: "Adaptive Quizzes",
    desc: "Test your knowledge with AI-generated questions that progress from basics to advanced concepts.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    ),
    title: "Mock Interviews",
    desc: "Realistic AI interviews with voice input, eye tracking coaching, and detailed performance feedback.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>
    ),
    title: "AI Feedback Reports",
    desc: "Detailed analysis of answer quality, communication, structure, and areas to improve.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen gradient-mesh flex flex-col relative overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Decorative grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(var(--card-border) 1px, transparent 1px), linear-gradient(90deg, var(--card-border) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Floating orbs */}
      <div className="orb orb-primary w-[400px] h-[400px] top-10 left-[10%]" />
      <div className="orb orb-accent w-[350px] h-[350px] top-[20%] right-[5%]" />
      <div className="orb orb-primary w-[300px] h-[300px] bottom-[10%] left-[30%]" />

      {/* Top bar */}
      <header className="relative z-10 px-6 md:px-8 py-5 flex items-center justify-between animate-fade-in">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight"
          style={{ fontFamily: "'Syne', sans-serif" }}
          aria-label="InterviewAce home"
        >
          Interview<span className="text-[var(--primary)]">Ace</span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-3 md:gap-5">
          <a
            href="https://github.com/pramodreddypandiri/inter-prep"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors hidden sm:block"
          >
            GitHub
          </a>
          <Link
            href="/contact"
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors hidden sm:block"
          >
            Contact
          </Link>
          <Link
            href="/auth/login"
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            Sign In
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 -mt-8">
        <div className="max-w-3xl text-center space-y-7">
          {/* Eyebrow badge */}
          <div className="animate-fade-in-up delay-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full accent-badge text-xs font-semibold tracking-wide uppercase mx-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
            AI-Powered Interview Prep
          </div>

          {/* Headline */}
          <h1
            className="animate-fade-in-up delay-2 text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05]"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Prepare with
            <br />
            <span className="bg-gradient-to-r from-[var(--primary)] via-emerald-300 to-[var(--primary)] bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient-shift_6s_ease_infinite]">
              confidence.
            </span>
          </h1>

          {/* Sub */}
          <p className="animate-fade-in-up delay-3 text-base md:text-lg text-[var(--muted)] max-w-lg mx-auto leading-relaxed">
            Personalized research, adaptive quizzes, and realistic mock
            interviews — all tailored to your target role.
          </p>

          {/* CTAs */}
          <div className="animate-fade-in-up delay-4 flex flex-col sm:flex-row gap-3 justify-center pt-1">
            <Link href="/auth/signup" className="btn-shine btn-primary !py-3.5 !px-8 !text-base">
              Get Started Free
            </Link>
            <Link href="/auth/login" className="btn-ghost !py-3.5 !px-8 !text-base">
              Sign In
            </Link>
          </div>

          {/* Trust */}
          <p className="animate-fade-in-up delay-5 text-xs text-[var(--muted)] pt-2">
            No credit card required &middot; 100% free &middot; Start in under 2 minutes
          </p>
        </div>
      </main>

      {/* Feature cards */}
      <section className="relative z-10 px-6 md:px-8 pb-10 pt-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`animate-fade-in-up delay-${Math.min(i + 3, 6)} gradient-border rounded-2xl bg-[var(--card)] p-5 group`}
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--primary-glow)] flex items-center justify-center text-[var(--primary)] mb-3 group-hover:bg-[var(--primary)] group-hover:text-white transition-all duration-300">
                {f.icon}
              </div>
              <h3 className="font-bold text-sm mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
                {f.title}
              </h3>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
