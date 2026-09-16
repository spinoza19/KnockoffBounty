"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion, useGsap, useIsomorphicLayoutEffect } from "@/lib/motion";

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const gsap = useGsap();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("no-scroll");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("no-scroll");
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useIsomorphicLayoutEffect(() => {
    if (!open || !root.current || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap
        .timeline()
        .from(".modal-veil", { opacity: 0, duration: 0.3, ease: "power2.out" })
        .from(".modal-panel", { yPercent: 4, opacity: 0, duration: 0.55, ease: "power3.out" }, "-=0.12");
    }, root);
    return () => ctx.revert();
  }, [open]);

  if (!open) return null;

  return (
    <div ref={root} className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <div
        className="modal-veil absolute inset-0"
        style={{ background: "color-mix(in srgb, var(--ink-deep) 72%, transparent)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal-panel relative w-full overflow-y-auto"
        style={{
          maxWidth: wide ? 900 : 620,
          maxHeight: "92svh",
          background: "var(--bg)",
          border: "1px solid var(--line-strong)",
          margin: "0 auto",
        }}
      >
        <div
          className="sticky top-0 flex items-start justify-between gap-6 p-6"
          style={{ background: "var(--bg)", borderBottom: "1px solid var(--line)" }}
        >
          <div>
            {eyebrow && <div className="label">{eyebrow}</div>}
            <h2 className="display mt-1" style={{ fontSize: "1.9rem" }}>
              {title}
            </h2>
          </div>
          <button className="btn" style={{ paddingInline: "0.8rem" }} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
