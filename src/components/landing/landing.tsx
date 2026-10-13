"use client";
import "@fontsource-variable/onest";
import "./landing.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { setLocale } from "@/lib/i18n";
import { COPY, type LandingLang } from "./i18n";
import { LandingCtx } from "./ui";
import { Header } from "./header";
import { Hero } from "./hero";
import { Problem } from "./problem";
import { Steps } from "./steps";
import { Audience } from "./audience";
import { Features } from "./features";
import { Privacy } from "./privacy";
import { FAQ } from "./faq";
import { CTA } from "./cta";
import { Footer } from "./footer";
import { VideoModal } from "./video-modal";

const KEY = "nodera-locale";

/** Marketing home page. Ukrainian by default; the choice is shared with the app (same storage key). */
export function Landing({ signedIn }: { signedIn: boolean }) {
  const [lang, setLangState] = useState<LandingLang>("uk");
  const [video, setVideo] = useState(false);
  useEffect(() => {
    try { if (localStorage.getItem(KEY) === "en") setLangState("en"); } catch {}
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = useCallback((l: LandingLang) => {
    setLangState(l);
    setLocale(l); // keeps login/register in the same language
  }, []);
  const openVideo = useCallback(() => setVideo(true), []);
  const closeVideo = useCallback(() => setVideo(false), []);
  const ctx = useMemo(() => ({ lang, setLang, t: COPY[lang], openVideo, signedIn }), [lang, setLang, openVideo, signedIn]);
  return (
    <LandingCtx.Provider value={ctx}>
      <div className="landing min-h-dvh overflow-x-clip">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-white focus:px-4 focus:py-2">{lang === "uk" ? "До змісту" : "Skip to content"}</a>
        <Header />
        <main id="main">
          <Hero />
          <Problem />
          <Steps />
          <Audience />
          <Features />
          <Privacy />
          <FAQ />
          <CTA />
        </main>
        <Footer />
        <VideoModal open={video} onClose={closeVideo} />
      </div>
    </LandingCtx.Provider>
  );
}
