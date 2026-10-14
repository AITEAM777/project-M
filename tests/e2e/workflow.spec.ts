import { expect, test, type Page } from "@playwright/test";

/**
 * The MVP acceptance workflow:
 * account → folder → note (persisted across reload) → goal → mind map node + connection
 * → convert node to task assigned to goal → complete task → goal progress updates.
 */
const email = `e2e+${Date.now()}@nodera.test`;
const password = "correct-horse-battery";

/** The server runs with AUTH_DEV_CODES=1, so the emailed code is also shown on screen. */
async function enterEmailCode(page: Page, label: string | RegExp = /Code from the email|Код з листа/) {
  const code = (await page.getByTestId("dev-code").textContent())!.trim();
  await page.getByLabel(label).fill(code);
}

async function signUp(page: Page, name: string, mail: string, uk = false) {
  await page.goto("/register");
  if (uk) await page.getByRole("radio", { name: /UA/ }).click();
  await page.getByLabel(uk ? "Ім'я" : "Name").fill(name);
  await page.getByLabel(uk ? "Ел. пошта" : "Email").fill(mail);
  await page.getByLabel(uk ? "Пароль" : "Password").fill(password);
  await page.getByRole("button", { name: uk ? "Створити акаунт" : "Create account" }).click();
  await enterEmailCode(page);
  await page.waitForURL("**/dashboard");
}

async function register(page: Page) {
  await signUp(page, "E2E Tester", email);
  await page.getByText("Let's show you around").waitFor();
  await page.getByRole("button", { name: "Skip", exact: true }).click();
}

test("complete MVP workflow", async ({ page }) => {
  await register(page);
  await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening|night), E2E/ })).toBeVisible();

  // Folder
  await page.getByRole("button", { name: "New folder" }).click();
  await page.getByLabel("Name").fill("Fitness lab");
  await page.getByRole("button", { name: "Create folder" }).click();
  await page.waitForURL("**/folders/**");
  await expect(page.getByRole("heading", { name: "Fitness lab" })).toBeVisible();

  // Note, inside the folder; persisted after reload
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByRole("button", { name: "Note" }).click();
  await page.waitForURL("**/notes/**");
  await page.getByLabel("Title").fill("Training principles");
  await page.locator(".ProseMirror").click();
  await page.keyboard.type("Progressive overload beats intensity.");
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(400);
  await page.reload();
  await expect(page.getByLabel("Title")).toHaveValue("Training principles");
  await expect(page.locator(".ProseMirror")).toContainText("Progressive overload beats intensity.");

  // Goal with a milestone
  await page.getByRole("button", { name: "Create" }).click();
  await page.getByRole("button", { name: "Goal" }).click();
  await page.getByLabel("Goal").fill("Improve physical fitness");
  await page.getByPlaceholder("Milestone 1").fill("Create a training schedule");
  await page.getByRole("button", { name: "Create goal" }).click();
  await page.waitForURL("**/goals/**");
  const goalUrl = page.url();
  await expect(page.getByRole("heading", { name: "Improve physical fitness" })).toBeVisible();

  // Mind map with two nodes and a connection
  await page.goto("/maps");
  await page.getByRole("button", { name: "New map" }).click();
  await page.getByLabel("Title").fill("Fitness map");
  await page.getByRole("button", { name: "Create map" }).click();
  await page.waitForURL("**/maps/**");
  await page.locator(".react-flow__node").first().waitFor();
  const pane = page.locator(".react-flow__pane");
  await pane.dblclick({ position: { x: 300, y: 650 } });
  await expect(page.getByLabel("Node title")).toBeFocused();
  await page.keyboard.type("Run 3x per week");
  await page.keyboard.press("Enter");
  await expect(page.locator(".react-flow__node", { hasText: "Run 3x per week" })).toBeVisible();
  // connect: drag from the new node's right handle onto the root node
  const newNode = page.locator(".react-flow__node", { hasText: "Run 3x per week" });
  const root = page.locator(".react-flow__node", { hasText: "Fitness map" });
  await newNode.hover();
  const handle = newNode.locator(".react-flow__handle-right");
  const hb = (await handle.boundingBox())!;
  const rb = (await root.boundingBox())!;
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2, { steps: 12 });
  await page.mouse.move(rb.x + rb.width / 2 + 2, rb.y + rb.height / 2, { steps: 2 });
  await page.mouse.up();
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });

  // Convert node → task assigned to goal
  await newNode.click();
  await page.getByLabel("…supporting goal (optional)").selectOption({ label: "Improve physical fitness" });
  await page.getByRole("button", { name: /Make task/ }).click();
  await expect(page.getByText("Turned into a task")).toBeVisible();

  // Reopen map — node, connection and link persist
  await page.reload();
  await expect(page.locator(".react-flow__node", { hasText: "Run 3x per week" })).toBeVisible();
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
  await expect(page.locator(".react-flow__node", { hasText: "Run 3x per week" }).getByRole("button", { name: "Mark task as done" })).toBeVisible();

  // Goal shows the task; complete it and progress updates (1 milestone + 1 task → 50%)
  await page.goto(goalUrl);
  await expect(page.getByText("Run 3x per week")).toBeVisible();
  await expect(page.locator('svg[aria-label="0%"]').first()).toBeVisible();
  await page.getByRole("checkbox", { name: "Mark as done" }).click();
  await expect(page.locator('svg[aria-label="50%"]').first()).toBeVisible();

  // Navigate goal → task details → the map node it lives on
  await page.getByRole("button", { name: /Run 3x per week/ }).click();
  await page.getByRole("complementary", { name: "Task details" }).getByRole("link", { name: "Fitness map" }).click();
  await page.waitForURL("**/maps/**node=**");
  await expect(page.locator(".react-flow__node.selected", { hasText: "Run 3x per week" })).toBeVisible();

  // Dashboard reflects progress
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: /Improve physical fitness/ }).first()).toBeVisible();
  await expect(page.getByText("1 done today")).toBeVisible();

  // Sign out and back in: data persists
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
  await page.goto("/notes");
  await expect(page.getByText("Training principles")).toBeVisible();
});

test("other users cannot read my data", async ({ page, request }) => {
  await page.goto("/login");
  const res = await request.get("/api/notes?ws=someone-elses-workspace");
  expect(res.status()).toBe(401);
});

test("workspace data is isolated between accounts", async ({ playwright, baseURL }) => {
  const mk = async (tag: string) => {
    const ctx = await playwright.request.newContext({ baseURL });
    const mail = `${tag}+${Date.now()}@nodera.test`;
    const r = await ctx.post("/api/auth/register", { data: { name: tag, email: mail, password: "password-123" } });
    expect(r.ok()).toBeTruthy();
    const { devCode } = await r.json();
    expect((await ctx.post("/api/auth/verify", { data: { email: mail, code: devCode } })).ok()).toBeTruthy();
    const { workspaces } = await (await ctx.get("/api/workspaces")).json();
    return { ctx, ws: workspaces[0].id as string };
  };
  const a = await mk("alice");
  const b = await mk("bob");
  const { note } = await (await a.ctx.post(`/api/notes?ws=${a.ws}`, { data: { title: "Alice's secret", text: "private" } })).json();
  expect((await b.ctx.get(`/api/notes/${note.id}`)).status()).toBe(404);
  expect((await b.ctx.patch(`/api/notes/${note.id}`, { data: { title: "hacked" } })).status()).toBe(404);
  expect((await b.ctx.get(`/api/notes?ws=${a.ws}`)).status()).toBe(404);
  // Bob cannot point his own task at Alice's goal either.
  const { goal } = await (await a.ctx.post(`/api/goals?ws=${a.ws}`, { data: { title: "Alice goal" } })).json();
  expect((await b.ctx.post(`/api/tasks?ws=${b.ws}`, { data: { title: "x", goalId: goal.id } })).status()).toBe(400);
  expect((await a.ctx.get(`/api/notes/${note.id}`)).status()).toBe(200);
});

test("Ukrainian UI, guided tour after sign-up and the per-page lightbulb", async ({ page }) => {
  await signUp(page, "Тестер", `uk+${Date.now()}@nodera.test`, true);

  // Right after registration the welcome dialog offers the guided tour.
  await page.getByRole("button", { name: /Почати тур/ }).click();
  const tour = page.getByRole("dialog", { name: "Покроковий тур" });
  await expect(tour.getByText("Ласкаво просимо до Nodera 👋")).toBeVisible();
  await tour.getByRole("button", { name: "Далі" }).click();
  await expect(tour.getByText("Навігація")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tour).toBeHidden();

  // The language choice is saved to the account.
  await page.reload();
  await expect(page.getByRole("link", { name: "Нотатки" }).first()).toBeVisible();

  // Every page has a lightbulb that starts that page's own tour.
  await page.goto("/maps");
  await page.getByRole("button", { name: "Як працює ця сторінка?" }).click();
  await expect(page.getByRole("dialog", { name: "Покроковий тур" })).toBeVisible();
});

test("natural-language create, goal pulse, celebration and map focus", async ({ page }) => {
  await signUp(page, "Flow Tester", `flow+${Date.now()}@nodera.test`);
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  const { workspaces } = await (await page.request.get("/api/workspaces")).json();
  const ws = workspaces[0].id as string;
  const { goal } = await (await page.request.post(`/api/goals?ws=${ws}`, { data: { title: "Run a half marathon" } })).json();

  // Command bar understands a plain phrase and links the task to the goal.
  await page.keyboard.press("Control+k");
  await page.getByRole("dialog", { name: "Search and commands" }).getByRole("textbox").fill("tomorrow at 9 easy run 5 km, for goal marathon, weekly");
  await expect(page.getByText("Nodera understood it like this")).toBeVisible();
  await expect(page.getByText("Run a half marathon").first()).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Task created: Easy run 5 km")).toBeVisible();
  const { tasks } = await (await page.request.get(`/api/tasks?ws=${ws}&limit=20`)).json();
  const task = tasks.find((t: { title: string }) => t.title === "Easy run 5 km");
  expect(task.goalId).toBe(goal.id);
  expect(task.recurrence).toBe("WEEKLY");

  // Completing a goal's only (one-off) task celebrates it.
  const { goal: g2 } = await (await page.request.post(`/api/goals?ws=${ws}`, { data: { title: "Read 3 books" } })).json();
  await page.request.post(`/api/tasks?ws=${ws}`, { data: { title: "Finish the last book", goalId: g2.id } });
  await page.goto(`/goals/${g2.id}`);
  await page.getByRole("checkbox", { name: /Mark as done/ }).first().click();
  await expect(page.getByRole("dialog", { name: "Goal achieved" })).toBeVisible();
  await page.keyboard.press("Escape");

  // Focus mode on a map card.
  const { map } = await (await page.request.post(`/api/maps?ws=${ws}`, { data: { title: "Focus test" } })).json();
  const r = Date.now().toString(36);
  await page.request.put(`/api/maps/${map.id}/graph?ws=${ws}`, { data: {
    nodes: [{ id: `a${r}`, kind: "IDEA", title: "Root idea", x: 0, y: 0 }, { id: `b${r}`, kind: "GOAL", title: "", x: 300, y: 0, goalId: goal.id }, { id: `c${r}`, kind: "IDEA", title: "Unrelated", x: 0, y: 300 }],
    edges: [{ id: `e${r}`, sourceId: `a${r}`, targetId: `b${r}`, relation: "LEADS_TO" }],
  } });
  await page.goto(`/maps/${map.id}`);
  await page.locator(".react-flow__node").filter({ hasText: "Run a half marathon" }).click();
  await page.getByRole("button", { name: "Focus" }).first().click();
  await expect(page.getByText("Focus: Run a half marathon")).toBeVisible();
  await expect(page.locator(".react-flow__node.map-dimmed").filter({ hasText: "Unrelated" })).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.getByText("Focus: Run a half marathon")).toBeHidden();
});

test("path to a goal shows blockers, and structures drop onto free space", async ({ page }) => {
  await signUp(page, "Path Tester", `pathx+${Date.now()}@nodera.test`);
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  // Path to goal and structures are Pro tools: start the free trial (test mode, no payment).
  expect((await page.request.post("/api/billing/checkout", { data: { plan: "PRO", trial: true } })).ok()).toBeTruthy();
  const { workspaces } = await (await page.request.get("/api/workspaces")).json();
  const { map } = await (await page.request.post(`/api/maps?ws=${workspaces[0].id}`, { data: { template: "startup", locale: "en" } })).json();
  await page.goto(`/maps/${map.id}`);
  await page.locator(".react-flow__node").filter({ hasText: "Generating Income" }).click();
  await page.getByRole("button", { name: "Path to goal" }).click();
  const panel = page.getByRole("complementary", { name: "Path to goal" });
  await expect(panel.getByText("Next step")).toBeVisible();
  await expect(panel.getByText("No answer yet — write it in the card's description").first()).toBeVisible();
  // Answer the question → it stops blocking.
  await panel.getByRole("button", { name: /Which problem do I solve/ }).first().click();
  await page.getByPlaceholder(/Your answer/).fill("People lose their ideas");
  await expect(panel.getByText("1 of 5 steps ready")).toBeVisible();
  await page.keyboard.press("Escape");
  // Structure: inserted without overlapping anything.
  const before = await page.locator(".react-flow__node").count();
  await page.locator('[data-tour="map-add"]').click();
  await page.getByRole("button", { name: /SWOT analysis/ }).click();
  await expect(page.locator(".react-flow__node")).toHaveCount(before + 5);
  const boxes = await page.locator(".react-flow__node").evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ l: r.left, t: r.top, r: r.right, b: r.bottom })));
  const overlaps = boxes.some((a, i) => boxes.some((b, j) => i < j && a.l < b.r - 2 && a.r > b.l + 2 && a.t < b.b - 2 && a.b > b.t + 2));
  expect(overlaps).toBe(false);
});

test("sign-up needs the emailed code, and a forgotten password can be reset", async ({ page }) => {
  const mail = `code+${Date.now()}@nodera.test`;
  await page.goto("/register");
  await page.getByLabel("Name").fill("Code Tester");
  await page.getByLabel("Email").fill("someone@mailinator.com");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.locator("[role=alert]:not(#__next-route-announcer__)")).toContainText("temporary inboxes");

  await page.getByLabel("Email").fill(mail);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  // Nothing exists until the code is confirmed.
  expect((await page.request.post("/api/auth/login", { data: { email: mail, password } })).status()).toBe(401);
  const code = (await page.getByTestId("dev-code").textContent())!.trim();
  await page.getByLabel("Code from the email").fill(code === "000000" ? "111111" : "000000");
  await expect(page.locator("[role=alert]:not(#__next-route-announcer__)")).toContainText("Wrong code");
  await page.getByLabel("Code from the email").fill(code);
  await page.waitForURL("**/dashboard");

  // Forgot password → code → new password → signed in; the old password stops working.
  await page.request.post("/api/auth/logout");
  await page.context().clearCookies();
  // The dashboard may redirect to /login on its own once the session is gone; either way we end up there.
  await page.goto("/login").catch(() => page.waitForURL("**/login**"));
  await page.waitForLoadState("networkidle");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
  await page.getByLabel("Email").fill(mail);
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByLabel("New password").fill("brand-new-password-9");
  await enterEmailCode(page);
  await page.getByRole("button", { name: "Save new password" }).click();
  await page.waitForURL("**/dashboard");
  expect((await page.request.post("/api/auth/login", { data: { email: mail, password } })).status()).toBe(401);
  expect((await page.request.post("/api/auth/login", { data: { email: mail, password: "brand-new-password-9" } })).ok()).toBeTruthy();
});

test("admin panel lives only on its own subdomain, behind password + email code", async ({ page, playwright, baseURL }) => {
  // On the main site the panel and its API don't exist.
  expect((await page.goto("/admin"))!.status()).toBe(404);
  expect((await page.request.post("/api/admin/login", { data: { email: "x@y.z", password: "x" } })).status()).toBe(404);

  // Accounts: the admin (listed in ADMIN_EMAILS) and an ordinary customer.
  const api = await playwright.request.newContext({ baseURL });
  const mk = async (mail: string) => {
    const r = await api.post("/api/auth/register", { data: { name: mail.split("@")[0], email: mail, password } });
    expect(r.ok()).toBeTruthy();
    const { devCode } = await r.json();
    expect((await api.post("/api/auth/verify", { data: { email: mail, code: devCode } })).ok()).toBeTruthy();
  };
  const adminMail = process.env.E2E_ADMIN_EMAIL ?? "admin-e2e@nodera.test";
  await api.post("/api/auth/login", { data: { email: adminMail, password } }).then((r) => (r.ok() ? null : mk(adminMail)));
  const customer = `customer+${Date.now()}@nodera.test`;
  await mk(customer);

  const admin = new URL(baseURL!);
  admin.hostname = `admin.${admin.hostname}`;
  await page.goto(admin.toString());
  await page.waitForURL("**/login");
  await page.waitForLoadState("networkidle");
  // A real customer with the right password is still refused.
  await page.getByLabel("Пошта").fill(customer);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: "Увійти" }).click();
  await expect(page.locator("[role=alert]:not(#__next-route-announcer__)")).toContainText("Невірна пошта або пароль");

  await page.getByLabel("Пошта").fill(adminMail);
  await page.getByRole("button", { name: "Увійти" }).click();
  await enterEmailCode(page, "Код з листа");
  await page.getByRole("button", { name: "Підтвердити" }).click();
  await expect(page.getByRole("heading", { name: "Огляд" })).toBeVisible();

  await page.getByRole("link", { name: /Клієнти/ }).first().click();
  await page.getByLabel("Пошук").fill(customer);
  await page.getByRole("button", { name: "Знайти" }).click();
  await page.getByRole("link", { name: new RegExp(customer.replace(/[+.]/g, "\\$&")) }).click();
  await page.getByPlaceholder(/Примітка/).fill("бета-тестер");
  await page.getByRole("button", { name: "Видати доступ" }).click();
  await expect(page.getByText("Доступ видано")).toBeVisible();
  await expect(page.getByText("«бета-тестер»")).toBeVisible();

  await page.getByRole("link", { name: /Журнал дій/ }).click();
  await expect(page.getByText("🎁 Видано тариф").first()).toBeVisible();
  await expect(page.getByText("⛔ Невдала спроба входу").first()).toBeVisible();

  // The grant really changed the customer's plan.
  const me = await (await api.post("/api/auth/login", { data: { email: customer, password } })).json();
  expect(me.user.email).toBe(customer);
  const { user } = await (await api.get("/api/me")).json();
  expect(user.plan).toBe("PRO");
});

test("plans: limits open the upgrade dialog, trial and Max switch on in test mode", async ({ page }) => {
  await signUp(page, "Plan Tester", `plan+${Date.now()}@nodera.test`);
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  const { workspaces } = await (await page.request.get("/api/workspaces")).json();
  const ws = workspaces[0].id as string;

  // The sidebar shows the free plan; the starter workspace has no goals yet.
  await expect(page.getByText("Start plan")).toBeVisible();
  for (const t of ["One", "Two", "Three"]) expect((await page.request.post(`/api/goals?ws=${ws}`, { data: { title: t } })).ok()).toBeTruthy();
  const fourth = await page.request.post(`/api/goals?ws=${ws}`, { data: { title: "Four" } });
  expect(fourth.status()).toBe(402);
  expect((await fourth.json()).details).toMatchObject({ limit: "goals", max: 3 });

  // Creating the 4th goal in the UI opens the upgrade dialog instead of an error.
  await page.goto("/goals");
  await page.getByRole("button", { name: /New goal/ }).first().click();
  await page.getByLabel("Goal", { exact: true }).fill("Four");
  await page.getByRole("button", { name: "Create goal" }).click();
  await expect(page.getByRole("heading", { name: "Another goal — great pace!" })).toBeVisible();
  await page.getByRole("button", { name: "Try Pro free for 14 days" }).click();
  await expect(page.getByRole("heading", { name: "Welcome to Pro!" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  // The goal form is still open: the same click now works.
  await page.getByRole("button", { name: "Create goal" }).click();
  await page.waitForURL(/\/goals\/[^/]+$/);

  // The billing page shows the trial; cancelling keeps Pro until the end of the period.
  await page.goto("/billing");
  await expect(page.getByText(/Free trial · \d+ days left/).first()).toBeVisible();
  await page.getByRole("button", { name: "Cancel subscription" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel subscription" }).click();
  await expect(page.getByRole("button", { name: "Resume subscription" })).toBeVisible();
  let me = await (await page.request.get("/api/billing?ws=" + ws)).json();
  expect(me.plan).toBe("PRO");
  expect(me.trialAvailable).toBe(false);

  // Max switches on at once; then reset back to Start for another round of testing.
  await page.getByRole("button", { name: "Choose Max" }).click();
  await expect(page.getByRole("heading", { name: "Welcome to Max!" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  me = await (await page.request.get("/api/billing?ws=" + ws)).json();
  expect(me.plan).toBe("MAX");
  expect(me.limits.aiRequestsPerDay).toBe(1000);
  await page.getByRole("button", { name: "Reset to Start (test)" }).click();
  await expect(page.getByRole("button", { name: "Try 14 days free" })).toBeVisible();
  me = await (await page.request.get("/api/billing?ws=" + ws)).json();
  expect(me.plan).toBe("FREE");
  expect(me.trialAvailable).toBe(true);
});

test("map cards survive leaving the map and coming back", async ({ page }) => {
  await signUp(page, "Map Saver", `mapsave+${Date.now()}@nodera.test`);
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await page.goto("/maps");
  await page.getByRole("button", { name: "New map" }).click();
  await page.getByLabel("Title").fill("Saved map");
  await page.getByRole("button", { name: "Create map" }).click();
  await page.waitForURL("**/maps/**");
  const url = page.url();
  await page.locator(".react-flow__node").first().waitFor();
  const pane = page.locator(".react-flow__pane");

  // Visit the map once so a copy of it is loaded, then add cards.
  await pane.dblclick({ position: { x: 300, y: 600 } });
  await expect(page.getByLabel("Node title")).toBeFocused();
  await page.keyboard.type("First card");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  // Leave inside the app and come back: the cards must still be there.
  await page.getByRole("link", { name: "Dashboard" }).first().click();
  await page.waitForURL("**/dashboard");
  await page.goBack();
  await page.waitForURL(url);
  await expect(page.locator(".react-flow__node", { hasText: "First card" })).toBeVisible();

  // Add a card and leave right away (before autosave fires): the closing flush saves it.
  await pane.dblclick({ position: { x: 700, y: 650 } });
  await expect(page.getByLabel("Node title")).toBeFocused();
  await page.keyboard.type("Quick card");
  await page.keyboard.press("Enter");
  await page.getByRole("link", { name: "Dashboard" }).first().click();
  await page.waitForURL("**/dashboard");
  await page.goBack();
  await page.waitForURL(url);
  await expect(page.locator(".react-flow__node", { hasText: "Quick card" })).toBeVisible();
  await expect(page.locator(".react-flow__node", { hasText: "First card" })).toBeVisible();

  // And after a full reload.
  await page.reload();
  await expect(page.locator(".react-flow__node", { hasText: "Quick card" })).toBeVisible();
});
