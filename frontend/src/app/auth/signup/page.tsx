"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
      },
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
        <div className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-[var(--primary)] opacity-[0.06] blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 rounded-full bg-[var(--primary)] opacity-[0.05] blur-3xl" />

        <div className="relative z-10 max-w-md px-12 animate-fade-in">
          <h2
            className="text-4xl font-bold leading-tight mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Your next offer
            <br />
            <span className="italic text-[var(--primary)]">starts here.</span>
          </h2>
          <p className="text-[var(--muted)] leading-relaxed">
            Join candidates who are preparing smarter with AI-generated materials,
            practice interviews, and personalized feedback.
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
              Create your account
            </h1>
            <p className="mt-2 text-[var(--muted)] text-sm">
              Start preparing for your dream role
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-sm animate-fade-in-scale">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-xs font-medium tracking-wide uppercase text-[var(--muted)]">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-[var(--card-border)] bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-sm"
                placeholder="Jane Doe"
              />
            </div>

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
                minLength={6}
                className="w-full px-4 py-3 rounded-lg border border-[var(--card-border)] bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-sm"
                placeholder="Min. 6 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-shine w-full py-3 px-4 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-all disabled:opacity-50 shadow-lg shadow-[var(--primary-glow)]"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="divider-ornament text-xs">or</div>

          <p className="text-center text-sm text-[var(--muted)]">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-[var(--primary)] font-medium hover:underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
