"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Plus, MessageSquare, Menu, X } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="glass border-b border-[var(--card-border)] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="text-xl font-bold tracking-tight transition-opacity hover:opacity-80"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          Interview<span className="text-[var(--primary)]">Ace</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1.5">
          <a
            href="https://github.com/pramodreddypandiri/inter-prep"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-[var(--muted)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--surface)] transition-all text-sm"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          </a>
          <Link
            href="/contact"
            className="flex items-center gap-1.5 px-3 py-2 text-[var(--muted)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--surface)] transition-all text-sm"
          >
            <MessageSquare size={15} />
            <span className="hidden lg:inline">Contact</span>
          </Link>
          <Link
            href="/sessions/new"
            className="btn-shine btn-primary ml-1"
          >
            <Plus size={15} strokeWidth={2.5} />
            New Session
          </Link>
          <button
            onClick={handleSignOut}
            aria-label="Sign out"
            className="flex items-center gap-1.5 px-3 py-2 text-[var(--muted)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--surface)] transition-all text-sm ml-0.5"
          >
            <LogOut size={15} aria-hidden="true" />
          </button>
        </div>

        {/* Mobile: New Session + Hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/sessions/new"
            aria-label="New session"
            className="btn-primary !py-2 !px-3 !text-xs"
          >
            <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-[var(--muted)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--surface)] transition-all"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--card-border)] bg-[var(--card)] animate-fade-in-scale">
          <div className="px-5 py-4 space-y-1">
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-[var(--surface)] transition-all"
            >
              Dashboard
            </Link>
            <Link
              href="/sessions/new"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-[var(--surface)] transition-all text-[var(--primary)] font-medium"
            >
              <Plus size={15} />
              New Session
            </Link>
            <Link
              href="/contact"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--muted)] rounded-lg hover:bg-[var(--surface)] transition-all"
            >
              <MessageSquare size={15} />
              Contact
            </Link>
            <a
              href="https://github.com/pramodreddypandiri/inter-prep"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--muted)] rounded-lg hover:bg-[var(--surface)] transition-all"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
            </a>
            <div className="pt-2 mt-2 border-t border-[var(--card-border)]">
              <button
                onClick={() => {
                  setMobileOpen(false);
                  handleSignOut();
                }}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--danger)] rounded-lg hover:bg-[var(--surface)] transition-all w-full"
              >
                <LogOut size={15} />
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
