"use client";
import { tr } from "@/lib/i18n";
import { BILLING_URL, planName, useBilling } from "@/lib/client/billing";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CalendarPlus, CreditCard, CheckSquare, FilePlus2, FolderPlus, Goal, Lightbulb, LogOut, Menu, Moon, Plus, Repeat, Search, Settings, Sun, Workflow, Zap } from "lucide-react";
import { api, patch, useApi } from "@/lib/client/api";
import { useUI } from "@/lib/client/store";
import { applyTheme } from "@/lib/client/hooks";
import { ago } from "@/lib/client/format";
import { LanguageSwitcher } from "./language-switcher";
import { Button } from "@/components/ui/button";
import { Kbd, MenuItem, MenuSeparator, Popover, Tooltip } from "@/components/ui/misc";
import type { ShellUser } from "./app-shell";

interface Notifications { notifications: { id: string; title: string; remindAt: string; readAt: string | null; taskId: string | null; habitId: string | null; eventId: string | null }[]; unread: number }

export function Topbar({ user }: { user: ShellUser }) {
  const router = useRouter();
  const { setCapture, setPalette, setSidebar, openCreate } = useUI();
  const { data: notes, mutate } = useApi<Notifications>("/api/reminders", { refreshInterval: 60_000 });
  const toggleTheme = () => {
    const dark = document.documentElement.classList.contains("dark");
    const next = dark ? "light" : "dark";
    applyTheme(next);
    patch("/api/me", { theme: next }).catch(() => {});
  };
  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };
  return (
    <header className="h-14 shrink-0 border-b border-border bg-surface/80 backdrop-blur flex items-center gap-2 px-3 sm:px-4">
      <Button variant="ghost" size="icon" className="lg:hidden" aria-label={tr("Open menu")} onClick={() => setSidebar(true)}><Menu className="size-5" /></Button>
      <button data-tour="search" onClick={() => setPalette(true)} className="flex-1 max-w-md flex items-center gap-2 h-9 rounded-lg border border-border bg-surface-2/60 px-3 text-sm text-muted hover:border-border-strong transition-colors" aria-label={tr("Search")}>
        <Search className="size-4" />
        <span className="flex-1 text-left truncate">{tr("Search everything…")}</span>
        <span className="hidden sm:flex gap-0.5"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
      </button>
      <div className="flex-1" />
      <Tooltip label={tr("Quick capture (Q)")} side="bottom">
        <Button data-tour="capture" variant="soft" size="sm" onClick={() => setCapture(true)} className="hidden sm:inline-flex"><Zap className="size-4" />{" "}{tr("Capture")}</Button>
      </Tooltip>
      <Button variant="soft" size="icon" className="sm:hidden" onClick={() => setCapture(true)} aria-label={tr("Quick capture")}><Zap className="size-4" /></Button>
      <Popover align="end" trigger={({ toggle }) => <Button data-tour="create" variant="primary" size="sm" onClick={toggle} aria-label={tr("Create")}><Plus className="size-4" /><span className="hidden sm:inline">{tr("New")}</span></Button>}>
        {(close) => {
          const go = (fn: () => void) => () => { close(); fn(); };
          return (
            <>
              <MenuItem icon={<Lightbulb />} onClick={go(() => setCapture(true))} shortcut="Q">{tr("Thought")}</MenuItem>
              <MenuItem icon={<FilePlus2 />} onClick={go(() => openCreate("note"))}>{tr("Note")}</MenuItem>
              <MenuItem icon={<Workflow />} onClick={go(() => openCreate("map"))}>{tr("Mind map")}</MenuItem>
              <MenuSeparator />
              <MenuItem icon={<CheckSquare />} onClick={go(() => openCreate("task"))}>{tr("Task")}</MenuItem>
              <MenuItem icon={<FolderPlus />} onClick={go(() => openCreate("project"))}>{tr("Project")}</MenuItem>
              <MenuItem icon={<Goal />} onClick={go(() => openCreate("goal"))}>{tr("Goal")}</MenuItem>
              <MenuItem icon={<Repeat />} onClick={go(() => openCreate("habit"))}>{tr("Habit")}</MenuItem>
              <MenuItem icon={<CalendarPlus />} onClick={go(() => openCreate("event"))}>{tr("Calendar event")}</MenuItem>
              <MenuSeparator />
              <MenuItem icon={<FolderPlus />} onClick={go(() => openCreate("folder"))}>{tr("Folder")}</MenuItem>
            </>
          );
        }}
      </Popover>
      <ProButton />
      <Popover align="end" className="w-80" onOpenChange={(o) => { if (!o && notes?.unread) patch("/api/reminders", {}).then(() => mutate()); }}
        trigger={({ toggle }) => (
          <Button variant="ghost" size="icon" onClick={toggle} aria-label={notes?.unread ? tr("Notifications ({n} unread)", { n: notes.unread }) : tr("Notifications")} className="relative">
            <Bell className="size-[18px]" />
            {!!notes?.unread && <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-danger text-[10px] font-semibold text-white grid place-items-center">{notes.unread}</span>}
          </Button>
        )}>
        <div className="px-2.5 py-2 text-sm font-semibold">{tr("Notifications")}</div>
        {!notes?.notifications.length && <p className="px-2.5 pb-3 text-sm text-muted">{tr("You’re all caught up. Reminders for habits, due tasks and events appear here.")}</p>}
        {notes?.notifications.map((n) => (
          <Link key={n.id} href={n.taskId ? `/tasks?task=${n.taskId}` : n.habitId ? "/habits" : "/calendar"} className="flex gap-2.5 rounded-lg px-2.5 py-2 hover:bg-surface-2">
            <span className={`mt-1.5 size-2 rounded-full shrink-0 ${n.readAt ? "bg-transparent" : "bg-accent"}`} />
            <span className="min-w-0">
              <span className="block text-sm leading-snug">{n.title}</span>
              <span className="text-xs text-muted">{ago(n.remindAt)}</span>
            </span>
          </Link>
        ))}
      </Popover>
      <Popover align="end" trigger={({ toggle }) => (
        <button data-tour="account" onClick={toggle} className="size-8 rounded-full bg-accent text-accent-fg text-sm font-semibold grid place-items-center" aria-label={tr("Account menu")}>
          {user.name.slice(0, 1).toUpperCase()}
        </button>
      )}>
        {(close) => (
          <>
            <div className="px-2.5 py-2">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted">{user.email}</p>
            </div>
            <div className="px-2.5 pb-2"><LanguageSwitcher className="w-full [&>button]:flex-1 [&>button]:justify-center" /></div>
            <MenuSeparator />
            <MenuItem icon={<><Moon className="dark:hidden" /><Sun className="hidden dark:block" /></>} onClick={() => { close(); toggleTheme(); }}><span className="dark:hidden">{tr("Dark mode")}</span><span className="hidden dark:inline">{tr("Light mode")}</span></MenuItem>
            <MenuItem icon={<CreditCard />} onClick={() => { close(); router.push(BILLING_URL); }}><span className="flex flex-1 items-center justify-between gap-3">{tr("Plan & billing")}<PlanTag /></span></MenuItem>
            <MenuItem icon={<Settings />} onClick={() => { close(); router.push("/settings"); }}>{tr("Settings")}</MenuItem>
            <MenuSeparator />
            <MenuItem icon={<LogOut />} onClick={logout}>{tr("Sign out")}</MenuItem>
          </>
        )}
      </Popover>
    </header>
  );
}

/** "⚡ Pro" next to the avatar — only while on the free plan. */
function ProButton() {
  const { data } = useBilling();
  if (!data || data.plan !== "FREE") return null;
  return (
    <Link href={BILLING_URL} data-tour="pro-button" className="hidden h-8 items-center gap-1 rounded-lg bg-gradient-to-br from-[#6E5BF0] to-[#4338CA] px-2.5 text-[13px] font-semibold text-white shadow-[0_4px_12px_-4px_rgba(67,56,202,.6)] hover:brightness-110 sm:inline-flex">
      <Zap className="size-3.5" />Pro
    </Link>
  );
}

function PlanTag() {
  const { data } = useBilling();
  if (!data) return null;
  return <span className="rounded-full bg-accent-soft px-1.5 py-px text-[11px] font-semibold text-accent">{planName(data.plan)}</span>;
}
