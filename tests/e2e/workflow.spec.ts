import { expect, test, type Page } from "@playwright/test";

/**
 * The MVP acceptance workflow:
 * account → folder → note (persisted across reload) → goal → mind map node + connection
 * → convert node to task assigned to goal → complete task → goal progress updates.
 */
const email = `e2e+${Date.now()}@nodera.test`;
const password = "correct-horse-battery";

async function register(page: Page) {
  await page.goto("/register");
  await page.getByLabel("Name").fill("E2E Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/dashboard");
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
    const r = await ctx.post("/api/auth/register", { data: { name: tag, email: `${tag}+${Date.now()}@nodera.test`, password: "password-123" } });
    expect(r.ok()).toBeTruthy();
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
  await page.goto("/register");
  await page.getByRole("radio", { name: /UA/ }).click();
  await page.getByLabel("Ім'я").fill("Тестер");
  await page.getByLabel("Ел. пошта").fill(`uk+${Date.now()}@nodera.test`);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: "Створити акаунт" }).click();
  await page.waitForURL("**/dashboard");

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
  await page.goto("/register");
  await page.getByLabel("Name").fill("Flow Tester");
  await page.getByLabel("Email").fill(`flow+${Date.now()}@nodera.test`);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/dashboard");
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
