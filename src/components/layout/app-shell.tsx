"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/client/api";
import { useUI, useWorkspace } from "@/lib/client/store";
import { applyTheme, useHotkey } from "@/lib/client/hooks";
import type { Workspace } from "@/lib/client/types";
import { ConfirmHost } from "@/components/ui/dialog";
import { Spinner, Toaster } from "@/components/ui/misc";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { QuickCapture } from "./quick-capture";
import { CommandPalette } from "./command-palette";
import { CreateDialogs } from "@/components/forms/create-dialogs";
import { Onboarding } from "./onboarding";
import { TaskDrawer } from "@/components/tasks/task-drawer";
import { cn } from "@/lib/utils";

export type ShellUser = { id: string; name: string; email: string; theme: string };

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const { id: wsId, set: setWs } = useWorkspace();
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const { sidebarOpen, setSidebar, setCapture, setPalette } = useUI();

  useEffect(() => {
    applyTheme(user.theme);
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => (localStorage.getItem("nodera-theme") ?? "system") === "system" && applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [user.theme]);

  useEffect(() => {
    api<{ workspaces: Workspace[] }>("/api/workspaces", { ws: null })
      .then(({ workspaces }) => {
        setWorkspaces(workspaces);
        const current = useWorkspace.getState().id;
        if (!current || !workspaces.some((w) => w.id === current)) setWs(workspaces[0]?.id);
      })
      .catch((e) => setError(e.message));
  }, [setWs]);

  useEffect(() => setSidebar(false), [pathname, setSidebar]);
  useHotkey("q", (e) => { e.preventDefault(); setCapture(true); });
  useHotkey("mod+k", (e) => { e.preventDefault(); setPalette(true); }, { allowInInputs: true });
  useHotkey("/", (e) => { e.preventDefault(); setPalette(true); });

  const fullBleed = /^\/(maps|graph)\/?[^/]*$/.test(pathname) && pathname !== "/maps";

  if (error) return <div className="grid h-screen place-items-center text-sm text-danger">Could not load your workspace: {error}</div>;
  if (!workspaces || !wsId) return <div className="grid h-screen place-items-center"><Spinner className="size-7" /></div>;

  return (
    <div className="flex h-dvh overflow-hidden">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:m-2 focus:rounded focus:bg-surface focus:p-2">Skip to content</a>
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden animate-fade-in" onClick={() => setSidebar(false)} />}
      <Sidebar workspaces={workspaces} onWorkspacesChange={setWorkspaces} className={cn("fixed inset-y-0 left-0 z-40 transition-transform lg:static lg:translate-x-0", sidebarOpen ? "translate-x-0" : "-translate-x-full")} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} />
        <main id="main" key={wsId} className={cn("flex-1 min-h-0", fullBleed ? "relative overflow-hidden" : "overflow-y-auto")}>
          {fullBleed ? children : <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</div>}
        </main>
      </div>
      <QuickCapture />
      <CommandPalette />
      <CreateDialogs />
      <TaskDrawer />
      <Onboarding />
      <ConfirmHost />
      <Toaster />
    </div>
  );
}
