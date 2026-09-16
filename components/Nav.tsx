"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";
import { WalletButton } from "./WalletButton";

const LINKS = [
  { href: "/#registry", label: "Registry" },
  { href: "/#docket", label: "Docket" },
  { href: "/#rubric", label: "The rubric" },
];

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      className="btn"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      style={{ paddingInline: "0.9rem" }}
    >
      {theme === "dark" ? "Paper" : "Press"}
    </button>
  );
}

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 no-print"
      style={{
        background: scrolled ? "color-mix(in srgb, var(--bg) 88%, transparent)" : "transparent",
        backdropFilter: scrolled ? "blur(10px)" : "none",
        borderBottom: scrolled ? "1px solid var(--line)" : "1px solid transparent",
        transition: "all 0.45s var(--ease)",
      }}
    >
      <div className="shell flex items-center justify-between gap-4 py-4">
        <Link href="/" className="display" style={{ fontSize: "1.05rem", letterSpacing: "0.01em" }}>
          Knockoff<span style={{ opacity: 0.45 }}>Bounty</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="label link-underline">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          <WalletButton compact />
        </div>

        <button
          className="btn md:hidden"
          style={{ paddingInline: "0.8rem" }}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Menu"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <div className="md:hidden shell pb-6 flex flex-col gap-4" style={{ background: "var(--bg)" }}>
          <div className="rule" />
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="label" onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <div className="flex gap-2 pt-2">
            <ThemeToggle />
            <WalletButton compact />
          </div>
        </div>
      )}
    </header>
  );
}
