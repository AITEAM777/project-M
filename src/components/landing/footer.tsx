"use client";
import { Logo, useLanding } from "./ui";

export function Footer() {
  const { t, lang } = useLanding();
  // Point these at real pages / a real contact address once they exist.
  const links = [["#how", t.footer.about], ["#privacy", t.footer.privacy], ["#privacy", t.footer.terms], ["#faq", t.footer.contact]] as const;
  return (
    <footer className="border-t border-[var(--border)]">
      <div className="l-container flex flex-col items-center gap-6 py-10 md:flex-row md:justify-between">
        <a href="#top" aria-label="Nodera"><Logo size={26} /></a>
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-[14px] text-[var(--text-muted)]">
          <a href={`/guide?lang=${lang}`} className="font-medium text-[var(--text)] hover:underline">{t.guide.footer}</a>
          {links.map(([href, label]) => <a key={label} href={href} className="hover:text-[var(--text)]">{label}</a>)}
        </nav>
        <p className="text-[13.5px] text-[var(--text-soft)]">© 2026 Nodera</p>
      </div>
    </footer>
  );
}
