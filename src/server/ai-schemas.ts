import * as z from "zod/v4";

const RELATION = z.enum(["RELATED_TO", "DEPENDS_ON", "SUPPORTS", "BLOCKS", "PART_OF", "REQUIRES", "CONFLICTS_WITH", "COMBINES_WITH", "LEADS_TO"]);

export const planSchema = z.object({
  summary: z.string().describe("2-4 sentence overview of the proposed plan"),
  goals: z.array(
    z.object({
      key: z.string().describe("short unique key like g1"),
      title: z.string(),
      category: z.string().describe("life area, e.g. Health, Finance, Education, Business"),
      description: z.string(),
      motivation: z.string(),
      milestones: z.array(z.string()),
      firstTasks: z.array(z.string()).describe("2-4 concrete first actions"),
      habits: z.array(z.object({ title: z.string(), frequency: z.enum(["DAILY", "WEEKLY"]), targetPerPeriod: z.number().int(), unit: z.string() })),
    }),
  ),
  connections: z.array(z.object({ fromKey: z.string(), toKey: z.string(), relation: RELATION, reason: z.string() })),
  schedule: z
    .array(
      z.object({
        title: z.string(),
        goalKeys: z.array(z.string()).describe("goals this activity contributes to (can be several)"),
        dayOfWeek: z.number().int().describe("0=Sunday ... 6=Saturday"),
        start: z.string().describe("HH:mm 24h"),
        durationMinutes: z.number().int(),
      }),
    )
    .describe("weekly recurring time blocks that respect the user's stated availability"),
});
export type PlanSuggestion = z.infer<typeof planSchema>;

export const connectionsSchema = z.object({
  suggestions: z.array(
    z.object({
      sourceRef: z.string().describe("ref of the source item exactly as given, e.g. goal:abc"),
      targetRef: z.string(),
      relation: RELATION,
      reason: z.string().describe("one sentence; phrase as a question to the user when uncertain"),
    }),
  ),
});
export type ConnectionsSuggestion = z.infer<typeof connectionsSchema>;

export const breakdownSchema = z.object({
  milestones: z.array(z.object({ title: z.string(), tasks: z.array(z.object({ title: z.string(), estimateMinutes: z.number().int() })) })),
});
export type BreakdownSuggestion = z.infer<typeof breakdownSchema>;

export const organizeSchema = z.object({
  title: z.string().describe("a clearer title for the note (may equal the current one)"),
  tags: z.array(z.string()).describe("2-5 lowercase tags"),
  folderId: z.string().nullable().describe("id of the best existing folder, or null"),
  relatedRefs: z.array(z.string()).describe("refs of related existing items"),
  nextActions: z.array(z.string()).describe("actionable tasks hidden in the note, if any"),
});
export type OrganizeSuggestion = z.infer<typeof organizeSchema>;

export const summarySchema = z.object({
  summary: z.string(),
  keyThemes: z.array(z.string()),
  openQuestions: z.array(z.string()),
  suggestedNextSteps: z.array(z.string()),
});

export const reflectionSchema = z.object({
  summary: z.string(),
  wins: z.array(z.string()),
  unfinished: z.array(z.string()),
  patterns: z.array(z.string()).describe("observations grounded in the data only"),
  improvements: z.array(z.string()),
});
