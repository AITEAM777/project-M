/** All landing-page copy. Ukrainian is the default; English mirrors its shape. */
const uk = {
  nav: { how: "Як це працює", audience: "Для кого", features: "Можливості", faq: "FAQ", login: "Увійти", start: "Почати", open: "Відкрити Nodera", menu: "Меню", close: "Закрити" },
  hero: {
    badgeNew: "Нове",
    badge: "Перетворюйте нотатки на плани за хвилину",
    titleA: "Перетворюйте думки\nна ",
    titleHi: "пов'язані",
    titleB: " плани.",
    lead: "Nodera — ваш другий мозок. Записуйте ідеї, бачте, як сфери життя впливають одна на одну, і рухайтесь до цілей з вимірюваним прогресом.",
    cta: "Почати безкоштовно",
    video: "Дивитись відео",
    note: "Без картки. Ваші дані доступні лише вам.",
  },
  map: {
    url: "nodera.app / карта думок",
    all: "Усі сфери",
    me: "Я",
    label: "Карта думок: як сфери життя пов'язані між собою",
    spheres: { health: "Здоров'я", ideas: "Ідеї", study: "Навчання", business: "Бізнес" },
    thoughts: {
      run: "Біг зранку", sleep: "Сон до 23:30", cafe: "Кав'ярня?", podcast: "Подкаст про крипту",
      session: "Сесія в січні", english: "Англійська до літа", bot: "Запустити бота", mvp: "MVP — 2 модулі",
    },
    link: "сон → фокус на MVP",
  },
  plan: {
    title: "План тижня",
    sub: "з карти думок · 5 задач",
    items: ["Біг 3× по 20 хв", "Розклад сесії", "MVP бота — 2 модулі", "Сон до 23:30", "Записати 1 епізод"],
    progress: "Прогрес тижня",
    howTitle: "Як працює Nodera",
    howSub: "Відео",
  },
  problem: {
    kicker: "Проблема",
    title: "Думки є. Системи — немає.",
    text: "Ідеї приходять о другій ночі, цілі губляться в нотатках телефона, а плани живуть окремо від того, що насправді важливо. В результаті — багато думок і мало руху вперед.",
    clouds: ["а що як відкрити кав'ярню?", "почати бігати", "вивчити англійську до літа", "ідея для TikTok", "не знаю, чого хочу", "запустити бота", "більше спати", "прочитати 12 книг", "знайти своє", "подкаст?"],
  },
  steps: {
    kicker: "Як це працює",
    titleA: "Від хаосу до прогресу — ",
    titleHi: "4 кроки",
    titleB: ".",
    items: [
      { t: "Думки", d: "Записуйте все, що спадає на думку, — швидкою нотаткою з будь-якої сторінки." },
      { t: "Зв'язки", d: "Nodera показує, як сфери життя впливають одна на одну — сон на фокус, навчання на бізнес." },
      { t: "Плани", d: "Важливе стає ціллю та задачами з дедлайнами — без окремих застосунків." },
      { t: "Прогрес", d: "Бачите, як ви рухаєтесь: по тижнях, по сферах, по цілях." },
    ],
  },
  audience: {
    kicker: "Для кого",
    title: "Для тих, хто росте.",
    items: [
      { t: "Для тих, хто розвивається", d: "Навчання, звички, спорт, книги — усе в одній карті, де видно, що реально рухає вас уперед.", r: "видно, на що йде ваш час" },
      { t: "Для тих, хто шукає себе", d: "Не знаєте, чого хочете? Записуйте все, що «чіпляє», — Nodera покаже теми, до яких ви повертаєтесь знову і знову.", r: "думки складаються в напрямок" },
      { t: "Для підприємців", d: "Від ідеї о другій ночі до запуску: гіпотези, задачі, дедлайни і зв'язок із вашими ресурсами та енергією.", r: "ідея · план · перші клієнти" },
      { t: "Для тих, хто просто нотує", d: "Швидкі нотатки без структури. Порядок наведете потім — Nodera допоможе розкласти все по сферах.", r: "записали й забули, але не загубили" },
    ],
  },
  features: {
    kicker: "Можливості",
    title: "Усе потрібне. Нічого зайвого.",
    items: [
      { t: "Швидкий запис", d: "Нотатка за 2 секунди — з телефона чи комп'ютера, однією клавішею." },
      { t: "Карта зв'язків", d: "Візуальна карта думок і сфер життя з типами зв'язків." },
      { t: "Цілі та задачі", d: "Перетворюйте будь-яку думку на ціль чи задачу одним кліком." },
      { t: "Трекер прогресу", d: "Звички, етапи й чесний прогрес по кожній цілі." },
      { t: "Нагадування", d: "М'які підказки повернутися до важливого вчасно." },
      { t: "Експорт будь-коли", d: "Ваші дані — у Markdown або JSON за секунду." },
    ],
  },
  privacy: {
    kicker: "Приватність",
    title: "Ваші думки належать лише вам.",
    text: "Nodera — особистий простір. Ми не читаємо ваші нотатки і не продаємо дані.",
    items: ["Шифрування даних", "Доступ лише для вас", "Експорт і видалення в будь-який момент"],
  },
  faq: {
    kicker: "FAQ",
    title: "Питання.",
    items: [
      { q: "Чи це безкоштовно?", a: "Так, почати можна безкоштовно і без картки. Нотатки, карти думок, цілі, задачі та звички доступні одразу після реєстрації." },
      { q: "Чим Nodera відрізняється від звичайних нотаток?", a: "Звичайні нотатки просто зберігають текст. Nodera з'єднує думки між собою, показує, як сфери життя впливають одна на одну, і перетворює важливе на цілі й задачі з прогресом, який видно." },
      { q: "Чи є мобільний застосунок?", a: "Окремого застосунку поки немає, але Nodera повноцінно працює в браузері телефона. Додайте сайт на головний екран — і він відкриватиметься як застосунок." },
      { q: "Хто бачить мої записи?", a: "Лише ви. Ми не читаємо ваші нотатки і не продаємо дані. Ви можете будь-коли експортувати все в Markdown чи JSON або видалити акаунт разом з даними." },
    ],
  },
  cta: { titleA: "Почніть думати ", titleHi: "ясніше", titleB: ".", sub: "Перша нотатка — за 10 секунд.", button: "Створити акаунт" },
  footer: { about: "Про нас", privacy: "Конфіденційність", terms: "Умови", contact: "Контакти" },
  video: { title: "Як працює Nodera", soon: "Відео скоро з'явиться.", close: "Закрити відео" },
};

export type Copy = typeof uk;

const en: Copy = {
  nav: { how: "How it works", audience: "Who it's for", features: "Features", faq: "FAQ", login: "Log in", start: "Get started", open: "Open Nodera", menu: "Menu", close: "Close" },
  hero: {
    badgeNew: "New",
    badge: "Turn notes into plans in a minute",
    titleA: "Turn thoughts\ninto ",
    titleHi: "connected",
    titleB: " plans.",
    lead: "Nodera is your second brain. Capture ideas, see how areas of your life affect each other, and move toward your goals with measurable progress.",
    cta: "Start for free",
    video: "Watch video",
    note: "No card needed. Only you can see your data.",
  },
  map: {
    url: "nodera.app / mind map",
    all: "All areas",
    me: "Me",
    label: "Mind map: how areas of life connect",
    spheres: { health: "Health", ideas: "Ideas", study: "Learning", business: "Business" },
    thoughts: {
      run: "Morning run", sleep: "Bed by 23:30", cafe: "A café?", podcast: "Crypto podcast",
      session: "Exams in January", english: "English by summer", bot: "Launch the bot", mvp: "MVP — 2 modules",
    },
    link: "sleep → focus on MVP",
  },
  plan: {
    title: "Week plan",
    sub: "from the mind map · 5 tasks",
    items: ["Run 3× for 20 min", "Exam schedule", "Bot MVP — 2 modules", "Bed by 23:30", "Record 1 episode"],
    progress: "Week progress",
    howTitle: "How Nodera works",
    howSub: "Video",
  },
  problem: {
    kicker: "The problem",
    title: "Plenty of thoughts. No system.",
    text: "Ideas arrive at 2 a.m., goals get lost in phone notes, and plans live apart from what actually matters. The result: lots of thinking, little moving forward.",
    clouds: ["what if I opened a café?", "start running", "learn English by summer", "TikTok idea", "not sure what I want", "launch a bot", "sleep more", "read 12 books", "find my thing", "podcast?"],
  },
  steps: {
    kicker: "How it works",
    titleA: "From chaos to progress in ",
    titleHi: "4 steps",
    titleB: ".",
    items: [
      { t: "Thoughts", d: "Capture whatever comes to mind with a quick note from any page." },
      { t: "Connections", d: "Nodera shows how areas of life affect each other — sleep on focus, learning on business." },
      { t: "Plans", d: "What matters becomes goals and tasks with deadlines — no extra apps." },
      { t: "Progress", d: "See how you move forward: by week, by area, by goal." },
    ],
  },
  audience: {
    kicker: "Who it's for",
    title: "For people who grow.",
    items: [
      { t: "For self-improvers", d: "Learning, habits, sport, books — all on one map that shows what really moves you forward.", r: "see where your time goes" },
      { t: "For people finding their way", d: "Not sure what you want? Capture whatever resonates — Nodera surfaces the themes you keep coming back to.", r: "thoughts add up to a direction" },
      { t: "For founders", d: "From a 2 a.m. idea to launch: hypotheses, tasks, deadlines — tied to your resources and energy.", r: "idea · plan · first customers" },
      { t: "For people who just take notes", d: "Quick notes with no structure. Tidy up later — Nodera helps you sort everything by area.", r: "write it and forget it — but never lose it" },
    ],
  },
  features: {
    kicker: "Features",
    title: "Everything you need. Nothing you don't.",
    items: [
      { t: "Quick capture", d: "A note in 2 seconds — from phone or computer, with one key." },
      { t: "Connection map", d: "A visual map of your thoughts and life areas with typed links." },
      { t: "Goals & tasks", d: "Turn any thought into a goal or task in one click." },
      { t: "Progress tracker", d: "Habits, milestones and honest progress for every goal." },
      { t: "Reminders", d: "Gentle nudges to come back to what matters, on time." },
      { t: "Export anytime", d: "Your data as Markdown or JSON in a second." },
    ],
  },
  privacy: {
    kicker: "Privacy",
    title: "Your thoughts belong to you.",
    text: "Nodera is a personal space. We don't read your notes and we don't sell data.",
    items: ["Encrypted data", "Access for you only", "Export and delete anytime"],
  },
  faq: {
    kicker: "FAQ",
    title: "Questions.",
    items: [
      { q: "Is it free?", a: "Yes — you can start for free, no card needed. Notes, mind maps, goals, tasks and habits are available right after sign-up." },
      { q: "How is Nodera different from regular notes?", a: "Regular notes just store text. Nodera connects thoughts, shows how areas of your life affect each other, and turns what matters into goals and tasks with visible progress." },
      { q: "Is there a mobile app?", a: "Not a separate app yet, but Nodera works fully in your phone's browser. Add it to your home screen and it opens like an app." },
      { q: "Who can see my notes?", a: "Only you. We don't read your notes or sell data. You can export everything as Markdown or JSON, or delete your account with all data, at any time." },
    ],
  },
  cta: { titleA: "Start thinking ", titleHi: "clearer", titleB: ".", sub: "Your first note in 10 seconds.", button: "Create account" },
  footer: { about: "About", privacy: "Privacy", terms: "Terms", contact: "Contact" },
  video: { title: "How Nodera works", soon: "The video is coming soon.", close: "Close video" },
};

export const COPY = { uk, en } as const;
export type LandingLang = keyof typeof COPY;
