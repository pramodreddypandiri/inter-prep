import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
      {/* Decorative grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(var(--card-border) 1px, transparent 1px), linear-gradient(90deg, var(--card-border) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Floating decorative elements */}
      <div className="absolute top-20 left-[15%] w-72 h-72 rounded-full bg-[var(--primary)] opacity-[0.04] blur-3xl" />
      <div className="absolute bottom-20 right-[10%] w-96 h-96 rounded-full bg-[var(--primary)] opacity-[0.04] blur-3xl" />

      {/* Top bar */}
      <header className="relative z-10 px-8 py-6 flex items-center justify-between animate-fade-in">
        <h2
          className="text-xl tracking-tight"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Interview<span className="text-[var(--primary)]">Ace</span>
        </h2>
        <Link
          href="/auth/login"
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          Sign In
        </Link>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 -mt-16">
        <div className="max-w-3xl text-center space-y-8">
          {/* Eyebrow */}
          <p className="animate-fade-in-up delay-1 text-xs tracking-[0.25em] uppercase text-[var(--primary)] font-medium">
            AI-Powered Interview Preparation
          </p>

          {/* Headline */}
          <h1
            className="animate-fade-in-up delay-2 text-6xl md:text-7xl font-bold tracking-tight leading-[1.05]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Prepare with
            <br />
            <span className="italic text-[var(--primary)]">confidence.</span>
          </h1>

          {/* Subheadline */}
          <p className="animate-fade-in-up delay-3 text-lg md:text-xl text-[var(--muted)] max-w-xl mx-auto leading-relaxed">
            Personalized research, adaptive quizzes, and realistic mock
            interviews — all tailored to your target role.
          </p>

          {/* CTAs */}
          <div className="animate-fade-in-up delay-4 flex gap-4 justify-center pt-2">
            <Link
              href="/auth/signup"
              className="btn-shine px-8 py-3.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-all shadow-lg shadow-[var(--primary-glow)]"
            >
              Get Started Free
            </Link>
            <Link
              href="/auth/login"
              className="px-8 py-3.5 border border-[var(--card-border)] rounded-lg font-medium hover:bg-[var(--card)] hover:border-[var(--primary)] transition-all"
            >
              Sign In
            </Link>
          </div>

          {/* Trust line */}
          <p className="animate-fade-in-up delay-5 text-xs text-[var(--muted)] pt-4">
            No credit card required &middot; Start preparing in under 2 minutes
          </p>
        </div>
      </main>

      {/* Bottom decorative bar */}
      <footer className="relative z-10 px-8 py-6 animate-fade-in delay-6">
        <div className="flex items-center justify-center gap-8 text-xs text-[var(--muted)]">
          <span>Adaptive Quizzes</span>
          <span className="w-1 h-1 rounded-full bg-[var(--primary)] opacity-50" />
          <span>Mock Interviews</span>
          <span className="w-1 h-1 rounded-full bg-[var(--primary)] opacity-50" />
          <span>AI Research</span>
          <span className="w-1 h-1 rounded-full bg-[var(--primary)] opacity-50" />
          <span>Detailed Feedback</span>
        </div>
      </footer>
    </div>
  );
}
