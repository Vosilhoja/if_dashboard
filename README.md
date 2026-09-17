# HURMO UZ Dashboard

Responsive Next.js dashboard for HURMO RESEARCH call-center operations and registration funnel analytics.

## Features

- Overview KPI cards, funnel and anomaly indicators.
- Date and week filtering shared between dashboard pages.
- BI analytics for demographics, categories and regions.
- Interactive Uzbekistan map with mouse, touch and stylus support.
- Raw Google Sheets data with search, filtering, pagination and export.
- RBAC-aware navigation and protected `settings`/`users` areas.
- Responsive layout for desktop, tablet and mobile.
- Sequential Google Sheets synchronization with visible `1/5`–`5/5` progress.
- Resizable desktop sidebar with persisted width and compact icon-only mode.
- Mobile synchronization without automatically closing the burger menu.
- Structured error screens for network, authorization, backend and not-found errors.

## Stack

- Next.js 16 and React 19.
- TypeScript 5.
- Tailwind CSS 4.
- TanStack Query, Zustand and React Hook Form.
- Recharts for existing charts.
- ECharts, MapLibre and TanStack Virtual are available for heavier visualizations.
- `date-fns`, `d3-geo`, `lucide-react` and Framer Motion.

## Quick start

```bash
cd if_dashboard_site
npm ci
copy .env.example .env.local
```

Set only the public backend URL:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

Run the backend separately from `if_dashboard_backend`.

```bash
npm run dev          # http://localhost:3000
npm run type-check
npm run lint
npm run build
npm run start        # production server after build
```

## Environment and security

Only `NEXT_PUBLIC_*` variables belong in this application. Never put any of these in `.env.local`:

- `JWT_SECRET`;
- `DATABASE_URL`;
- `GOOGLE_PRIVATE_KEY`;
- Google service-account credentials;
- Telegram bot tokens.


## Application routes

| Route | Purpose |
|---|---|
| `/overview` | Main KPI overview |
| `/dashboard` | Operational funnel |
| `/analytics` | Demographic and BI analysis |
| `/map` | Regional map |
| `/raw` | Source tables |
| `/settings` | Integrations and settings |
| `/users` | User and role management |

The last two areas are visible and accessible according to the backend/frontend RBAC policy; `super_admin` has full access.

## Architecture

```text
Browser
  -> Next.js App Router and server-side API proxy
  -> Backend API (JWT, RBAC and analytics)
```


## Performance notes

- Keep one shared query cache instead of fetching the same sheet on every component.
- Use the existing server-side proxy and backend cache for dashboard data.
- Use virtualized rows for large raw-data lists.
- Use MapLibre/WebGL only for high-volume map layers; keep the current SVG map for smaller datasets.
- Avoid adding multiple chart, state or map libraries for the same responsibility.
- Dashboard data is read through the backend snapshot; pages do not call Google Sheets directly.
- Overview uses summary analytics responses instead of transferring the complete raw row set.
- The frontend uses stale-while-revalidate caches and deduplicates concurrent GET requests.

## Validation before deployment

```bash
npm run type-check
npm run lint
npm run build
npm audit --audit-level=high
```

Manual smoke scenarios:

1. Log in as `super_admin`.
2. Open `/settings` and `/users`.
3. Change the date range and verify all dashboard sections update.
4. Test the map with mouse and touch gestures.
5. Verify raw-table filtering, sorting, pagination and export.
6. Verify that no secret appears in browser requests or client-side environment variables.

## Repository layout

```text
app/                    Next.js routes and API proxy handlers
components/             Dashboard, charts, map and tables
lib/                    API clients, auth, filters, analytics and utilities
public/geo/             Uzbekistan GeoJSON
middleware.ts           Route protection
.env.example            Safe environment template
```

## Подробная структура frontend

```text
app/
├── layout.tsx                    # fonts, providers и global shell
├── globals.css                   # theme tokens, controls и responsive rules
├── (dashboard)/
│   ├── layout.tsx                # Sidebar, page transition, toast container
│   ├── overview/page.tsx         # KPI и summary analytics
│   ├── dashboard/page.tsx        # operational funnel
│   ├── analytics/page.tsx        # BI charts и filters
│   ├── map/page.tsx              # regional map
│   ├── raw/page.tsx              # выбор исходной таблицы
│   ├── raw/[sheet]/page.tsx      # table query, filter, sort, export
│   ├── statuses/page.tsx         # categories, phrases, suggestions
│   ├── settings/page.tsx         # settings UI
│   └── users/page.tsx            # RBAC user administration
├── api/proxy/
│   ├── [...path]/route.ts        # forwarding и cookie handling
│   └── data/sync/route.ts        # sync proxy
├── login/page.tsx                # login form
├── error.tsx                     # route-level runtime fallback
├── global-error.tsx              # root runtime fallback
└── not-found.tsx                 # 404 с переходом на /overview

components/
├── Sidebar.tsx                  # desktop/mobile navigation и resize handle
├── DataTable.tsx                # server-side table controls
├── DateFilter.tsx               # shared date period
├── MetricCard.tsx               # KPI cards
├── FunnelWidget.tsx             # conversion funnel
├── SurveyAttemptsPanel.tsx
├── analytics/                   # charts and regional analysis
├── map/                         # map detail panels
├── ui/                          # Button, Dropdown, Toast, form controls
└── layout/                      # reusable page layout pieces

lib/
├── api-client.ts                # fetch wrapper, retry, dedupe, ApiError
├── proxy-response.ts             # proxy response normalization
├── dashboard-cache.ts            # stale-while-revalidate cache
├── auth-context.tsx              # session and role state
├── theme-context.tsx             # light/dark mode
├── analytics-filter-context.tsx  # shared analytics filters
├── schemas/                     # client validation
└── *.test.*                     # Vitest unit tests
```

## Данные и состояние

Стандартный запрос проходит так:

1. Page component формирует typed query.
2. `lib/api-client.ts` отправляет запрос в `/api/proxy/*`.
3. Next.js proxy добавляет cookie и пересылает запрос backend.
4. Backend отвечает snapshot/summary JSON.
5. Client cache обновляет страницу stale-while-revalidate способом.

Raw tables используют server-side `search`, `sortBy`, `sortDirection`, `page`, `pageSize` и typed filters. Числовые поля сортируются как числа, ISO/date-поля как даты, остальные значения как нормализованный текст. После изменения фильтра page сбрасывается на первую страницу.

## Sidebar и responsive layout

Desktop sidebar имеет ширину от `76px` до `360px`. Перетаскивание выполняется только за выделенную правую resize-зону. Во время drag:

- добавляется `sidebar-resizing`;
- браузерное выделение текста отключается;
- весь курсор получает `col-resize`;
- ссылки и кнопки не становятся случайно активными;
- ширина сохраняется в `localStorage` под ключом `hurmo-sidebar-width`.

При ширине до `100px` включается compact mode: отображаются логотип-буква, иконки навигации, sync, theme и logout; подписи и badges скрываются. На mobile используется отдельный drawer и burger-кнопка. Синхронизация не закрывает drawer автоматически.

## Error states

`ApiError` содержит HTTP status, backend code, request ID, endpoint и location. UI различает:

- network/offline;
- `401` с предложением войти;
- `403` с сообщением о правах;
- `404` через `not-found.tsx`;
- `429` с сообщением о лимите;
- `5xx` и proxy/backend unavailable;
- неизвестные runtime errors через `error.tsx`.

Не показывайте пользователю raw stack trace production. Для поддержки сохраняйте request ID и время запроса.

## Frontend maintenance rules

- Новые backend endpoint-ы подключать через proxy и `api-client`, а не прямым browser fetch к внешнему API.
- Не помещать секреты в `NEXT_PUBLIC_*`.
- Для больших списков использовать server-side pagination и virtual rows.
- Для общих фильтров переиспользовать существующий context.
- После изменения route, proxy или response schema запускать type-check, lint, тесты и production build.
- Не дублировать нормализацию статусов и телефонов, если уже есть backend contract.
