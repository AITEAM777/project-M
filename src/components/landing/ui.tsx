"use client";
import { createContext, useContext, useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { COPY, type Copy, type LandingLang } from "./i18n";

export const SIGNUP = "/login?mode=signup";
export const LOGIN = "/login";

interface Ctx { lang: LandingLang; setLang: (l: LandingLang) => void; t: Copy; openVideo: () => void; signedIn: boolean }
export const LandingCtx = createContext<Ctx>({ lang: "uk", setLang: () => {}, t: COPY.uk, openVideo: () => {}, signedIn: false });
export const useLanding = () => useContext(LandingCtx);

/** Fades + lifts its content in once it scrolls into view. */
export function Reveal({ children, as: Tag = "div", className = "", delay = 0, id }: { children: ReactNode; as?: ElementType; className?: string; delay?: number; id?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) { setInView(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} id={id} className={`l-reveal ${inView ? "is-in" : ""} ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>{children}</Tag>;
}

export function Arrow({ className = "" }: { className?: string }) {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden><path d="M3 8h10m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function PrimaryButton({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return <a href={href} className={`l-btn l-btn-primary ${className}`}>{children}<span className="l-btn-arrow"><Arrow /></span></a>;
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#5F56B0" />
        <g stroke="#fff" strokeWidth="1.9" strokeLinecap="round" opacity=".9"><path d="M10 10.5 16 17M22 10.5 16 17M16 17v5.5" /></g>
        <circle cx="10" cy="10.5" r="2.6" fill="#fff" /><circle cx="22" cy="10.5" r="2.6" fill="#fff" /><circle cx="16" cy="17" r="3" fill="#fff" /><circle cx="16" cy="23" r="2.3" fill="#fff" />
      </svg>
      <span className="l-head text-[18px] tracking-[-0.5px]">Nodera</span>
    </span>
  );
}

export function Hi({ children }: { children: ReactNode }) {
  return <span className="l-grad">{children}</span>;
}

export function PlayIcon({ className = "" }: { className?: string }) {
  return <svg width="12" height="12" viewBox="0 0 12 12" className={className} aria-hidden><path d="M3 1.8v8.4a.6.6 0 0 0 .9.5l6.7-4.2a.6.6 0 0 0 0-1L3.9 1.3a.6.6 0 0 0-.9.5Z" fill="currentColor" /></svg>;
}
