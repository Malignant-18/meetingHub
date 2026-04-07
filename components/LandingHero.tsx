"use client";

import { useEffect } from "react";
import Link from "next/link";

import Plasma from "@/components/Plasma";
import { DASHBOARD_TOUR_SESSION_KEY } from "@/components/DashboardOnboarding";

const navLinks = [
  { href: "/dashboard", label: "Home" },
  { href: "/upload", label: "Upload" },
  { href: "/chat", label: "Chat" },
];

export default function LandingHero() {
  useEffect(() => {
    window.sessionStorage.removeItem(DASHBOARD_TOUR_SESSION_KEY);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050a00] text-[#d5f5dc]">
      <div className="absolute inset-0 overflow-hidden opacity-60">
        <div className="absolute left-1/2 top-1/2 h-[110vmax] w-[110vmax] min-h-screen min-w-screen -translate-x-1/2 -translate-y-1/2">
          <Plasma
            color="#26a269"
            speed={0.8}
            direction="forward"
            scale={0.5}
            opacity={0.6}
            mouseInteractive={false}
          />
        </div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="px-4 pt-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between rounded-full border border-[#26a269]/20 bg-[#081004]/75 px-4 backdrop-blur-xl sm:px-6">
            <Link
              href="/"
              className="text-lg font-semibold tracking-tight text-[#f3fff5]"
            >
              Mr.Minutes
            </Link>

            <nav className="hidden items-center gap-2 rounded-full   px-2 py-2 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="rounded-full px-4 py-2 text-sm text-[#9fd8ad] transition-colors hover:bg-[#26a269]/10 hover:text-[#f3fff5]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href="/sign-in"
                className="rounded-full border border-[#26a269]/25 px-4 py-2 text-sm text-[#c8efd0] transition-colors hover:border-[#26a269]/55 hover:text-white"
              >
                Log in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-full bg-[#26a269] px-4 py-2 text-sm font-medium text-[#041102] transition-colors hover:bg-[#30bb77]"
              >
                Sign up
              </Link>
            </div>
          </div>
        </header>

        <section className="flex flex-1 items-center px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-4xl justify-center">
            <div className="max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#26a269]/20 bg-[#0c1507]/75 px-4 py-2 text-sm text-[#9fd8ad] backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-[#26a269]" />
                AI meeting intelligence that starts with the transcript
              </div>

              <h1 className="mt-8 text-5xl font-semibold leading-[0.96] tracking-[-0.05em] text-[#f6fff7] sm:text-6xl lg:text-7xl">
                Mr.Minutes
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#a4c9ac] sm:text-xl">
                Upload transcripts, extract what matters, track follow-ups, and
                understand the tone of every meeting from one workspace.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/sign-up"
                  className="plasma-button plasma-button-secondary inline-flex items-center justify-center rounded-full px-6 py-3.5 text-base font-medium text-[#041102] transition-transform hover:scale-[1.02]"
                >
                  Sign up
                </Link>
                <Link
                  href="/sign-in"
                  className="plasma-button-outline inline-flex items-center justify-center rounded-full px-6 py-3.5 text-base font-medium text-white transition-transform hover:scale-[1.02]"
                >
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
