import { z } from "zod";

export const NODE_KINDS = ["THOUGHT", "IDEA", "GOAL", "TASK", "PROJECT", "HABIT", "NOTE", "QUESTION", "DECISION", "RESOURCE", "MILESTONE", "GROUP"] as const;
export const RELATIONS = ["RELATED_TO", "DEPENDS_ON", "SUPPORTS", "BLOCKS", "PART_OF", "REQUIRES", "CONFLICTS_WITH", "COMBINES_WITH", "LEADS_TO"] as const;
export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;
export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const GOAL_STATUSES = ["NOT_STARTED", "ACTIVE", "ON_HOLD", "COMPLETED", "ABANDONED"] as const;
export const PROJECT_STATUSES = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED"] as const;
export const RECURRENCES = ["NONE", "DAILY", "WEEKDAYS", "WEEKLY", "MONTHLY"] as const;

const id = z.string().min(1).max(64);
const optId = id.nullable().optional();
const title = z.string().trim().min(1, "Title is required").max(300);
const text = (max = 20_000) => z.string().max(max);
const date = z.coerce.date();
const optDate = z.coerce.date().nullable().optional();
const color = z.string().max(32);
const tags = z.array(z.string().trim().min(1).max(40)).max(30);

export const email = z.string().trim().toLowerCase().email("Enter a valid email").max(200);
export const password = z.string().min(8, "Password must be at least 8 characters").max(200);

export const registerSchema = z.object({ name: z.string().trim().min(1, "Name is required").max(80), email, password });
export const loginSchema = z.object({ email, password: z.string().min(1).max(200) });

export const workspaceSchema = z.object({ name: z.string().trim().min(1).max(80), icon: z.string().max(8).optional() });

export const folderCreate = z.object({
  name: z.string().trim().min(1).max(120),
  parentId: optId,
  color: color.optional(),
  icon: z.string().max(8).optional(),
});
export const folderUpdate = folderCreate.partial().extend({ favorite: z.boolean().optional(), archived: z.boolean().optional(), position: z.number().int().optional() });

export const noteCreate = z.object({
  title: z.string().max(300).optional(),
  kind: z.enum(["NOTE", "THOUGHT"]).optional(),
  folderId: optId,
  content: z.any().optional(),
  text: text(50_000).optional(), // plain text alternative (quick capture)
  tags: tags.optional(),
});
export const noteUpdate = z.object({
  title: z.string().max(300).optional(),
  kind: z.enum(["NOTE", "THOUGHT"]).optional(),
  folderId: optId,
  content: z.any().optional(),
  tags: tags.optional(),
  favorite: z.boolean().optional(),
  archived: z.boolean().optional(),
});

export const mapCreate = z.object({ title: z.string().trim().max(200).optional(), folderId: optId, description: text(2000).optional(), template: z.string().max(40).optional() });
export const mapUpdate = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: text(2000).optional(),
  folderId: optId,
  favorite: z.boolean().optional(),
  archived: z.boolean().optional(),
  viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }).optional(),
});

export const nodeSchema = z.object({
  id,
  kind: z.enum(NODE_KINDS),
  title: z.string().max(500),
  description: text(10_000).default(""),
  color: color.default(""),
  shape: z.enum(["rounded", "pill", "rectangle", "circle", "diamond"]).default("rounded"),
  icon: z.string().max(8).default(""),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().nullable().optional(),
  height: z.number().finite().nullable().optional(),
  collapsed: z.boolean().default(false),
  parentId: optId,
  tags: tags.default([]),
  links: z.array(z.string().url().max(2000)).max(20).default([]),
  noteId: optId,
  taskId: optId,
  goalId: optId,
  projectId: optId,
  habitId: optId,
});
export type NodeInput = z.infer<typeof nodeSchema>;

export const edgeSchema = z.object({
  id,
  sourceId: id,
  targetId: id,
  sourceHandle: z.string().max(40).nullable().optional(),
  targetHandle: z.string().max(40).nullable().optional(),
  relation: z.enum(RELATIONS).default("RELATED_TO"),
  label: z.string().max(200).default(""),
  description: text(2000).default(""),
  bidirectional: z.boolean().default(false),
});
export type EdgeInput = z.infer<typeof edgeSchema>;

/** Full-graph save (debounced autosave from the canvas). Server diffs against DB. */
export const graphSave = z.object({
  nodes: z.array(nodeSchema).max(10_000),
  edges: z.array(edgeSchema).max(30_000),
  viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }).optional(),
});

export const nodeConvert = z.object({
  to: z.enum(["TASK", "NOTE", "GOAL", "PROJECT", "HABIT"]),
  projectId: optId,
  goalId: optId,
});

export const projectCreate = z.object({
  title,
  description: text().optional(),
  folderId: optId,
  goalId: optId,
  status: z.enum(PROJECT_STATUSES).optional(),
  color: color.optional(),
  startDate: optDate,
  dueDate: optDate,
});
export const projectUpdate = projectCreate.partial().extend({ favorite: z.boolean().optional(), archived: z.boolean().optional() });

export const goalCreate = z.object({
  title,
  description: text().optional(),
  category: z.string().max(80).optional(),
  priority: z.enum(PRIORITIES).optional(),
  status: z.enum(GOAL_STATUSES).optional(),
  startDate: optDate,
  targetDate: optDate,
  motivation: text(5000).optional(),
  successCriteria: text(5000).optional(),
  autoProgress: z.boolean().optional(),
  manualProgress: z.number().int().min(0).max(100).optional(),
  folderId: optId,
  milestones: z.array(z.string().trim().min(1).max(300)).max(50).optional(),
});
export const goalUpdate = goalCreate.omit({ milestones: true }).partial().extend({ dependsOn: z.array(id).max(50).optional() });

export const milestoneCreate = z.object({ title, dueDate: optDate });
export const milestoneUpdate = z.object({ title: title.optional(), done: z.boolean().optional(), dueDate: optDate, position: z.number().int().optional() });

export const taskCreate = z.object({
  title,
  description: text().optional(),
  projectId: optId,
  goalId: optId,
  milestoneId: optId,
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  tags: tags.optional(),
  dueDate: optDate,
  scheduledStart: optDate,
  scheduledEnd: optDate,
  estimateMinutes: z.number().int().min(0).max(100_000).nullable().optional(),
  actualMinutes: z.number().int().min(0).max(100_000).nullable().optional(),
  recurrence: z.enum(RECURRENCES).optional(),
});
export const taskUpdate = taskCreate.partial().extend({ position: z.number().int().optional(), dependsOn: z.array(id).max(50).optional() });

export const habitCreate = z.object({
  title,
  description: text(2000).optional(),
  icon: z.string().max(8).optional(),
  color: color.optional(),
  frequency: z.enum(["DAILY", "WEEKLY"]).optional(),
  targetPerPeriod: z.number().int().min(1).max(100).optional(),
  unit: z.string().max(30).optional(),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  goalId: optId,
});
export const habitUpdate = habitCreate.partial().extend({ archived: z.boolean().optional() });
export const habitLog = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), count: z.number().int().min(0).max(1000) });

export const eventCreate = z
  .object({
    title,
    description: text(5000).optional(),
    start: date,
    end: date,
    allDay: z.boolean().optional(),
    color: color.optional(),
    category: z.string().max(80).optional(),
    recurrence: z.enum(RECURRENCES).optional(),
    recurUntil: optDate,
    taskId: optId,
    habitId: optId,
    goalIds: z.array(id).max(20).optional(),
    reminderMinutes: z.number().int().min(0).max(10_080).nullable().optional(),
  })
  .refine((e) => e.end > e.start, { message: "End must be after start", path: ["end"] });
export const eventUpdate = z
  .object({
    title: title.optional(),
    description: text(5000).optional(),
    start: date.optional(),
    end: date.optional(),
    allDay: z.boolean().optional(),
    color: color.optional(),
    category: z.string().max(80).optional(),
    recurrence: z.enum(RECURRENCES).optional(),
    recurUntil: optDate,
    taskId: optId,
    habitId: optId,
    goalIds: z.array(id).max(20).optional(),
  });

export const reminderCreate = z.object({ title, remindAt: date, taskId: optId, habitId: optId, eventId: optId });

export const settingsUpdate = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  aiEnabled: z.boolean().optional(),
  onboarded: z.boolean().optional(),
  dashboardLayout: z.array(z.object({ id: z.string().max(40), hidden: z.boolean().optional() })).max(40).optional(),
});
export const passwordChange = z.object({ current: z.string().min(1), next: password });
export const accountDelete = z.object({ password: z.string().min(1), confirm: z.literal("DELETE") });
