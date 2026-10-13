/** Client-side shapes of API responses (dates arrive as ISO strings). */
export type ID = string;

export interface Workspace { id: ID; name: string; icon: string; role: "OWNER" | "EDITOR" | "VIEWER" }
export interface Me {
  user: { id: ID; email: string; name: string; plan: string; theme: string; aiEnabled: boolean; onboardedAt: string | null; dashboardLayout: { id: string; hidden?: boolean }[] | null };
  limits: Record<string, number | null>;
  aiAvailable: boolean;
}
export interface Folder {
  id: ID; name: string; icon: string; color: string; parentId: ID | null; favorite: boolean; position: number; archivedAt: string | null;
  _count?: { notes: number; maps: number; projects: number; goals: number; children: number };
}
export interface NoteSummary {
  id: ID; title: string; kind: "NOTE" | "THOUGHT"; tags: string[]; favorite: boolean; folderId: ID | null; createdAt: string; updatedAt: string; archivedAt: string | null;
  contentText: string; folder?: { id: ID; name: string; icon: string } | null; _count?: { nodes: number; linksIn: number };
}
export interface Note extends NoteSummary {
  content: unknown;
  attachments: Attachment[];
  nodes: { id: ID; title: string; map: { id: ID; title: string } }[];
  linksIn: { source: { id: ID; title: string } }[];
  linksOut: { target: { id: ID; title: string } }[];
}
export interface Attachment { id: ID; filename: string; mimeType: string; size: number; createdAt: string }
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export interface Task {
  id: ID; title: string; description: string; status: TaskStatus; priority: Priority; tags: string[];
  dueDate: string | null; scheduledStart: string | null; scheduledEnd: string | null; estimateMinutes: number | null; actualMinutes: number | null;
  recurrence: string; position: number; completedAt: string | null; createdAt: string;
  projectId: ID | null; goalId: ID | null; milestoneId: ID | null;
  project?: { id: ID; title: string; color: string } | null; goal?: { id: ID; title: string } | null; milestone?: { id: ID; title: string } | null;
  nodes?: { id: ID; mapId: ID; map: { title: string } }[];
  dependsOn?: { dependsOn: { id: ID; title: string; status: TaskStatus } }[];
}
export interface Milestone { id: ID; title: string; done: boolean; dueDate: string | null; position: number }
export interface Goal {
  id: ID; title: string; description: string; category: string; priority: Priority; status: string; startDate: string | null; targetDate: string | null;
  motivation: string; successCriteria: string; autoProgress: boolean; manualProgress: number; folderId: ID | null;
  milestones: Milestone[]; progress: number; taskCount: number; doneTaskCount: number;
  projects: { id: ID; title: string; color: string; status: string; taskCount: number; doneCount: number }[];
  habits: { id: ID; title: string; icon: string; color: string }[];
}
export interface Project {
  id: ID; title: string; description: string; status: string; color: string; startDate: string | null; dueDate: string | null; favorite: boolean;
  goalId: ID | null; folderId: ID | null; archivedAt: string | null;
  goal?: { id: ID; title: string } | null; folder?: { id: ID; name: string; icon: string } | null;
  progress: { total: number; done: number; percent: number }; overdue?: number;
}
export interface Habit {
  id: ID; title: string; description: string; icon: string; color: string; frequency: "DAILY" | "WEEKLY"; targetPerPeriod: number; unit: string;
  reminderTime: string | null; goalId: ID | null; goal?: { id: ID; title: string } | null; counts: Record<string, number>; archivedAt: string | null;
}
export interface CalEvent {
  id: ID; title: string; description: string; start: string; end: string; allDay: boolean; color: string; category: string; recurrence: string; recurUntil: string | null;
  taskId: ID | null; habitId: ID | null; goals: { id: ID; title: string }[];
}
export interface MapSummary { id: ID; title: string; description: string; favorite: boolean; updatedAt: string; folderId: ID | null; folder?: { id: ID; name: string; icon: string } | null; _count: { nodes: number; edges: number } }
export interface ActivityItem { id: ID; action: string; entityType: string; entityId: ID; summary: string; createdAt: string }
export interface AiSuggestion { id: ID; kind: string; input: string; payload: unknown; status: "PENDING" | "ACCEPTED" | "DISMISSED"; createdAt: string }
