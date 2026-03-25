"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Plus } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="glass border-b border-[var(--card-border)] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="text-xl tracking-tight transition-opacity hover:opacity-80"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Interview<span className="text-[var(--primary)]">Ace</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/sessions/new"
            className="btn-shine flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] transition-all shadow-sm"
          >
            <Plus size={15} strokeWidth={2.5} />
            New Session
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-2 text-[var(--muted)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--surface)] transition-all"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}
