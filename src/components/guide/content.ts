/** Tutorial copy, one entry per sidebar section, in sidebar order. Ukrainian and English. */

export type GuideLang = "uk" | "en";

export interface Section {
  id: string;
  href: string;
  name: string;
  tagline: string;
  what: string;
  how: string[];
  links: string[];
  shows: string[];
  tip: string;
}

export interface GuideCopy {
  meta: { back: string; open: string; toc: string };
  hero: { kicker: string; title: string; titleAccent: string; lead: string };
  flow: { title: string; lead: string; stages: { name: string; text: string; items: string[] }[] };
  chain: { title: string; lead: string; rows: { from: string; to: string; text: string }[] };
  labels: { what: string; how: string; links: string; shows: string; tip: string; openSection: string; none: string };
  sections: Section[];
  example: { kicker: string; title: string; lead: string; steps: { where: string; text: string }[] };
  cheat: { title: string; rows: [string, string][] };
  rules: { title: string; items: string[] };
  cta: { title: string; text: string; button: string };
}

const uk: GuideCopy = {
  meta: { back: "На головну", open: "Відкрити Nodera", toc: "Зміст" },
  hero: {
    kicker: "Туторіал",
    title: "Як усе працює",
    titleAccent: "і як розділи пов'язані між собою",
    lead: "Пройдімося по меню зверху вниз — від Дашборда до Хронології. Для кожного розділу: що він робить, як ним користуватися, до чого його можна прив'язати і де він потім відображається.",
  },
  flow: {
    title: "Головна ідея за 30 секунд",
    lead: "Усі розділи — це чотири кроки одного шляху: від думки в голові до результату, який видно.",
    stages: [
      { name: "1. Записати", text: "Усе, що спало на думку, — швидко і без структури.", items: ["Мої думки", "Нотатки"] },
      { name: "2. Поєднати", text: "Побачити, як ідеї та сфери життя впливають одна на одну.", items: ["Карти думок", "Папки", "Граф знань"] },
      { name: "3. Діяти", text: "Перетворити ідеї на ціль, план і щоденні дії.", items: ["Цілі", "Проєкти", "Задачі", "Звички", "Календар"] },
      { name: "4. Бачити результат", text: "Прогрес і історія збираються автоматично.", items: ["Дашборд", "Хронологія"] },
    ],
  },
  chain: {
    title: "Ланцюжок, на якому все тримається",
    lead: "Прив'язки йдуть знизу вгору: маленька дія рухає велику ціль. Відмітили задачу — прогрес цілі оновився сам.",
    rows: [
      { from: "Задача", to: "Проєкт", text: "задача входить у проєкт" },
      { from: "Проєкт", to: "Ціль", text: "задачі проєкту рахуються в прогрес цілі" },
      { from: "Задача", to: "Ціль", text: "або напряму, без проєкту" },
      { from: "Звичка", to: "Ціль", text: "регулярна дія, що веде до цілі" },
      { from: "Подія календаря", to: "Ціль (одна або кілька)", text: "час, який ви на це виділили" },
      { from: "Думка", to: "Нотатка · Картка на карті", text: "ідея виростає в текст або стає частиною схеми" },
      { from: "Картка на карті", to: "Задача · Ціль · Проєкт · Звичка · Нотатка", text: "це той самий об'єкт, не копія" },
    ],
  },
  labels: { what: "Що це", how: "Як користуватися", links: "До чого прив'язати", shows: "Де відображається", tip: "Порада", openSection: "Відкрити розділ", none: "Нічого прив'язувати не треба — розділ заповнюється сам." },
  sections: [
    {
      id: "dashboard", href: "/dashboard", name: "Дашборд", tagline: "Ваш день на одному екрані",
      what: "Головний екран, з якого варто починати кожен день. Тут нічого не створюється «з нуля» — Дашборд збирає найважливіше з усіх інших розділів.",
      how: [
        "Віджети: Сьогодні (задачі на сьогодні), Розклад, Цілі з прогресом, Найближче, Звички, Думки, Проєкти, Карти, Активність.",
        "Задачу можна відмітити виконаною прямо у віджеті — прогрес цілі та проєкту оновиться одразу.",
        "Кнопка «Захопити» ⚡ (або клавіша Q) вгорі — швидко записати думку з будь-якої сторінки. «+ Створити» — нова нотатка, карта, задача, проєкт, ціль чи звичка.",
        "Пошук ⌘K / Ctrl+K знаходить будь-що в усіх розділах.",
      ],
      links: [],
      shows: ["Задачі з датою на сьогодні → «Сьогодні»", "Цілі → смужки прогресу", "Звички → відмітки за сьогодні", "Нові думки → «Думки»", "Події календаря → «Розклад»"],
      tip: "Дві хвилини зранку: подивіться «Сьогодні», відмітьте звички — і ви знаєте, що робити.",
    },
    {
      id: "thoughts", href: "/thoughts", name: "Мої думки", tagline: "Вхідні для вашої голови",
      what: "Місце, куди можна скинути все, що прийшло в голову, не думаючи про порядок. Правило просте: спочатку записати, потім упорядкувати.",
      how: [
        "Напишіть рядок і натисніть Enter — думку збережено. З будь-якої сторінки — кнопка «Захопити» ⚡.",
        "«Вхідні» — думки, які ще не розкладені по папках. «Усі» — повний список.",
        "У меню думки: перемістити в папку, перетворити на нотатку, додати на карту думок.",
      ],
      links: ["Папка (сфера життя: Здоров'я, Бізнес…)", "Карта думок — як окрема картка", "Нотатка — якщо думка виросла в довший текст"],
      shows: ["Дашборд → віджет «Думки»", "Карта думок (якщо додали)", "Хронологія", "Пошук ⌘K"],
      tip: "Раз на тиждень розбирайте «Вхідні»: кожну думку — в папку, на карту або видаліть.",
    },
    {
      id: "notes", href: "/notes", name: "Нотатки", tagline: "Повноцінні тексти",
      what: "Довгі записи: конспекти, плани, щоденник, ідеї з деталями. Редактор із форматуванням, списками, тегами та файлами.",
      how: [
        "Напишіть [[ і почніть вводити назву іншої нотатки — між ними з'явиться посилання.",
        "Теги (#тег) і ⭐ обране — щоб швидко знаходити потрібне.",
        "Історія версій: попередні варіанти тексту зберігаються автоматично.",
        "До нотатки можна прикріпити фото та файли.",
      ],
      links: ["Папка", "Інші нотатки — через [[посилання]]", "Картка на карті думок (кнопка «Додати на карту» або «Пов'язати нотатку» в панелі картки)"],
      shows: ["Граф знань — лінії між пов'язаними нотатками", "Карта думок — картка з іконкою 📄", "Хронологія", "Пошук ⌘K"],
      tip: "Думка виросла в щось більше? Перетворіть її на нотатку — текст нікуди не зникне.",
    },
    {
      id: "maps", href: "/maps", name: "Карти думок", tagline: "Полотно, де все поєднується",
      what: "Нескінченне полотно з картками та стрілками. Саме тут видно, як ідеї, цілі й задачі впливають одна на одну.",
      how: [
        "Подвійний клік по полотну — нова картка. Tab — дочірня картка, Enter — сусідня.",
        "Потягніть від краю картки й відпустіть на іншій — з'явиться зв'язок. Тип зв'язку обирається вгорі: «Веде до», «Залежить від», «Конфліктує з» тощо.",
        "Текст пишеться прямо на картці: «+ Додати текст» або Shift+Enter після назви. Картка росте разом із текстом.",
        "У правій панелі картку можна перетворити на задачу, ціль, проєкт, звичку чи нотатку. Після цього вона «оживає»: показує статус, прогрес і відмітки.",
        "«Шлях» показує, що блокує ціль; «Фокус» — лише одну гілку. Зміни зберігаються автоматично.",
      ],
      links: ["Задачі, Цілі, Проєкти, Звички, Нотатки — картка і об'єкт це одне й те саме: змінили в одному місці — оновилося всюди", "Папка — для самої карти", "Одна ціль може бути на кількох картах одночасно"],
      shows: ["Граф знань — усі лінії, які ви намалювали", "Дашборд → «Карти»", "Хронологія"],
      tip: "Одна карта — одна тема або сфера. Починайте з центральної ідеї та розгалужуйтеся від неї.",
    },
    {
      id: "projects", href: "/projects", name: "Проєкти", tagline: "Набір задач з однією метою",
      what: "Проєкт збирає задачі, які разом дають результат: «Запуск сайту», «Ремонт кухні», «Курс англійської».",
      how: [
        "Створіть проєкт: назва, колір, дати, статус.",
        "Додавайте задачі всередині проєкту — видно, скільки вже виконано.",
        "Прив'яжіть проєкт до цілі — і всі його задачі почнуть рахуватися в її прогрес.",
      ],
      links: ["Ціль (проєкт рухає ціль)", "Папка", "Картка на карті думок"],
      shows: ["Задачі — кожна показує свій проєкт", "Сторінка цілі", "Календар — задачі з кольором проєкту", "Граф знань", "Дашборд → «Проєкти»"],
      tip: "Якщо справа займає більше трьох кроків — зробіть з неї проєкт.",
    },
    {
      id: "tasks", href: "/tasks", name: "Задачі", tagline: "Конкретні дії",
      what: "Усе, що треба зробити. Кожна задача — один чіткий крок, який можна відмітити ✓.",
      how: [
        "Два вигляди: «Список» і «Дошка» (До виконання → В роботі → Готово).",
        "Пріоритет, дедлайн, час у календарі, оцінка тривалості, повторення, теги.",
        "Залежності: задача може чекати, поки виконається інша.",
        "Відмітили ✓ — прогрес проєкту й цілі оновився одразу, а на карті картка стала «виконаною».",
      ],
      links: ["Проєкт", "Ціль — напряму або через проєкт", "Етап цілі", "Картка на карті думок", "Календар — через дедлайн або час"],
      shows: ["Дашборд → «Сьогодні»", "Календар — за датою", "Ціль і Проєкт — у прогресі", "Карта думок — живий статус", "Граф знань"],
      tip: "Починайте назву з дієслова: «Подзвонити…», «Написати…». Так легше почати.",
    },
    {
      id: "goals", href: "/goals", name: "Цілі", tagline: "Куди ви йдете",
      what: "Великий результат, якого хочете досягти: «Пробігти марафон», «Перші 1000 $ з продажів».",
      how: [
        "Мотивація (навіщо) і критерії успіху (як зрозумію, що досягнув).",
        "Етапи — великі контрольні точки на шляху.",
        "Прогрес рахується сам: етапи + усі задачі цілі (прямі та з її проєктів). За бажання — ручний прогрес.",
        "Залежності: одна ціль може чекати на іншу.",
      ],
      links: ["Проєкти", "Задачі", "Звички", "Етапи", "Події календаря (одна подія може працювати на кілька цілей)", "Картка на карті", "Папка"],
      shows: ["Дашборд — прогрес", "Карта думок — смужка прогресу на картці", "Календар", "Граф знань"],
      tip: "Тримайте 3–5 активних цілей, і щоб у кожної була хоча б одна задача на цей тиждень.",
    },
    {
      id: "calendar", href: "/calendar", name: "Календар", tagline: "Коли ви це робите",
      what: "Ваш час: день, тиждень або місяць. Тут план перетворюється на реальні години.",
      how: [
        "Створюйте події прямо в календарі, з повторенням за потреби.",
        "Задачі з дедлайном або запланованим часом з'являються тут автоматично.",
        "Подію можна прив'язати до однієї чи кількох цілей одразу (наприклад, прогулянка з подкастом → і Здоров'я, і Навчання).",
      ],
      links: ["Цілі — подія може працювати на кілька цілей", "Задачі — через дедлайн або запланований час"],
      shows: ["Дашборд → «Розклад» і «Найближче»", "Сторінка цілі"],
      tip: "Важкі задачі ставте блоком часу в календар — тоді вони справді стаються.",
    },
    {
      id: "habits", href: "/habits", name: "Звички", tagline: "Маленькі повторювані дії",
      what: "Те, що ви робите регулярно: читати 20 хвилин, тренування, вода, медитація.",
      how: [
        "Частота: щодня або щотижня, з кількістю (наприклад, 3 рази на тиждень) і одиницею виміру.",
        "Відмітка одним кліком; видно серію днів і історію.",
        "Можна задати час нагадування.",
      ],
      links: ["Ціль — звичка, що веде до цілі", "Картка на карті — відмічайте прямо на ній"],
      shows: ["Дашборд → «Звички»", "Сторінка цілі", "Карта думок", "Хронологія"],
      tip: "Почніть з 1–2 звичок і найменшої дози: «1 сторінка», а не «50 сторінок».",
    },
    {
      id: "graph", href: "/graph", name: "Граф знань", tagline: "Усі зв'язки на одній схемі",
      what: "Автоматична схема всього, що пов'язано у вашому просторі. Тут нічого не створюють — тільки дивляться й досліджують.",
      how: [
        "Збирає три види зв'язків: задачі → проєкти → цілі, [[посилання]] між нотатками і всі лінії з усіх ваших карт.",
        "Пошук підсвічує потрібні вузли; можна сховати те, що ні з чим не пов'язане.",
        "Клік по вузлу відкриває сам об'єкт.",
      ],
      links: [],
      shows: [],
      tip: "Самотній вузол — підказка: ця ідея ні з чим не пов'язана. Може, варто прив'язати її до цілі?",
    },
    {
      id: "timeline", href: "/timeline", name: "Хронологія", tagline: "Історія ваших змін",
      what: "Журнал усього, що відбувалося: що створили, завершили, перемістили чи архівували — день за днем.",
      how: [
        "Фільтри: Усе, Думки, Нотатки, Цілі, Задачі, Карти, Звички.",
        "На тарифі Старт видно останні 30 днів, на Pro і Максимум — довшу історію.",
      ],
      links: [],
      shows: ["Дашборд → «Активність»"],
      tip: "У п'ятницю перегляньте хронологію — видно, скільки ви насправді зробили за тиждень.",
    },
    {
      id: "folders", href: "/folders", name: "Папки", tagline: "Сфери вашого життя",
      what: "Здоров'я, Фінанси, Навчання, Бізнес, Кар'єра… Папки групують усе за темою, щоб у кожній сфері був порядок.",
      how: [
        "Створіть папку кнопкою 📁+ біля заголовка «Папки»; всередині можна робити підпапки.",
        "У папці лежать думки, нотатки, карти, проєкти й цілі.",
        "Кожна річ лежить в одній папці, але може з'являтися на скількох завгодно картах.",
        "Значок поруч відкриває «Усі папки», де можна перейменувати, архівувати чи відновити.",
      ],
      links: ["Думки", "Нотатки", "Карти думок", "Проєкти", "Цілі"],
      shows: ["Бічне меню", "Фільтри в розділах", "Пошук ⌘K"],
      tip: "Зробіть 4–7 папок під головні сфери. Більше — і почнете губитися.",
    },
  ],
  example: {
    kicker: "Приклад",
    title: "Від думки до результату",
    lead: "Як одна ідея проходить через увесь сервіс.",
    steps: [
      { where: "Мої думки", text: "«Хочу продавати свої свічки онлайн» — записали за 5 секунд через ⚡." },
      { where: "Карти думок", text: "Створили карту «Магазин свічок», додали думку. Розгалузили: аудиторія, ціни, реклама, ризики. На картці «Реклама» написали текст із ідеями." },
      { where: "Цілі", text: "Картку в центрі перетворили на ціль «Перші 30 продажів до грудня» з етапами: сайт, фото, реклама." },
      { where: "Проєкти й Задачі", text: "Гілку «Сайт» перетворили на проєкт, а в ньому — задачі: «Зробити фото», «Написати описи», «Підключити оплату». Проєкт прив'язаний до цілі." },
      { where: "Звички", text: "«Публікувати 1 пост щодня» — звичка, прив'язана до цілі." },
      { where: "Календар", text: "«Зйомка товарів» — блок у суботу о 10:00, прив'язаний до цілі." },
      { where: "Дашборд", text: "Щоранку — задачі на сьогодні й звички. Відмітили задачу → прогрес цілі виріс сам." },
      { where: "Граф знань і Хронологія", text: "Видно, як усе пов'язане, і яку роботу зроблено за тиждень." },
    ],
  },
  cheat: {
    title: "Шпаргалка: де що писати?",
    rows: [
      ["Щось спало на думку, ніколи розбиратися", "Мої думки (⚡ або Q)"],
      ["Довгий текст, конспект, план", "Нотатки"],
      ["Хочу побачити, як усе пов'язано", "Карти думок"],
      ["Великий результат на місяці", "Цілі"],
      ["Кілька кроків до одного результату", "Проєкти"],
      ["Одна конкретна дія", "Задачі"],
      ["Роблю регулярно", "Звички"],
      ["Треба виділити час", "Календар"],
      ["Що в мене на сьогодні?", "Дашборд"],
      ["Що я зробив за тиждень?", "Хронологія"],
    ],
  },
  rules: {
    title: "5 правил, щоб усе працювало",
    items: [
      "Записуйте одразу, упорядковуйте потім.",
      "Кожна задача — до проєкту або цілі. Тоді прогрес рахується сам.",
      "Одна карта — одна тема. Пов'язуйте картки стрілками, а текст пишіть прямо на них.",
      "Плануйте час у календарі, а не тільки дедлайни.",
      "Раз на тиждень: розібрати «Вхідні», переглянути цілі та хронологію.",
    ],
  },
  cta: { title: "Готові спробувати?", text: "Почніть з однієї думки — решта складеться сама.", button: "Відкрити Nodera" },
};

const en: GuideCopy = {
  meta: { back: "Home", open: "Open Nodera", toc: "Contents" },
  hero: {
    kicker: "Tutorial",
    title: "How it all works",
    titleAccent: "and how the sections connect",
    lead: "Let's walk the menu top to bottom — from Dashboard to Timeline. For each section: what it does, how to use it, what you can link it to and where it shows up afterwards.",
  },
  flow: {
    title: "The big idea in 30 seconds",
    lead: "Every section is one of four steps on a single path: from a thought in your head to a result you can see.",
    stages: [
      { name: "1. Capture", text: "Everything on your mind — fast, with no structure.", items: ["My Thoughts", "Notes"] },
      { name: "2. Connect", text: "See how ideas and areas of life affect each other.", items: ["Mind Maps", "Folders", "Knowledge Graph"] },
      { name: "3. Act", text: "Turn ideas into a goal, a plan and daily actions.", items: ["Goals", "Projects", "Tasks", "Habits", "Calendar"] },
      { name: "4. See results", text: "Progress and history build up automatically.", items: ["Dashboard", "Timeline"] },
    ],
  },
  chain: {
    title: "The chain that holds it together",
    lead: "Links go bottom-up: small actions move big goals. Tick a task and the goal's progress updates by itself.",
    rows: [
      { from: "Task", to: "Project", text: "a task belongs to a project" },
      { from: "Project", to: "Goal", text: "the project's tasks count toward the goal" },
      { from: "Task", to: "Goal", text: "or directly, without a project" },
      { from: "Habit", to: "Goal", text: "a repeated action that leads to the goal" },
      { from: "Calendar event", to: "Goal (one or several)", text: "the time you set aside for it" },
      { from: "Thought", to: "Note · Map card", text: "an idea grows into text or becomes part of a map" },
      { from: "Map card", to: "Task · Goal · Project · Habit · Note", text: "it's the same item, not a copy" },
    ],
  },
  labels: { what: "What it is", how: "How to use it", links: "Link it to", shows: "Where it shows up", tip: "Tip", openSection: "Open section", none: "Nothing to link — this section fills itself." },
  sections: [
    {
      id: "dashboard", href: "/dashboard", name: "Dashboard", tagline: "Your day on one screen",
      what: "The home screen to start each day with. You don't create things here — the Dashboard gathers what matters from every other section.",
      how: [
        "Widgets: Today (tasks due today), Schedule, Goals with progress, Upcoming, Habits, Thoughts, Projects, Maps, Activity.",
        "Tick a task right in the widget — goal and project progress update instantly.",
        "Capture ⚡ (or the Q key) at the top saves a thought from any page. “+ New” creates a note, map, task, project, goal or habit.",
        "Search ⌘K / Ctrl+K finds anything across all sections.",
      ],
      links: [],
      shows: ["Tasks due today → “Today”", "Goals → progress bars", "Habits → today's check-ins", "New thoughts → “Thoughts”", "Calendar events → “Schedule”"],
      tip: "Two minutes each morning: check “Today”, tick your habits — and you know what to do.",
    },
    {
      id: "thoughts", href: "/thoughts", name: "My Thoughts", tagline: "An inbox for your head",
      what: "The place to drop whatever comes to mind without worrying about order. The rule is simple: capture first, organize later.",
      how: [
        "Type a line and press Enter — saved. From any page, use Capture ⚡.",
        "“Inbox” shows thoughts not yet filed into a folder; “All” shows everything.",
        "From a thought's menu: move to a folder, promote to a note, add to a mind map.",
      ],
      links: ["Folder (an area of life: Health, Business…)", "Mind map — as a card", "Note — when the thought grows into longer text"],
      shows: ["Dashboard → “Thoughts” widget", "Mind map (if added)", "Timeline", "Search ⌘K"],
      tip: "Once a week, clear the Inbox: file each thought, put it on a map, or delete it.",
    },
    {
      id: "notes", href: "/notes", name: "Notes", tagline: "Full-length writing",
      what: "Longer writing: summaries, plans, journal entries, detailed ideas. A rich editor with formatting, lists, tags and files.",
      how: [
        "Type [[ and start typing another note's title — the two notes become linked.",
        "Tags (#tag) and ⭐ favorites help you find things fast.",
        "Version history: earlier versions of the text are saved automatically.",
        "Attach photos and files to a note.",
      ],
      links: ["Folder", "Other notes — via [[links]]", "A mind-map card (“Add to map”, or “Link note” in the card panel)"],
      shows: ["Knowledge Graph — lines between linked notes", "Mind map — a card with a 📄 icon", "Timeline", "Search ⌘K"],
      tip: "A thought grew into something bigger? Promote it to a note — nothing gets lost.",
    },
    {
      id: "maps", href: "/maps", name: "Mind Maps", tagline: "The canvas where it all connects",
      what: "An infinite canvas of cards and arrows. This is where you see how ideas, goals and tasks affect each other.",
      how: [
        "Double-click the canvas for a new card. Tab adds a child card, Enter a sibling.",
        "Drag from a card's edge and release on another card to connect them. Pick the connection type at the top: “Leads to”, “Depends on”, “Conflicts with”, and more.",
        "Write text right on the card: “+ Add text”, or Shift+Enter after the title. The card grows with your text.",
        "In the side panel, turn a card into a task, goal, project, habit or note. It comes alive: shows status, progress and check-ins.",
        "“Path” shows what blocks a goal; “Focus” shows a single branch. Everything saves automatically.",
      ],
      links: ["Tasks, Goals, Projects, Habits, Notes — a card and the item are the same thing: change it in one place, it updates everywhere", "Folder — for the map itself", "One goal can sit on several maps at once"],
      shows: ["Knowledge Graph — every line you drew", "Dashboard → “Maps”", "Timeline"],
      tip: "One map per topic or area. Start with a central idea and branch out.",
    },
    {
      id: "projects", href: "/projects", name: "Projects", tagline: "A set of tasks with one aim",
      what: "A project groups tasks that together produce a result: “Launch the website”, “Kitchen renovation”, “English course”.",
      how: [
        "Create a project: title, color, dates, status.",
        "Add tasks inside it and watch how many are done.",
        "Link the project to a goal — all its tasks start counting toward that goal's progress.",
      ],
      links: ["Goal (the project moves it forward)", "Folder", "A mind-map card"],
      shows: ["Tasks — each shows its project", "The goal's page", "Calendar — tasks in the project's color", "Knowledge Graph", "Dashboard → “Projects”"],
      tip: "If something takes more than three steps, make it a project.",
    },
    {
      id: "tasks", href: "/tasks", name: "Tasks", tagline: "Concrete actions",
      what: "Everything you need to do. Each task is one clear step you can tick off ✓.",
      how: [
        "Two views: “List” and “Board” (To do → In progress → Done).",
        "Priority, due date, a time slot, time estimate, repeat, tags.",
        "Dependencies: a task can wait for another one to finish.",
        "Tick ✓ — the project's and goal's progress update instantly, and the map card shows it as done.",
      ],
      links: ["Project", "Goal — directly or through a project", "A goal's milestone", "A mind-map card", "Calendar — through a due date or time slot"],
      shows: ["Dashboard → “Today”", "Calendar — by date", "Goal and Project — in their progress", "Mind map — live status", "Knowledge Graph"],
      tip: "Start the title with a verb: “Call…”, “Write…”. It makes starting easier.",
    },
    {
      id: "goals", href: "/goals", name: "Goals", tagline: "Where you're heading",
      what: "A big result you want to reach: “Run a marathon”, “First $1,000 in sales”.",
      how: [
        "Motivation (why) and success criteria (how you'll know you made it).",
        "Milestones — the big checkpoints along the way.",
        "Progress counts itself: milestones + every task of the goal (direct and from its projects). Manual progress is optional.",
        "Dependencies: one goal can wait for another.",
      ],
      links: ["Projects", "Tasks", "Habits", "Milestones", "Calendar events (one event can serve several goals)", "A mind-map card", "Folder"],
      shows: ["Dashboard — progress", "Mind map — a progress bar on the card", "Calendar", "Knowledge Graph"],
      tip: "Keep 3–5 active goals, each with at least one task for this week.",
    },
    {
      id: "calendar", href: "/calendar", name: "Calendar", tagline: "When you do it",
      what: "Your time: day, week or month. This is where a plan turns into real hours.",
      how: [
        "Create events right in the calendar, repeating if needed.",
        "Tasks with a due date or a scheduled time appear here automatically.",
        "Link an event to one or more goals at once (e.g. a walk with a podcast → both Health and Learning).",
      ],
      links: ["Goals — one event can serve several goals", "Tasks — through a due date or a time slot"],
      shows: ["Dashboard → “Schedule” and “Upcoming”", "The goal's page"],
      tip: "Book hard tasks as a time block in the calendar — that's when they actually happen.",
    },
    {
      id: "habits", href: "/habits", name: "Habits", tagline: "Small repeated actions",
      what: "Things you do regularly: read 20 minutes, work out, drink water, meditate.",
      how: [
        "Frequency: daily or weekly, with a count (e.g. 3 times a week) and a unit.",
        "One click to check in; see your streak and history.",
        "Set a reminder time.",
      ],
      links: ["Goal — a habit that leads to a goal", "A mind-map card — check in right on it"],
      shows: ["Dashboard → “Habits”", "The goal's page", "Mind map", "Timeline"],
      tip: "Start with 1–2 habits and the smallest dose: “1 page”, not “50 pages”.",
    },
    {
      id: "graph", href: "/graph", name: "Knowledge Graph", tagline: "Every connection on one map",
      what: "An automatic picture of everything that's linked in your space. You don't create anything here — you explore.",
      how: [
        "It collects three kinds of links: tasks → projects → goals, [[links]] between notes, and every line from all your maps.",
        "Search highlights nodes; you can hide items with no connections.",
        "Click a node to open the item.",
      ],
      links: [],
      shows: [],
      tip: "A lonely node is a hint: this idea isn't connected to anything. Maybe link it to a goal?",
    },
    {
      id: "timeline", href: "/timeline", name: "Timeline", tagline: "The history of your changes",
      what: "A log of everything that happened: what you created, finished, moved or archived — day by day.",
      how: [
        "Filters: Everything, Thoughts, Notes, Goals, Tasks, Maps, Habits.",
        "The Start plan shows the last 30 days; Pro and Max keep a longer history.",
      ],
      links: [],
      shows: ["Dashboard → “Activity”"],
      tip: "On Friday, scroll the timeline — you'll see how much you really got done this week.",
    },
    {
      id: "folders", href: "/folders", name: "Folders", tagline: "The areas of your life",
      what: "Health, Finance, Education, Business, Career… Folders group everything by topic so each area stays tidy.",
      how: [
        "Create one with the 📁+ button next to the “Folders” heading; nest subfolders inside.",
        "A folder holds thoughts, notes, maps, projects and goals.",
        "Each item lives in one folder but can appear on as many maps as you like.",
        "The icon next to it opens “All folders” to rename, archive or restore.",
      ],
      links: ["Thoughts", "Notes", "Mind maps", "Projects", "Goals"],
      shows: ["The sidebar", "Filters inside sections", "Search ⌘K"],
      tip: "Make 4–7 folders for your main areas. More than that and things get lost.",
    },
  ],
  example: {
    kicker: "Example",
    title: "From a thought to a result",
    lead: "How one idea travels through the whole app.",
    steps: [
      { where: "My Thoughts", text: "“I want to sell my candles online” — captured in 5 seconds with ⚡." },
      { where: "Mind Maps", text: "Made a “Candle shop” map and added the thought. Branched out: audience, prices, ads, risks. Wrote ideas as text right on the “Ads” card." },
      { where: "Goals", text: "Turned the central card into the goal “First 30 sales by December” with milestones: website, photos, ads." },
      { where: "Projects & Tasks", text: "Turned the “Website” branch into a project with tasks: “Take photos”, “Write descriptions”, “Set up payments”. The project is linked to the goal." },
      { where: "Habits", text: "“Post once a day” — a habit linked to the goal." },
      { where: "Calendar", text: "“Product shoot” — a Saturday 10:00 block linked to the goal." },
      { where: "Dashboard", text: "Every morning: today's tasks and habits. Tick a task → the goal's progress grows by itself." },
      { where: "Knowledge Graph & Timeline", text: "See how it all connects and what got done this week." },
    ],
  },
  cheat: {
    title: "Cheat sheet: where does it go?",
    rows: [
      ["Something came to mind, no time to sort it", "My Thoughts (⚡ or Q)"],
      ["Long text, notes, a plan", "Notes"],
      ["I want to see how things connect", "Mind Maps"],
      ["A big result over months", "Goals"],
      ["Several steps toward one result", "Projects"],
      ["One concrete action", "Tasks"],
      ["Something I do regularly", "Habits"],
      ["I need to set aside time", "Calendar"],
      ["What's on today?", "Dashboard"],
      ["What did I do this week?", "Timeline"],
    ],
  },
  rules: {
    title: "5 rules that make it work",
    items: [
      "Capture right away, organize later.",
      "Link every task to a project or goal — then progress counts itself.",
      "One map, one topic. Connect cards with arrows and write text right on them.",
      "Plan time in the calendar, not just deadlines.",
      "Once a week: clear the Inbox, review your goals and the timeline.",
    ],
  },
  cta: { title: "Ready to try?", text: "Start with one thought — the rest falls into place.", button: "Open Nodera" },
};

export const GUIDE: Record<GuideLang, GuideCopy> = { uk, en };
