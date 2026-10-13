import "server-only";

/** Built-in map templates (seed for the future template marketplace). */
export interface TemplateNode { key: string; kind: string; title: string; x: number; y: number; color?: string; icon?: string; description?: string }
export interface TemplateEdge { from: string; to: string; relation: string; label?: string }
export interface MapTemplate { id: string; name: string; description: string; nodes: TemplateNode[]; edges: TemplateEdge[] }

const UK: Record<string, string> = {"Personal development": "Особистий розвиток", "Health, finance and education branches with the cause-and-effect chains between them.": "Гілки здоров'я, фінансів і навчання з причинно-наслідковими зв'язками між ними.", "My Personal Development": "Мій особистий розвиток", "Health": "Здоров'я", "Finance": "Фінанси", "Education": "Навчання", "Better Sleep": "Кращий сон", "Exercise regularly": "Регулярні тренування", "More Energy": "Більше енергії", "Improved Learning": "Краще навчання", "Learn Programming": "Вивчити програмування", "Better Career Opportunities": "Кращі кар'єрні можливості", "Higher Income": "Вищий дохід", "Greater Financial Stability": "Фінансова стабільність", "Startup launch": "Запуск стартапу", "From skill-building to a product that generates income.": "Від нових навичок до продукту, що приносить дохід.", "Learning Programming": "Вивчення програмування", "Building Applications": "Створення застосунків", "Creating a Startup": "Створення стартапу", "Generating Income": "Отримання доходу", "Which problem do I solve?": "Яку проблему я вирішую?", "Customer interviews": "Інтерв'ю з клієнтами", "Fitness plan": "Фітнес-план", "Training, nutrition and recovery feeding into energy and productivity.": "Тренування, харчування і відновлення, що дають енергію та продуктивність.", "Improve Physical Fitness": "Покращити фізичну форму", "Create a training schedule": "Скласти графік тренувань", "Exercise 3× per week": "Тренування 3× на тиждень", "Improve nutrition": "Покращити харчування", "Evaluate after 30 days": "Оцінити результат через 30 днів", "Better Energy": "Більше енергії", "Higher Productivity": "Вища продуктивність"};

const BASE: MapTemplate[] = [
  {
    id: "personal-development",
    name: "Personal development",
    description: "Health, finance and education branches with the cause-and-effect chains between them.",
    nodes: [
      { key: "root", kind: "GOAL", title: "My Personal Development", x: 0, y: 0, color: "#6366f1", icon: "🌱" },
      { key: "health", kind: "THOUGHT", title: "Health", x: -420, y: 180, color: "#10b981", icon: "💪" },
      { key: "finance", kind: "THOUGHT", title: "Finance", x: 0, y: 180, color: "#f59e0b", icon: "💰" },
      { key: "education", kind: "THOUGHT", title: "Education", x: 420, y: 180, color: "#3b82f6", icon: "📚" },
      { key: "sleep", kind: "HABIT", title: "Better Sleep", x: -560, y: 360 },
      { key: "exercise", kind: "HABIT", title: "Exercise regularly", x: -300, y: 360 },
      { key: "energy", kind: "IDEA", title: "More Energy", x: -420, y: 540 },
      { key: "learning", kind: "IDEA", title: "Improved Learning", x: 160, y: 720 },
      { key: "programming", kind: "GOAL", title: "Learn Programming", x: 420, y: 360 },
      { key: "career", kind: "IDEA", title: "Better Career Opportunities", x: 420, y: 540 },
      { key: "income", kind: "IDEA", title: "Higher Income", x: 120, y: 540 },
      { key: "stability", kind: "GOAL", title: "Greater Financial Stability", x: 0, y: 360 },
    ],
    edges: [
      { from: "root", to: "health", relation: "PART_OF" },
      { from: "root", to: "finance", relation: "PART_OF" },
      { from: "root", to: "education", relation: "PART_OF" },
      { from: "health", to: "sleep", relation: "PART_OF" },
      { from: "health", to: "exercise", relation: "PART_OF" },
      { from: "education", to: "programming", relation: "PART_OF" },
      { from: "finance", to: "stability", relation: "PART_OF" },
      { from: "sleep", to: "energy", relation: "LEADS_TO" },
      { from: "exercise", to: "energy", relation: "LEADS_TO" },
      { from: "energy", to: "learning", relation: "SUPPORTS" },
      { from: "programming", to: "career", relation: "LEADS_TO" },
      { from: "career", to: "income", relation: "LEADS_TO" },
      { from: "income", to: "stability", relation: "LEADS_TO" },
    ],
  },
  {
    id: "startup",
    name: "Startup launch",
    description: "From skill-building to a product that generates income.",
    nodes: [
      { key: "a", kind: "GOAL", title: "Learning Programming", x: 0, y: 0, icon: "💻" },
      { key: "b", kind: "PROJECT", title: "Building Applications", x: 320, y: 0 },
      { key: "c", kind: "PROJECT", title: "Creating a Startup", x: 640, y: 0, icon: "🚀" },
      { key: "d", kind: "GOAL", title: "Generating Income", x: 960, y: 0, icon: "💰" },
      { key: "q", kind: "QUESTION", title: "Which problem do I solve?", x: 640, y: 180 },
      { key: "r", kind: "RESOURCE", title: "Customer interviews", x: 320, y: 180 },
    ],
    edges: [
      { from: "a", to: "b", relation: "LEADS_TO" },
      { from: "b", to: "c", relation: "LEADS_TO" },
      { from: "c", to: "d", relation: "LEADS_TO" },
      { from: "q", to: "c", relation: "REQUIRES" },
      { from: "r", to: "q", relation: "SUPPORTS" },
    ],
  },
  {
    id: "fitness",
    name: "Fitness plan",
    description: "Training, nutrition and recovery feeding into energy and productivity.",
    nodes: [
      { key: "g", kind: "GOAL", title: "Improve Physical Fitness", x: 0, y: 0, icon: "🏃" },
      { key: "m1", kind: "MILESTONE", title: "Create a training schedule", x: -360, y: 180 },
      { key: "m2", kind: "HABIT", title: "Exercise 3× per week", x: -120, y: 180 },
      { key: "m3", kind: "TASK", title: "Improve nutrition", x: 120, y: 180 },
      { key: "m4", kind: "MILESTONE", title: "Evaluate after 30 days", x: 360, y: 180 },
      { key: "e", kind: "IDEA", title: "Better Energy", x: 0, y: 360 },
      { key: "p", kind: "IDEA", title: "Higher Productivity", x: 0, y: 520 },
    ],
    edges: [
      { from: "g", to: "m1", relation: "PART_OF" },
      { from: "g", to: "m2", relation: "PART_OF" },
      { from: "g", to: "m3", relation: "PART_OF" },
      { from: "g", to: "m4", relation: "PART_OF" },
      { from: "m2", to: "e", relation: "LEADS_TO" },
      { from: "e", to: "p", relation: "LEADS_TO" },
    ],
  },
];

/** Templates in the requested language (titles of nodes, names and descriptions). */
export function templatesFor(locale: string): MapTemplate[] {
  if (locale !== "uk") return BASE;
  const tr = (x: string) => UK[x] ?? x;
  return BASE.map((t) => ({ ...t, name: tr(t.name), description: tr(t.description), nodes: t.nodes.map((n) => ({ ...n, title: tr(n.title) })) }));
}

export const MAP_TEMPLATES = BASE;
