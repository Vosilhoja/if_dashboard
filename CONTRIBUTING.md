# Contributing to HURMO UZ Dashboard

## Prerequisites
- Node.js >= 20
- npm >= 10
- Access to the 4 Google Sheets (ask the team lead)
- Gemini API key (Google AI Studio — free tier)

## Setup

```bash
git clone https://github.com/Vosilhoja/if_dashboard.git
cd if_dashboard
npm install
cp .env.example .env.local
# Fill in .env.local with real credentials
npm run dev
```

## Project Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 16 (App Router) | SSR, API Routes, Middleware |
| UI | React 19 + Tailwind CSS 4 | Components, styles |
| State | Zustand | Global filter & theme state |
| Tables | TanStack Table | Headless, performant tables |
| Data | TanStack Query | Server state, caching |
| Forms | React Hook Form + Zod | Validated forms |
| AI | Gemini API | Analytics chat |
| Charts | Recharts | Interactive SVG charts |
| Maps | D3-Geo | Uzbekistan region map |

## Folder Conventions

```
components/
  layout/     # Navigation, Sidebar, Breadcrumbs
  metrics/    # KPI cards, grids, anomaly widgets
  ai/         # AI chat and insights
  analytics/  # BI charts (gender, age, region)
  map/        # Interactive region map
  data-table/ # TanStack Table data grid
  ui/         # Primitive UI: Skeleton, Toast

lib/
  stores/     # Zustand stores (filter, theme)
  schemas/    # Zod schemas (API validation, forms)
  api/        # Server-side: Google Sheets, cache, rate-limit
  utils/      # Pure utilities: dates, CSV, phone numbers
  status/     # Fuzzy status matching engine
```

## Code Rules

1. **TypeScript strict** — no `any`, always type your props and returns
2. **Server Components first** — use `'use client'` only when needed (events, hooks)
3. **Barrel imports** — use `@/components/metrics` not `@/components/MetricsGrid`
4. **Zod at boundaries** — validate API responses with `DashboardMetricsSchema.parse()`
5. **Zustand for global state** — use `useFilterStore()` not custom Context

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run type-check   # TypeScript check without building
npm run lint         # ESLint
```

## Architecture Decision Records

### Why Zustand over Context?
Context causes re-renders across the tree. Zustand is selector-based — only components that read a specific slice re-render. Given 15+ components reading filter state, this is a meaningful performance win.

### Why TanStack Table?
Our DataTable.tsx was 700+ lines. TanStack Table provides sorting, filtering, pagination, and column visibility as headless primitives — letting us keep our design system while eliminating the custom boilerplate.

### Why not shadcn/ui?
Tailwind CSS 4 support in shadcn/ui is still in beta. We use Radix UI primitives directly with our existing design tokens — same foundation, full control.
