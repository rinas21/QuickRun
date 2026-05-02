# QuickRun — Hyperlocal Delivery (Sri Lanka)

## Overview

pnpm workspace monorepo. Hyperlocal on-demand delivery web app for Colombo/Negombo. Buyers post item requests via free text, nearby sellers respond with price and availability, a driver delivers within 30–60 minutes.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24 (frontend tooling only)
- **Go version**: 1.25 (backend API server)
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Go + gin v1.10 (replaced previous Express 5 Node.js server)
- **Database driver**: pgx/v5 (raw SQL, no ORM)
- **Auth**: golang-jwt/jwt v5 + x/crypto/bcrypt
- **API codegen**: Orval (from OpenAPI spec in lib/api-spec)
- **Frontend**: React + Vite + Tailwind CSS v4 + shadcn/ui
- **Routing**: Wouter
- **State**: TanStack Query
- **Maps**: Leaflet.js + OpenStreetMap tiles

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — runs `go run .` from artifacts/api-server

## Artifacts

| Artifact | Path | Port | Description |
|---|---|---|---|
| `quickrun` | `/` | 19572 | React + Vite frontend |
| `api-server` | `/api` | 8080 | Go backend (gin + pgx) |

## User Roles & Demo Accounts (all use password: `password`)

| Email | Role | Description |
|---|---|---|
| `admin@quickrun.lk` | admin | Dashboard, all orders/users |
| `kasun@quickrun.lk` | buyer | Post requests, track delivery, browse marketplace |
| `nimal@quickrun.lk` | seller | Manage offers, inventory (5 items seeded) |
| `suresh@quickrun.lk` | seller | Manage offers, inventory (5 items seeded) |
| `rajan@quickrun.lk` | driver | See assigned deliveries, update status/location |
| `priya@quickrun.lk` | driver | See assigned deliveries, update status/location |

## Database Schema

Tables: `users`, `orders`, `offers`, `deliveries`, `activity`, `inventory`

Enums: `user_role` (buyer/seller/driver/admin), `order_status`, `delivery_status`

inventory columns: `id`, `seller_id`, `name`, `category`, `description`, `price`, `quantity`, `unit`, `is_available`, `image_url`, `created_at`, `updated_at`

## Auth

JWT token stored in `localStorage` as `qr_token`. Token injected via `setAuthTokenGetter` from `@workspace/api-client-react`. Secret from `SESSION_SECRET` env var (falls back to `quickrun-secret-key`).

## Go Backend Structure (artifacts/api-server/)

All files in `package main` at root of `artifacts/api-server/`:

| File | Purpose |
|---|---|
| `go.mod` | Go module definition (deps: gin, pgx/v5, jwt/v5, x/crypto) |
| `main.go` | Router setup, main() |
| `models.go` | All Go structs (User, Order, Offer, Delivery, DeliveryDetail, InventoryItem, etc.) |
| `auth.go` | JWT sign/verify + bcrypt hash/check |
| `middleware.go` | requireAuth (JWT extraction + DB lookup), requireRole |
| `handlers_auth.go` | /api/auth/* (register, login, logout, me) |
| `handlers_orders.go` | /api/orders/* (CRUD, enriched with delivery ref) |
| `handlers_offers.go` | /api/orders/:id/offers + /api/offers/:id/select |
| `handlers_deliveries.go` | /api/deliveries/* (enriched with driver/order/offer JOIN) |
| `handlers_users.go` | /api/users/* (admin user management, drivers) |
| `handlers_dashboard.go` | /api/dashboard/stats, /activity, /order-status-breakdown |
| `handlers_inventory.go` | /api/inventory/* (CRUD for sellers, browse for buyers) |

The `dev` script in `package.json` is `go run .` so the existing Replit workflow works.

## Frontend Key Files

- `artifacts/quickrun/src/App.tsx` — routing with 4-role auth protection
- `artifacts/quickrun/src/components/layout.tsx` — nav (buyer: Orders + Marketplace; seller: Requests + Inventory)
- `artifacts/quickrun/src/components/map-view.tsx` — Leaflet.js map component (async import, OpenStreetMap tiles)
- `artifacts/quickrun/src/lib/api.ts` — `apiFetch<T>()` helper for inventory/direct endpoints (auth token injected from localStorage)
- `artifacts/quickrun/src/pages/marketplace/index.tsx` — Buyer marketplace: browse seller inventory with category + text search
- `artifacts/quickrun/src/pages/seller/inventory.tsx` — Seller inventory management: CRUD with dialog form
- `artifacts/quickrun/src/pages/buyer/tracking.tsx` — Live tracking with real Leaflet map showing driver position
- `artifacts/quickrun/src/pages/driver/delivery.tsx` — Driver delivery page with real map + GPS simulation
- `lib/api-spec/openapi.yaml` — API contract (source of truth for codegen)
- `lib/api-client-react/src/custom-fetch.ts` — auth token injection for generated hooks

## API Routes Summary

```
GET  /api/healthz
POST /api/auth/register | login | logout
GET  /api/auth/me

GET  /api/orders               — buyer sees own, others see all
POST /api/orders               — buyer/admin only
GET  /api/orders/:id           — enriched with delivery ref
POST /api/orders/:id/cancel
GET  /api/orders/:id/offers
POST /api/orders/:id/offers    — seller/admin only
POST /api/offers/:id/select    — buyer/admin; creates delivery + assigns driver

GET   /api/deliveries          — driver sees own, others see all
GET   /api/deliveries/:id      — enriched with driver/order/offer (JOINs)
PATCH /api/deliveries/:id/status   — driver/admin
PATCH /api/deliveries/:id/location — driver/admin; updates delivery + users table

GET   /api/users               — admin only
PATCH /api/users/:id/status    — admin only
GET   /api/users/drivers/available

GET /api/dashboard/stats | /activity | /order-status-breakdown

GET    /api/inventory          — all available items (buyers browse); ?category=X&search=Y
GET    /api/inventory/mine     — seller's own items
POST   /api/inventory          — seller only
PUT    /api/inventory/:id      — seller only (partial update)
DELETE /api/inventory/:id      — seller only
```

## Known Fixes Applied

- Routing: `HomeRedirect` must be a plain component (not wrapping a `<Route>`) when placed inside wouter `<Switch>`.
- Orval: zod output uses `mode: "single"` with absolute path.
- Seed data: bcrypt hash regenerated for Node 24 runtime compatibility.
- Leaflet: async dynamic import in useEffect to avoid SSR/window errors.
- Inventory JOIN query: must use `i.column_name` aliased form (not `i.invCols`) to avoid ambiguous `name` column.
