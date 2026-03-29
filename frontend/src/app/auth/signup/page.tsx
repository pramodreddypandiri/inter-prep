"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
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
      setSignupComplete(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-mesh relative items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(var(--card-border) 1px, transparent 1px), linear-gradient(90deg, var(--card-border) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="orb orb-accent w-72 h-72 top-1/3 right-1/4" />
        <div className="orb orb-primary w-64 h-64 bottom-1/4 left-1/3" />

        <div className="relative z-10 max-w-md px-12 animate-fade-in">
          <h2
            className="text-4xl font-extrabold leading-tight mb-4"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Your next offer
            <br />
            <span className="bg-gradient-to-r from-[var(--primary)] to-emerald-300 bg-clip-text text-transparent">
              starts here.
            </span>
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
              className="text-2xl font-bold tracking-tight block mb-8"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Interview<span className="text-[var(--primary)]">Ace</span>
            </Link>

            {signupComplete ? (
              <div className="space-y-6">
                <div className="p-5 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary-glow)]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--primary)]">
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </div>
                    <h1
                      className="text-2xl font-extrabold"
                      style={{ fontFamily: "'Syne', sans-serif" }}
                    >
                      Check your email
                    </h1>
                  </div>
                  <p className="text-sm text-[var(--muted)] leading-relaxed">
                    We&apos;ve sent a confirmation link to{" "}
                    <span className="text-[var(--foreground)] font-semibold">{email}</span>.
                    Click the link to verify your account.
                  </p>
                </div>

                <div className="space-y-3 text-sm text-[var(--muted)]">
                  <p className="font-semibold text-[var(--foreground)] text-xs uppercase tracking-wide">What to do next:</p>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Open the confirmation email from InterviewAce</li>
                    <li>Click the confirmation link to verify your account</li>
                    <li>Return here and sign in with your credentials</li>
                  </ol>
                </div>

                <p className="text-xs text-[var(--muted)]">
                  Didn&apos;t receive the email? Check your spam folder or try signing up again.
                </p>

                <Link
                  href="/auth/login"
                  className="btn-shine btn-primary w-full justify-center !py-3"
                >
                  Go to Sign In
                </Link>
              </div>
            ) : (
              <>
                <h1
                  className="text-3xl font-extrabold"
                  style={{ fontFamily: "'Syne', sans-serif" }}
                >
                  Create your account
                </h1>
                <p className="mt-2 text-[var(--muted)] text-sm">
                  Start preparing for your dream role
                </p>
              </>
            )}
          </div>

          {!signupComplete && (
            <>
              <form onSubmit={handleSignup} className="space-y-5">
                {error && (
                  <div className="p-3 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-sm animate-fade-in-scale">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="name" className="block text-xs font-semibold tracking-wide uppercase text-[var(--muted)]">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="input-base"
                    placeholder="Jane Doe"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-xs font-semibold tracking-wide uppercase text-[var(--muted)]">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input-base"
                    placeholder="you@example.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-xs font-semibold tracking-wide uppercase text-[var(--muted)]">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="input-base"
                    placeholder="Min. 6 characters"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-shine btn-primary w-full justify-center !py-3"
                >
                  {loading ? "Creating account..." : "Create Account"}
                </button>
              </form>

              <div className="divider-ornament text-xs">or</div>

              <p className="text-center text-sm text-[var(--muted)]">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-[var(--primary)] font-semibold hover:underline underline-offset-4">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
