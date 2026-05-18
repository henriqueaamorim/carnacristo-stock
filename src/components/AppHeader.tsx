"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SignOutButton } from "@/components/SignOutButton";

export type NavLink = { href: string; label: string };

type Props = {
  links: NavLink[];
  userDisplayName: string;
  userEmail?: string | null;
  maxWidthClass?: string;
};

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function linkClassName(pathname: string, href: string, mobile = false) {
  const active = isActive(pathname, href);
  const base = mobile
    ? "block rounded-lg px-3 py-2.5 text-base"
    : "hover:underline";
  return active
    ? `${base} font-medium text-emerald-400`
    : `${base} text-slate-300`;
}

export function AppHeader({
  links,
  userDisplayName,
  userEmail,
  maxWidthClass = "max-w-6xl",
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className={`mx-auto flex w-full items-center justify-between gap-3 px-4 py-3 ${maxWidthClass}`}>
        <button
          type="button"
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-600 p-2 text-slate-200 hover:bg-slate-800 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav-drawer"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>

        <nav className="hidden items-center gap-4 text-sm md:flex" aria-label="Principal">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={linkClassName(pathname, link.href)}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span
            className="max-w-[120px] truncate text-sm font-medium text-slate-200 sm:max-w-[200px] md:max-w-xs"
            title={userEmail ?? undefined}
          >
            {userDisplayName}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] bg-black/60 md:hidden"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          />
          <nav
            id="mobile-nav-drawer"
            className="fixed left-0 top-0 z-[70] flex h-full w-[min(280px,85vw)] flex-col border-r border-slate-700 bg-[#020617] p-4 shadow-2xl md:hidden"
            aria-label="Menu mobile"
          >
            <div className="mb-4 flex items-center justify-between border-b border-slate-700 pb-3">
              <span className="text-sm font-semibold text-slate-200">Menu</span>
              <button
                type="button"
                className="rounded-lg border border-slate-600 p-1.5 text-slate-200 hover:bg-slate-800"
                aria-label="Fechar menu"
                onClick={() => setOpen(false)}
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <ul className="space-y-1">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={linkClassName(pathname, link.href, true)}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </>
      ) : null}
    </>
  );
}
