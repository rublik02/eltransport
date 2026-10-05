/**
 * Рекламные объявления сайта «ЭлектроТранспорт».
 * Файл можно редактировать в админ-панели (admin.html) и экспортировать оттуда.
 * Формат: window.ELTRANSPORT_ADS = { version, updatedAt, items: [...] }
 * Зоны: leaderboard (шапка), sidebar (боковая колонка), feed (лента статей),
 *       prefooter (перед подвалом), popup (всплывающее окно).
 */
window.ELTRANSPORT_ADS = {
  version: 1,
  updatedAt: "2026-10-05T00:00:00.000Z",
  items: [
    {
      id: "ad-demo-1",
      zone: "leaderboard",
      format: "native",
      title: "Электромобили в лизинг для бизнеса",
      text: "Ставка от 0,01% на 24 месяца. Полное обслуживание и зарядное оборудование в комплекте.",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/2017_Nissan_LEAF_%28ZE0_MY17%29_hatchback_%282018-11-02%29_01.jpg/1280px-2017_Nissan_LEAF_%28ZE0_MY17%29_hatchback_%282018-11-02%29_01.jpg",
      link: "https://example.com/leasing",
      active: true,
      priority: 10,
      showPercent: 100,
      start: "",
      end: "",
      createdAt: "2026-10-05T00:00:00.000Z"
    },
    {
      id: "ad-demo-2",
      zone: "sidebar",
      format: "text",
      title: "Курс «Техник электромобилей»",
      text: "Онлайн-обучение с практикой на реальных батареях. Диплом после 3 месяцев.",
      image: "",
      link: "https://example.com/courses",
      active: true,
      priority: 5,
      showPercent: 100,
      start: "",
      end: "",
      createdAt: "2026-10-05T00:00:00.000Z"
    },
    {
      id: "ad-demo-3",
      zone: "feed",
      format: "native",
      title: "Домашняя зарядка HomeCharge",
      text: "Установка зарядного пункта за один день. Гарантия 3 года, скидка по промокоду ВОЛЬТ.",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Phillips_Chevrolet%27s_Solar_Charging_Station_for_Electric_Vehicles.JPG/500px-Phillips_Chevrolet%27s_Solar_Charging_Station_for_Electric_Vehicles.JPG",
      link: "https://example.com/homecharge",
      active: true,
      priority: 5,
      showPercent: 100,
      start: "",
      end: "",
      createdAt: "2026-10-05T00:00:00.000Z"
    },
    {
      id: "ad-demo-4",
      zone: "popup",
      format: "text",
      title: "Тест-драйв электромобиля на выходных",
      text: "Запишитесь на бесплатный заезд — 30 минут за рулём без обязательств.",
      image: "",
      link: "https://example.com/testdrive",
      active: true,
      priority: 1,
      showPercent: 100,
      start: "",
      end: "",
      createdAt: "2026-10-05T00:00:00.000Z"
    },
    {
      id: "ad-demo-5",
      zone: "prefooter",
      format: "text",
      title: "Шиномонтаж и сервис электрокаров",
      text: "Диагностика высоковольтной системы, шиномонтаж, хранение шин. Москва, ЮАО.",
      image: "",
      link: "https://example.com/service",
      active: false,
      priority: 1,
      showPercent: 100,
      start: "",
      end: "",
      createdAt: "2026-10-05T00:00:00.000Z"
    }
  ]
};
