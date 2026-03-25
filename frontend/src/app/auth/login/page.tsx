"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-mesh relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(var(--card-border) 1px, transparent 1px), linear-gradient(90deg, var(--card-border) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-[var(--primary)] opacity-[0.06] blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-[var(--primary)] opacity-[0.05] blur-3xl" />

        <div className="relative z-10 max-w-md px-12 animate-fade-in">
          <h2
            className="text-4xl font-bold leading-tight mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Prepare with
            <br />
            <span className="italic text-[var(--primary)]">confidence.</span>
          </h2>
          <p className="text-[var(--muted)] leading-relaxed">
            AI-powered research, adaptive quizzes, and realistic mock interviews
            — everything you need to ace your next interview.
          </p>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8 animate-fade-in-up">
          <div>
            <Link
              href="/"
              className="text-2xl tracking-tight block mb-8"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Interview<span className="text-[var(--primary)]">Ace</span>
            </Link>
            <h1
              className="text-3xl font-bold"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Welcome back
            </h1>
            <p className="mt-2 text-[var(--muted)] text-sm">
              Sign in to continue preparing
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-sm animate-fade-in-scale">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-medium tracking-wide uppercase text-[var(--muted)]">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-[var(--card-border)] bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-sm"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-medium tracking-wide uppercase text-[var(--muted)]">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-[var(--card-border)] bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-sm"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-shine w-full py-3 px-4 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-all disabled:opacity-50 shadow-lg shadow-[var(--primary-glow)]"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="divider-ornament text-xs">or</div>

          <p className="text-center text-sm text-[var(--muted)]">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="text-[var(--primary)] font-medium hover:underline underline-offset-4">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
