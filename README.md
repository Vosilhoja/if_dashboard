# HURMO UZ — Аналитический дашборд

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Google Sheets](https://img.shields.io/badge/Backend-Google%20Sheets-34A853?logo=googlesheets&logoColor=white)](https://developers.google.com/sheets/api)

**Внутренний аналитический дашборд для HURMO RESEARCH LLC**
Мониторинг операций колл-центра, воронки Telegram-регистраций и ИИ-аналитика в реальном времени.

</div>

---

## ✨ Возможности

| Раздел | Описание |
|---|---|
| 🏠 **Обзор** | KPI-метрики, аномалии, воронка звонков за выбранный период |
| 📊 **Операционная воронка** | Детализация Звонок → SMS → Регистрация, графики конверсий |
| 📈 **BI-аналитика** | Демографические срезы: пол, возраст, образование, статус, регионы |
| 🗺 **Карта регионов** | Интерактивная GeoJSON-карта всех 14 областей Узбекистана |
| 📋 **Сырые таблицы** | Прямой просмотр 4 Google Таблиц с поиском, сортировкой и экспортом |
| 🤖 **ИИ-Аналитик** | Чат-консультант на базе Gemini API со знанием всей структуры данных |
| ⚙️ **Настройки** | Пороги аномалий, диагностика данных, управление интеграциями |

### 🔥 Ключевые технические фишки

- **Fuzzy Status Matching** — алгоритм умного распознавания статусов с опечатками (`otkaaaz` → отказ)
- **Аномалии** — автоматическое сравнение с 4-недельным скользящим средним
- **Спарклайны** — мини-тренд-графики прямо в карточках метрик
- **Живые данные** — сквозная синхронизация фильтра периода / региона / демографии
- **Phone Diagnostics** — нормализация, дедупликация и диагностика 681+ зарубежных номеров
- **Серверный кэш** — `dashboard-cache.ts` снижает нагрузку на Google Sheets API
- **Responsive** — полная адаптация под мобильные и планшеты

---

## 🛠 Стек технологий

```
Frontend          Backend/Data       AI & Integrations
────────────────  ─────────────────  ─────────────────
Next.js 16        Google Sheets API  Gemini API (AI chat)
React 19          google-spreadsheet Eskiz SMS (tracking)
TypeScript 5      Server Actions     Telegram Bot data
Tailwind CSS 4    LRU Cache
Recharts 3        Rate Limiting
D3-Geo (maps)     JWT Auth
Lucide React
```

---

## 🚀 Быстрый старт

### 1. Клонирование

```bash
git clone https://github.com/Vosilhoja/if_dashboard.git
cd if_dashboard
npm install
```

### 2. Переменные окружения

Создайте `.env.local` в корне проекта:

```bash
cp .env.example .env.local
```

| Переменная | Описание | Обязательна |
|---|---|---|
| `GOOGLE_SHEET_ID_MAIN` | ID Google Таблицы `main_base` | ✅ |
| `GOOGLE_SHEET_ID_NUMBERS` | ID Google Таблицы `numbers` | ✅ |
| `GOOGLE_SHEET_ID_ESKIZ` | ID Google Таблицы `eskiz` | ✅ |
| `GOOGLE_SHEET_ID_NOT_COMPLETED` | ID Google Таблицы `not_completed` | ✅ |
| `GOOGLE_CLIENT_EMAIL` | Email сервисного аккаунта Google | ✅ |
| `GOOGLE_PRIVATE_KEY` | Приватный ключ (с `\n`) | ✅ |
| `GEMINI_API_KEY` | Ключ Gemini API для ИИ-чата | ✅ |
| `DASHBOARD_PASSWORD` | Пароль для входа в дашборд | ✅ |
| `JWT_SECRET` | Секрет для JWT токена (min 32 chars) | ✅ |

> **Важно**: Сервисный аккаунт должен иметь доступ **Viewer** ко всем 4 Google Таблицам.

### 3. Запуск

```bash
npm run dev        # Разработка (localhost:3000)
npm run build      # Production сборка
npm run start      # Production сервер
npm run type-check # Проверка TypeScript без сборки
npm run lint       # ESLint проверка
```

---

## 📁 Структура проекта

```
hurmo-uz-dashboard/
│
├── app/                          # Next.js App Router
│   ├── (dashboard)/              # Защищённые маршруты дашборда
│   │   ├── layout.tsx            # Dashboard shell (Sidebar + Breadcrumbs)
│   │   ├── overview/             # 🏠 Главная — KPI + аномалии
│   │   ├── dashboard/            # 📊 Операционная воронка
│   │   ├── analytics/            # 📈 BI-аналитика (демография)
│   │   ├── map/                  # 🗺  Карта регионов Узбекистана
│   │   ├── raw/                  # 📋 Сырые таблицы (все 4 листа)
│   │   ├── chat/                 # 🤖 ИИ-Аналитик (full-page chat)
│   │   └── settings/             # ⚙️  Настройки дашборда
│   │
│   ├── api/                      # API Routes (server-side)
│   │   ├── metrics/              # /api/metrics — агрегация KPI
│   │   ├── ai-chat/              # /api/ai-chat — Gemini AI proxy
│   │   ├── ai-insights/          # /api/ai-insights — авто-инсайты
│   │   ├── analytics/            # /api/analytics — демографические данные
│   │   ├── sheets/               # /api/sheets/[type] — сырые данные
│   │   ├── period-details/       # /api/period-details — детали периода
│   │   ├── settings/             # /api/settings — GET/POST настроек
│   │   ├── settings-link/        # /api/settings-link — ссылки на таблицы
│   │   └── login/                # /api/login — JWT-аутентификация
│   │
│   ├── login/                    # Страница входа
│   ├── globals.css               # Глобальные стили + CSS-переменные темы
│   └── layout.tsx                # Root layout (шрифт, тема)
│
├── components/                   # UI-компоненты
│   ├── layout/                   # 🧱 Навигация и шапка
│   │   ├── Sidebar.tsx           # Боковое меню с live-статусом
│   │   ├── Breadcrumbs.tsx       # Sticky header + Command Palette
│   │   └── Header.tsx            # Дополнительный header
│   │
│   ├── metrics/                  # 📊 Метрики и KPI
│   │   ├── MetricCard.tsx        # Карточка: число + тренд + спарклайн
│   │   ├── MetricsGrid.tsx       # Grid из 8+ метрик с аномалиями
│   │   ├── AnomalyWidget.tsx     # Виджет аномалий (4-недельное среднее)
│   │   └── FunnelWidget.tsx      # Воронка конверсий
│   │
│   ├── ai/                       # 🤖 ИИ-компоненты
│   │   ├── AIChatDrawer.tsx      # Slide-over чат (side panel)
│   │   └── AIInsightsWidget.tsx  # Виджет авто-инсайтов
│   │
│   ├── analytics/                # 📈 BI-визуализации
│   │   ├── AnalyticsSection.tsx  # Главный компонент аналитики
│   │   ├── GenderPieChart.tsx    # Пирог по полу
│   │   ├── AgePyramidChart.tsx   # Возрастная пирамида
│   │   ├── CategoryBarChart.tsx  # Бар-чарт по категориям
│   │   ├── RegionHierarchyTable.tsx  # Таблица иерархии регионов
│   │   ├── RegionMap.tsx         # SVG-карта региона
│   │   └── DataQualityCard.tsx   # Карта качества данных
│   │
│   ├── map/                      # 🗺  Карта Узбекистана
│   │   └── UzbekistanMap.tsx     # D3-Geo SVG интерактивная карта
│   │
│   ├── ui/                       # 🎨 Базовые UI примитивы
│   │   ├── Skeleton.tsx          # Loading skeleton
│   │   └── Toast.tsx             # Toast-уведомления
│   │
│   ├── DataTable.tsx             # Универсальная таблица с пагинацией
│   ├── DateFilter.tsx            # Фильтр периода + сброс
│   ├── PeriodDetailsPanel.tsx    # Боковая панель деталей периода
│   ├── CommandPalette.tsx        # Cmd+K быстрый поиск
│   └── RawDataTabs.tsx           # Табы для сырых таблиц
│
├── lib/                          # Бизнес-логика и утилиты
│   ├── api/                      # 🔌 Серверные адаптеры
│   │   ├── google-sheets.ts      # Google Sheets API клиент
│   │   ├── rate-limit.ts         # Rate limiting (IP-based)
│   │   ├── dashboard-cache.ts    # LRU кэш для ответов API
│   │   └── index.ts              # Barrel export
│   │
│   ├── analytics/                # 📊 Аналитические утилиты
│   │   ├── aggregations.ts       # Агрегация по полу, возрасту, регионам
│   │   ├── age-utils.ts          # Возрастные группы (bins)
│   │   ├── chart-colors.ts       # Цветовые схемы для графиков
│   │   ├── region-name-map.ts    # Маппинг названий 14 областей
│   │   └── index.ts              # Barrel export
│   │
│   ├── utils/                    # 🛠  Чистые утилиты (без side effects)
│   │   ├── date-utils.ts         # Форматирование и диапазоны дат
│   │   ├── csv-utils.ts          # Экспорт CSV/Excel
│   │   ├── phone-utils.ts        # Нормализация и диагностика номеров
│   │   └── index.ts              # Barrel export
│   │
│   ├── status/                   # 🧠 Fuzzy status matching engine
│   │   ├── status-config.ts      # Конфигурация категорий статусов
│   │   ├── status-matcher.ts     # collapse + transliterate + semantic
│   │   └── index.ts              # Barrel export
│   │
│   ├── types.ts                  # Общие TypeScript типы
│   ├── auth.ts                   # JWT-аутентификация
│   ├── analytics-filter-context.tsx  # React Context: глобальный фильтр
│   └── theme-context.tsx         # React Context: тема (dark/light)
│
├── public/
│   └── geo/
│       └── uzbekistan-regions.geojson  # GeoJSON 14 областей
│
├── .env.example                  # Шаблон переменных окружения
├── .env.local                    # Локальные секреты (НЕ в git)
├── next.config.ts                # Next.js + security headers
├── tsconfig.json                 # TypeScript конфигурация
├── package.json
└── README.md
```

---

## 🏛 Архитектура

```
┌─────────────────────────────────────────────────┐
│                  CLIENT BROWSER                  │
│  React 19 + Next.js App Router + Tailwind CSS 4  │
│  Overview │ Analytics │ Map │ AI Chat │ Settings  │
└────────────────────┬────────────────────────────┘
                     │ HTTP
┌────────────────────┼────────────────────────────┐
│         NEXT.JS API ROUTES (Server)              │
│  /api/metrics   /api/ai-chat   /api/sheets       │
│         lib/ — Business Logic Layer              │
│  status/ ── analytics/ ── utils/ ── api/         │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────┼────────────────────────────┐
│               EXTERNAL SERVICES                  │
│  Google Sheets (4 tables)  │  Gemini API         │
│  Eskiz SMS API             │  Telegram Bot        │
└─────────────────────────────────────────────────┘
```

---

## 🧠 Fuzzy Status Matching

```typescript
// Оператор написал: "otkaaaz" / "Откааааз" / "rad etttdiiii"
// Алгоритм → ОТКАЗ (declined)

// lib/status/status-matcher.ts:
// 1. Collapse repeated chars:  "otkaaaz" → "otkaz"
// 2. Transliterate Cyrillic:   "отказ"  → "otkaz"
// 3. Semantic root matching:   "otkaz"  → declined
```

| Написал оператор | Категория |
|---|---|
| `otkaaaz`, `откааааз`, `rad etttdi` | 🔴 Отказ |
| `silkaaa yuborildi`, `sms ketdi` | 🔵 SMS отправлена |
| `qaytaaa`, `povtorniy` | 🟡 Повторный звонок |
| `royxatdan otgan`, `oldin ulangan` | 🟢 Уже зарегистрирован |
| `boshqaaa odam`, `xatooo` | ⚪ Ошибочный номер |

---

## 📊 Google Sheets таблицы

| Таблица | Содержимое | ~Строк |
|---|---|---|
| `numbers` | Обзвоны: дата, номер, статус, оператор | 14 000+ |
| `main_base` | Зарегистрированные пользователи бота | 33 000+ |
| `eskiz` | Лог SMS: DELIVERED / ACCEPTED / REJECTED | 10 000+ |
| `not_completed` | Начавшие, но не завершившие регистрацию | 4 289 |

---

## 🔒 Безопасность

- **JWT Auth** — httpOnly cookie, маршруты дашборда защищены
- **Rate Limiting** — IP-based ограничения на все API endpoints
- **Security Headers** — X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **Service Account** — только Viewer права, нет записи в таблицы
- **Env Secrets** — все секреты только в `.env.local`, не в коде

---

## 🗺 О компании HURMO RESEARCH

> ООО «HURMO RESEARCH» — независимое полноцикловое агентство маркетинговых,
> социологических и медиа-исследований. Узбекистан, Центральная Азия.

- **Сайт**: [hurmo.uz](https://hurmo.uz)
- **Адрес**: г. Ташкент, пр. Мустакиллик, 59/59А
- **Охват**: 12 областей + Каракалпакстан + Ташкент
- **Клиенты**: ООН, Всемирный банк, ЕБРР, USAID, FMCG/финтех/телеком

---

© 2024–2026 HURMO RESEARCH LLC. All rights reserved.
