"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/dashboard", label: "Home" },
  { href: "/upload", label: "Upload" },
  { href: "/chat", label: "Chat" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between rounded-full border border-[#26a269]/20 bg-[#081004]/75 px-4 backdrop-blur-xl sm:px-6">
        <Link
          href="/dashboard"
          className="text-lg font-semibold tracking-tight text-[#f3fff5]"
        >
          MeetingHub
        </Link>

        <nav className="hidden items-center gap-2 rounded-full  px-2 py-2 md:flex">
          {navLinks.map((link) => {
            const active =
              link.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm transition-colors",
                  active
                    ? "bg-[#26a269]/16 text-[#ffffff]"
                    : "text-[#9fd8ad] hover:bg-[#26a269]/10 hover:text-[#ffffff]",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox:
                  "w-9 h-9 ring-1 ring-[#26a269]/25 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]",
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}
