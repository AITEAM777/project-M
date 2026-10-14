/**
 * Guided tours for every page. Steps point at elements marked with `data-tour="…"`.
 * A step without a target (or whose target isn't on screen) is shown centered.
 * `action` is dispatched before the step is shown (see dispatchTourAction).
 */
export type Text = { en: string; uk: string };
export interface TourStep {
  target?: string;
  title: Text;
  body: Text;
  action?: string;
  placement?: "top" | "bottom" | "left" | "right";
}
export interface Tour {
  id: string;
  match: RegExp;
  steps: TourStep[];
}

const T = (en: string, uk: string): Text => ({ en, uk });
const S = (target: string | undefined, title: Text, body: Text, extra: Partial<TourStep> = {}): TourStep => ({ target: target ? `[data-tour="${target}"]` : undefined, title, body, ...extra });

const HELP_STEP = S("help", T("Help is always one click away", "Допомога завжди поруч"), T(
  "This lightbulb is on every page. Click it whenever you're unsure — it starts a short tour of exactly the page you're on.",
  "Ця лампочка є на кожній сторінці. Натисніть її, коли щось незрозуміло, — і почнеться короткий тур саме по тій сторінці, де ви зараз.",
), { placement: "left" });

export const TOURS: Tour[] = [
  {
    id: "dashboard",
    match: /^\/dashboard$/,
    steps: [
      S(undefined, T("Welcome to Nodera 👋", "Ласкаво просимо до Nodera 👋"), T(
        "Nodera helps you go from scattered thoughts to real progress: capture ideas → connect them on mind maps → turn them into tasks and goals → track what you actually did. This tour shows the main controls in about a minute.",
        "Nodera допомагає пройти шлях від розрізнених думок до реального прогресу: записуєте ідеї → з'єднуєте їх на картах думок → перетворюєте на задачі й цілі → бачите, що справді зроблено. Цей тур за хвилину покаже головні елементи.",
      )),
      S("sidebar", T("Navigation", "Навігація"), T(
        "Every section lives here: Thoughts (quick ideas), Notes, Mind Maps, Projects, Tasks, Goals, Calendar, Habits and the Knowledge Graph. Your folders are listed below — organize life areas like Health or Finance there.",
        "Тут усі розділи: Думки (швидкі ідеї), Нотатки, Mind Maps, Проєкти, Задачі, Цілі, Календар, Звички та Граф знань. Нижче — ваші папки: впорядковуйте в них сфери життя, як-от Здоров'я чи Фінанси.",
      ), { placement: "right" }),
      S("capture", T("Capture a thought in 2 seconds", "Запишіть думку за 2 секунди"), T(
        "Click ⚡ Capture (or just press Q on the keyboard) to write down an idea without leaving the page. It lands in My Thoughts, where you can organize it later.",
        "Натисніть ⚡ «Записати» (або просто клавішу Q), щоб записати ідею, не виходячи зі сторінки. Вона потрапить у «Мої думки», де її можна впорядкувати пізніше.",
      ), { placement: "bottom" }),
      S("create", T("Create anything", "Створюйте будь-що"), T(
        "The “New” menu creates notes, mind maps, tasks, projects, goals, habits, calendar events and folders.",
        "Меню «Створити» додає нотатки, карти думок, задачі, проєкти, цілі, звички, події в календарі та папки.",
      ), { placement: "bottom" }),
      S("search", T("Find everything", "Знаходьте все"), T(
        "Search across all notes, tasks, goals and map nodes. Shortcut: Ctrl/⌘ + K. Type #tag to filter by tag.",
        "Пошук по всіх нотатках, задачах, цілях і вузлах карт. Комбінація: Ctrl/⌘ + K. Напишіть #тег, щоб фільтрувати за тегом.",
      ), { placement: "bottom" }),
      S("dash-stats", T("Your day at a glance", "Ваш день з першого погляду"), T(
        "Tasks for today, overdue items, what you finished this week and how many goals are active.",
        "Задачі на сьогодні, прострочені справи, що виконано за тиждень і скільки цілей активні.",
      )),
      S("widget-today", T("Today's tasks", "Задачі на сьогодні"), T(
        "Tick the checkbox to complete a task — goal progress updates automatically. Click a task to open its details on the right.",
        "Поставте галочку, щоб виконати задачу, — прогрес цілі оновиться автоматично. Клацніть по задачі, щоб відкрити деталі праворуч.",
      )),
      S("dash-customize", T("Make it yours", "Налаштуйте під себе"), T(
        "Customize lets you reorder or hide dashboard widgets.",
        "Кнопка «Налаштувати» дозволяє змінити порядок віджетів або приховати непотрібні.",
      ), { placement: "bottom" }),
      S("account", T("Language & theme", "Мова та тема"), T(
        "Open your account menu to switch between English and Ukrainian, or between light and dark theme.",
        "У меню акаунта можна перемкнути мову (англійська / українська) та світлу або темну тему.",
      ), { placement: "bottom" }),
      HELP_STEP,
    ],
  },
  {
    id: "map",
    match: /^\/maps\/[^/]+$/,
    steps: [
      S(undefined, T("Mind map: think visually", "Карта думок: думайте візуально"), T(
        "A mind map is an endless canvas of cards (nodes) and arrows (connections). Use it to see how ideas, goals and tasks affect each other — e.g. “Better sleep → More energy → Better learning”.",
        "Карта думок — це нескінченне полотно з карток (вузлів) і стрілок (зв'язків). Вона показує, як ідеї, цілі та задачі впливають одна на одну, наприклад: «Кращий сон → Більше енергії → Краще навчання».",
      )),
      S("map-add", T("1. Add a card", "1. Додайте картку"), T(
        "Click “Add” and choose a type (thought, idea, goal, task, question…). Faster: double-click any empty spot on the canvas, type a title and press Enter.",
        "Натисніть «Додати» й оберіть тип (думка, ідея, ціль, задача, питання…). Швидше: двічі клацніть по порожньому місцю полотна, введіть назву й натисніть Enter.",
      ), { placement: "bottom" }),
      S("map-canvas", T("2. Connect cards", "2. З'єднайте картки"), T(
        "Hover a card: small circles appear on its edges. Drag from a circle onto another card to connect them with an arrow. Drop on an empty spot instead and a new connected card is created right there.",
        "Наведіть на картку — на її краях з'являться маленькі кружечки. Потягніть від кружечка до іншої картки, щоб з'єднати їх стрілкою. Якщо відпустити на порожньому місці — там одразу з'явиться нова пов'язана картка.",
      )),
      S("map-relation", T("3. Choose what the connection means", "3. Оберіть, що означає зв'язок"), T(
        "Before drawing, pick the connection type: supports, leads to, depends on, blocks, part of, requires, conflicts with… New arrows use this type. You can change any arrow later by clicking it.",
        "Перед тим як тягнути стрілку, оберіть тип зв'язку: підтримує, веде до, залежить від, блокує, частина, вимагає, конфліктує… Нові стрілки матимуть цей тип. Будь-яку стрілку можна змінити пізніше, клацнувши по ній.",
      ), { placement: "bottom" }),
      S("map-panel", T("4. Edit a card", "4. Редагуйте картку"), T(
        "Clicking a card opens this panel: rename it, change its type, color, shape and icon, add a description, tags, links and files. Double-click a card to rename it right on the canvas.",
        "Клік по картці відкриває цю панель: змініть назву, тип, колір, форму та іконку, додайте опис, теги, посилання й файли. Подвійний клік по картці — перейменування прямо на полотні.",
      ), { action: "select-first-node", placement: "left" }),
      S("map-link", T("5. Turn a card into action", "5. Перетворіть картку на дію"), T(
        "“Make task / goal / project / habit” turns the card into a real item that appears in Tasks, Goals, Projects or Habits — the card stays on the map and stays in sync. “Write a full note” attaches a document. Use “Link an existing item” to attach something you already have; the same goal can appear on many maps.",
        "«Зробити задачею / ціллю / проєктом / звичкою» перетворює картку на справжній елемент, що з'явиться в Задачах, Цілях, Проєктах чи Звичках, — картка лишається на карті й синхронізується. «Написати повну нотатку» додає документ. «Прив'язати наявний елемент» з'єднує картку з тим, що у вас уже є; одна ціль може бути на багатьох картах.",
      ), { action: "select-first-node", placement: "left" }),
      S("map-connections", T("6. See the connections", "6. Перегляньте зв'язки"), T(
        "Here are all arrows of this card. Click one to jump to the connected card. Clicking an arrow on the canvas lets you change its type, add a label, make it two-way, reverse or delete it.",
        "Тут усі стрілки цієї картки. Клацніть, щоб перейти до пов'язаної картки. Клік по стрілці на полотні дозволяє змінити її тип, додати підпис, зробити двосторонньою, розвернути або видалити.",
      ), { action: "select-first-node", placement: "left" }),
      S("map-canvas", T("Live cards & focus mode", "«Живі» картки та фокус-режим"), T(
        "Cards linked to real items show their state: a goal shows a progress ring and days left, a habit shows the last 7 days and its 🔥 streak (click today's square to check in), a task can be ticked right on the map. Select a card and press “Focus” (or F) to dim everything except that branch — Esc returns the whole map.",
        "Картки, пов'язані зі справжніми елементами, показують їхній стан: ціль — кільце прогресу й дні до дедлайну, звичка — останні 7 днів і серію 🔥 (клік по сьогоднішньому квадратику — відмітити), задачу можна відмітити прямо на карті. Виділіть картку й натисніть «Фокус» (або F) — решта карти приглушиться, лишиться тільки ця гілка. Esc повертає всю карту.",
      ), { action: "deselect" }),
      S("map-add", T("Ready-made structures & the path to a goal", "Готові структури та шлях до цілі"), T(
        "“Add” also has structures: startup launch, SWOT, goal → milestones → tasks, pros & cons, 5 whys — a whole skeleton in one click. Select any goal card and press “Path” (or P): Nodera highlights everything that leads to it, marks blockers (e.g. an unanswered question) and shows the next step.",
        "У «Додати» є й структури: запуск стартапу, SWOT, ціль → етапи → задачі, за і проти, 5 «чому?» — цілий каркас одним кліком. Виділіть будь-яку ціль і натисніть «Шлях» (або P): Nodera підсвітить усе, що до неї веде, позначить блокери (наприклад, питання без відповіді) і покаже наступний крок.",
      ), { placement: "bottom" }),
      S("map-tools", T("7. Tidy up", "7. Наведіть лад"), T(
        "Undo/redo (Ctrl+Z), auto-arrange the whole map, group selected cards (Shift+drag to select several) and search inside the map.",
        "Скасувати/повторити (Ctrl+Z), автоматично впорядкувати всю карту, згрупувати виділені картки (Shift+перетягування — виділити кілька) і пошук по карті.",
      ), { action: "deselect", placement: "bottom" }),
      S("map-more", T("Shortcuts & legend", "Гарячі клавіші та легенда"), T(
        "The ⋯ menu shows what each arrow color means and keyboard shortcuts: Tab — add child card, Enter — add sibling, Space — collapse a branch, Delete — remove.",
        "У меню ⋯ — що означає кожен колір стрілки та гарячі клавіші: Tab — дочірня картка, Enter — сусідня, Пробіл — згорнути гілку, Delete — видалити.",
      ), { placement: "bottom" }),
      S("map-save", T("Saved automatically", "Зберігається автоматично"), T(
        "Every change is saved a moment after you make it. You never need a Save button.",
        "Кожна зміна зберігається одразу після неї. Кнопка «Зберегти» не потрібна.",
      ), { placement: "bottom" }),
    ],
  },
  {
    id: "maps",
    match: /^\/maps$/,
    steps: [
      S(undefined, T("Your mind maps", "Ваші карти думок"), T(
        "Each card here is a separate canvas. Open one to add cards and connections.",
        "Кожна картка тут — окреме полотно. Відкрийте його, щоб додавати картки та зв'язки.",
      )),
      S("maps-new", T("Create a map", "Створіть карту"), T(
        "Start blank or from a template like “Personal development” — it already shows how health, finance and education influence each other.",
        "Почніть з порожньої або з шаблону «Особистий розвиток» — він уже показує, як здоров'я, фінанси й навчання впливають одне на одне.",
      ), { placement: "bottom" }),
      S("maps-tabs", T("Active and archived", "Активні та архів"), T(
        "Archive maps you don't need right now — they can be restored at any time. The ⋯ menu on each map also offers duplicate and delete.",
        "Архівуйте карти, які зараз не потрібні, — їх завжди можна відновити. У меню ⋯ кожної карти є також дублювання та видалення.",
      ), { placement: "bottom" }),
      HELP_STEP,
    ],
  },
  {
    id: "thoughts",
    match: /^\/thoughts$/,
    steps: [
      S(undefined, T("My Thoughts — your inbox", "Мої думки — ваша вхідна скринька"), T(
        "Write ideas here as soon as they appear. Don't organize yet — just capture.",
        "Записуйте сюди ідеї, щойно вони з'являються. Не впорядковуйте одразу — просто фіксуйте.",
      )),
      S("thought-input", T("Capture", "Запис"), T(
        "Type and press Ctrl/⌘ + Enter. The first line becomes the title.",
        "Пишіть і натисніть Ctrl/⌘ + Enter. Перший рядок стане назвою.",
      ), { placement: "bottom" }),
      S("thought-card", T("Organize later", "Впорядкуйте пізніше"), T(
        "“Map” places the thought on a mind map. The ⋯ menu turns it into a task, promotes it to a note or moves it into a folder. Filed thoughts leave the Inbox.",
        "«Карта» розміщує думку на карті думок. Меню ⋯ перетворює її на задачу, робить нотаткою або переносить у папку. Розкладені думки зникають із «Вхідних».",
      )),
      HELP_STEP,
    ],
  },
  {
    id: "notes",
    match: /^\/notes$/,
    steps: [
      S(undefined, T("Notes", "Нотатки"), T(
        "All your notes and thoughts in one place. Notes can be linked to each other and placed on mind maps.",
        "Усі нотатки й думки в одному місці. Нотатки можна пов'язувати між собою та розміщувати на картах думок.",
      )),
      S("notes-search", T("Search and filter", "Пошук і фільтри"), T(
        "Search titles and text, type #tag for a tag, pick a folder, or switch between notes, thoughts, favorites and archive.",
        "Шукайте за назвою й текстом, введіть #тег для тегу, оберіть папку або перемкніть нотатки, думки, обране й архів.",
      ), { placement: "bottom" }),
      S("notes-new", T("Write a note", "Напишіть нотатку"), T(
        "Creates a new note and opens the editor right away.",
        "Створює нову нотатку й одразу відкриває редактор.",
      ), { placement: "bottom" }),
      HELP_STEP,
    ],
  },
  {
    id: "note",
    match: /^\/notes\/[^/]+$/,
    steps: [
      S(undefined, T("The note editor", "Редактор нотаток"), T(
        "Write freely — everything saves automatically. Markdown shortcuts work too: “# ” heading, “- ” list, “[ ] ” checklist, “> ” quote.",
        "Пишіть вільно — усе зберігається автоматично. Працюють і скорочення Markdown: «# » заголовок, «- » список, «[ ] » чекліст, «> » цитата.",
      )),
      S("note-toolbar", T("Formatting", "Форматування"), T(
        "Headings, bold, lists, checklists, quotes, code, tables, links and images. Drag or paste an image straight into the text.",
        "Заголовки, жирний, списки, чеклісти, цитати, код, таблиці, посилання й зображення. Зображення можна просто перетягнути або вставити в текст.",
      ), { placement: "bottom" }),
      S("note-kind", T("Thought or note", "Думка чи нотатка"), T(
        "Short ideas are thoughts, longer writing is a note. Switch any time.",
        "Короткі ідеї — це думки, розлогі тексти — нотатки. Перемикайте будь-коли.",
      ), { placement: "bottom" }),
      S("note-side", T("Context", "Контекст"), T(
        "Choose a folder and tags, see on which mind maps this note appears, which notes link here (backlinks) and attached files. “Add” places the note on a map.",
        "Оберіть папку й теги, перегляньте, на яких картах думок є ця нотатка, які нотатки посилаються сюди та прикріплені файли. «Додати» розміщує нотатку на карті.",
      ), { placement: "left" }),
      S("note-actions", T("More actions", "Інші дії"), T(
        "Focus mode hides everything but the text. The ⋯ menu turns the note into a task, shows version history, exports to Markdown, archives or deletes it.",
        "Режим фокусу ховає все, крім тексту. Меню ⋯ перетворює нотатку на задачу, показує історію версій, експортує в Markdown, архівує або видаляє.",
      ), { placement: "bottom" }),
    ],
  },
  {
    id: "tasks",
    match: /^\/tasks$/,
    steps: [
      S(undefined, T("Tasks", "Задачі"), T(
        "All actionable steps from every project and goal.",
        "Усі конкретні кроки з усіх проєктів і цілей.",
      )),
      S("tasks-filters", T("Views", "Добірки"), T(
        "Today, upcoming, all open, overdue, without a date, completed — or everything.",
        "Сьогодні, наступні, усі відкриті, прострочені, без дати, виконані — або все разом.",
      ), { placement: "bottom" }),
      S("tasks-quickadd", T("Add a task fast", "Швидко додайте задачу"), T(
        "Type and press Enter. Extras: “tomorrow” or “today” sets the date, “!high” the priority, “#finance” a tag.",
        "Пишіть і натисніть Enter. Додатково: «tomorrow» чи «today» задає дату, «!high» — пріоритет, «#фінанси» — тег.",
      ), { placement: "bottom" }),
      S("tasks-view", T("List or board", "Список або дошка"), T(
        "The board shows To do / In progress / Done columns — drag cards between them.",
        "Дошка показує колонки «До виконання / В роботі / Виконано» — перетягуйте картки між ними.",
      ), { placement: "bottom" }),
      S("tasks-list", T("Work with a task", "Робота з задачею"), T(
        "Tick to complete. Click the title to open details: dates, time block, estimate, repeat, project, goal and dependencies.",
        "Поставте галочку, щоб виконати. Клік по назві відкриває деталі: дати, блок часу, оцінку, повторення, проєкт, ціль і залежності.",
      )),
      HELP_STEP,
    ],
  },
  {
    id: "projects",
    match: /^\/projects$/,
    steps: [
      S(undefined, T("Projects", "Проєкти"), T(
        "A project groups tasks toward one result. Link it to a goal and its tasks count toward that goal's progress.",
        "Проєкт об'єднує задачі навколо одного результату. Прив'яжіть його до цілі — і задачі зараховуватимуться в її прогрес.",
      )),
      S("projects-new", T("New project", "Новий проєкт"), T(
        "Give it a name, a deadline, a color and the goal it supports.",
        "Вкажіть назву, дедлайн, колір і ціль, яку він підтримує.",
      ), { placement: "bottom" }),
      HELP_STEP,
    ],
  },
  {
    id: "project",
    match: /^\/projects\/[^/]+$/,
    steps: [
      S(undefined, T("Inside a project", "Всередині проєкту"), T(
        "The ring shows how many tasks are done. Below is the task board.",
        "Кільце показує, скільки задач виконано. Нижче — дошка задач.",
      )),
      S("tasks-quickadd", T("Add steps", "Додайте кроки"), T(
        "New tasks here automatically belong to this project and its goal.",
        "Нові задачі тут автоматично належать цьому проєкту та його цілі.",
      ), { placement: "bottom" }),
      S("project-actions", T("Project actions", "Дії з проєктом"), T(
        "Put the project on a mind map, edit it, mark it completed, archive or delete it.",
        "Розмістіть проєкт на карті думок, редагуйте, позначте завершеним, архівуйте або видаліть.",
      ), { placement: "bottom" }),
    ],
  },
  {
    id: "goals",
    match: /^\/goals$/,
    steps: [
      S(undefined, T("Goals", "Цілі"), T(
        "Long-term results. Progress is calculated from real work: completed milestones and tasks — never invented.",
        "Довгострокові результати. Прогрес рахується з реальної роботи: виконаних етапів і задач — нічого не вигадується.",
      )),
      S("goals-new", T("Set a goal", "Поставте ціль"), T(
        "Add why it matters, how you'll know you succeeded, a target date and milestones like “Exercise 3× per week”.",
        "Вкажіть, чому це важливо, як зрозуміти, що мети досягнуто, цільову дату та етапи, наприклад «Тренування 3× на тиждень».",
      ), { placement: "bottom" }),
      HELP_STEP,
    ],
  },
  {
    id: "goal",
    match: /^\/goals\/[^/]+$/,
    steps: [
      S(undefined, T("A goal up close", "Ціль зблизька"), T(
        "The ring is the goal's progress: every milestone and every task (including tasks of linked projects) counts.",
        "Кільце — це прогрес цілі: враховується кожен етап і кожна задача (зокрема задачі пов'язаних проєктів).",
      )),
      S("goal-milestones", T("Milestones", "Етапи"), T(
        "Tick a milestone when you reach it. Add new ones at the bottom.",
        "Позначайте етап, коли досягли його. Нові додавайте внизу.",
      )),
      S("goal-tasks", T("Daily actions", "Щоденні дії"), T(
        "Tasks that move this goal forward. Add them here or link existing tasks from the task details.",
        "Задачі, що наближають ціль. Додавайте їх тут або прив'язуйте наявні в деталях задачі.",
      )),
      S("goal-side", T("Everything connected", "Усе пов'язане"), T(
        "Projects and habits that support the goal, calendar activities, goals it depends on, and thoughts connected to it on your mind maps.",
        "Проєкти та звички, що підтримують ціль, події календаря, цілі, від яких вона залежить, і думки, пов'язані з нею на картах.",
      ), { placement: "left" }),
      S("goal-actions", T("Visualize it", "Покажіть на карті"), T(
        "“Visualize” places the goal on a mind map so you can connect it with ideas and other goals.",
        "«Показати на карті» розміщує ціль на карті думок, щоб пов'язати її з ідеями та іншими цілями.",
      ), { placement: "bottom" }),
    ],
  },
  {
    id: "calendar",
    match: /^\/calendar$/,
    steps: [
      S(undefined, T("Plan your time", "Плануйте час"), T(
        "Events and time-blocked tasks from all areas of life in one calendar.",
        "Події та задачі з блоками часу з усіх сфер життя в одному календарі.",
      )),
      S("cal-views", T("Day, week, month", "День, тиждень, місяць"), T(
        "Switch views and move between periods with the arrows.",
        "Перемикайте вигляд і переходьте між періодами стрілками.",
      ), { placement: "bottom" }),
      S("cal-grid", T("Create and move", "Створюйте й переносьте"), T(
        "Click an empty slot to add an event. Drag a block to move it, drag its bottom edge to change the duration. Red outline = overlap with another activity.",
        "Клікніть по вільному часу, щоб додати подію. Перетягніть блок, щоб перенести, а його нижній край — щоб змінити тривалість. Червона рамка — накладка з іншою справою.",
      )),
      S("cal-conflicts", T("Conflicts", "Конфлікти"), T(
        "Overlapping activities are listed here with free time slots suggested — one click moves the activity.",
        "Тут перелічені накладки з пропозиціями вільного часу — один клік переносить справу.",
      ), { placement: "left" }),
      S("cal-unscheduled", T("Time-block your tasks", "Виділіть час на задачі"), T(
        "Drag a task from this list onto the calendar to reserve time for it.",
        "Перетягніть задачу з цього списку в календар, щоб зарезервувати на неї час.",
      ), { placement: "left" }),
      S("cal-goals", T("Where your time goes", "Куди йде ваш час"), T(
        "Minutes per goal this period. One activity can support several goals — e.g. a walk with a podcast counts for fitness and learning.",
        "Хвилини на кожну ціль за період. Одна справа може підтримувати кілька цілей — наприклад, прогулянка з подкастом іде і на спорт, і на навчання.",
      ), { placement: "left" }),
    ],
  },
  {
    id: "habits",
    match: /^\/habits$/,
    steps: [
      S(undefined, T("Habits", "Звички"), T(
        "Small repeated actions — reading, exercise, water, a language — that build up to your goals.",
        "Маленькі регулярні дії — читання, спорт, вода, мова, — що складаються у ваші цілі.",
      )),
      S("habits-grid", T("Log a day", "Позначте день"), T(
        "Click a day's square to log it (click again to add more or reset). Right-click subtracts. The flame shows your current streak.",
        "Клікніть по квадрату дня, щоб позначити виконання (повторний клік додає або скидає). Правий клік зменшує. Вогник — поточна серія днів поспіль.",
      )),
      S("habits-new", T("New habit", "Нова звичка"), T(
        "Set daily or weekly frequency, a target, a reminder time and the goal it supports.",
        "Задайте щоденну чи щотижневу частоту, ціль за кількістю, час нагадування та ціль, яку звичка підтримує.",
      ), { placement: "bottom" }),
      S("habits-stats", T("Statistics", "Статистика"), T(
        "Streaks, best streak, completion rates and a year-long heatmap for each habit.",
        "Серії, найкраща серія, відсоток виконання та теплова карта за рік для кожної звички.",
      )),
    ],
  },
  {
    id: "folders",
    match: /^\/folders(\/[^/]+)?$/,
    steps: [
      S(undefined, T("Folders", "Папки"), T(
        "Folders hold notes, maps, projects and goals for one area of life. Folders can be nested. The ⋯ next to a folder in the sidebar renames, favorites, archives or deletes it.",
        "Папки містять нотатки, карти, проєкти й цілі однієї сфери життя. Папки можна вкладати одна в одну. Кнопка ⋯ біля папки в бічній панелі — перейменувати, в обране, архівувати чи видалити.",
      )),
      HELP_STEP,
    ],
  },
  {
    id: "graph",
    match: /^\/graph$/,
    steps: [
      S(undefined, T("Knowledge graph", "Граф знань"), T(
        "The big picture: every goal, project, task, habit, note and folder, with all their connections — across all maps and folders.",
        "Загальна картина: усі цілі, проєкти, задачі, звички, нотатки й папки з усіма зв'язками — з усіх карт і папок.",
      )),
      S("graph-filters", T("Reduce clutter", "Приберіть зайве"), T(
        "Toggle types on and off, highlight by name, hide unconnected items. Hover a dot to see its neighbors; click it for details.",
        "Вмикайте й вимикайте типи, підсвічуйте за назвою, ховайте непов'язане. Наведіть на точку, щоб побачити сусідів; клікніть — деталі.",
      ), { placement: "right" }),
    ],
  },
  {
    id: "timeline",
    match: /^\/timeline$/,
    steps: [
      S(undefined, T("Timeline", "Хронологія"), T(
        "A diary of how your ideas and plans evolved: what you captured, created and completed, day by day. Use the filters to focus on one kind of item.",
        "Щоденник того, як розвивалися ваші ідеї та плани: що записано, створено й виконано — день за днем. Фільтри допоможуть зосередитися на одному типі.",
      )),
    ],
  },
  {
    id: "search",
    match: /^\/search$/,
    steps: [
      S(undefined, T("Search", "Пошук"), T(
        "Combine keywords, a tag, a type, a status and dates to find anything. For a quick search anywhere press Ctrl/⌘ + K.",
        "Поєднуйте слова, тег, тип, статус і дати, щоб знайти будь-що. Для швидкого пошуку з будь-якої сторінки — Ctrl/⌘ + K.",
      )),
    ],
  },
  {
    id: "assistant",
    match: /^\/assistant$/,
    steps: [
      S(undefined, T("AI assistant", "AI-асистент"), T(
        "Describe what you want in your own words — the assistant proposes goals, milestones, habits, first tasks, connections and a weekly schedule. Nothing is saved until you press Accept.",
        "Опишіть своїми словами, чого хочете, — асистент запропонує цілі, етапи, звички, перші задачі, зв'язки та розклад на тиждень. Нічого не зберігається, доки ви не натиснете «Прийняти».",
      )),
    ],
  },
  {
    id: "settings",
    match: /^\/settings$/,
    steps: [
      S("settings-language", T("Language", "Мова"), T(
        "Switch the whole interface between English and Ukrainian.",
        "Перемикайте весь інтерфейс між англійською та українською.",
      )),
      S("settings-data", T("Your data", "Ваші дані"), T(
        "Export everything to JSON or Markdown, and restore a JSON backup as a new workspace.",
        "Експортуйте все в JSON або Markdown і відновлюйте резервну копію JSON як новий простір.",
      )),
    ],
  },
];

export function tourFor(pathname: string) {
  return TOURS.find((t) => t.match.test(pathname)) ?? null;
}
