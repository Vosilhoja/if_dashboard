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
