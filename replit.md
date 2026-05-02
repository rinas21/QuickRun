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
| `main.go` | Router setup, pgxpool (min=2 max=20), release mode |
| `models.go` | All Go structs (User, Order, Offer, OfferWithSeller, Delivery, DeliveryDetail, MyOfferItem, InventoryItem, etc.) |
| `auth.go` | JWT sign/verify + bcrypt hash/check |
| `middleware.go` | requireAuth (JWT extraction + DB lookup), requireRole |
| `handlers_auth.go` | /api/auth/* (register, login, logout, me, online-toggle); drivers auto-online on login |
| `handlers_orders.go` | /api/orders/* (CRUD, enriched with delivery ref) |
| `handlers_offers.go` | GET /orders/:id/offers (array+seller JOIN), GET /offers/mine, POST offers, POST offers/:id/select |
| `handlers_deliveries.go` | /api/deliveries/* (full JOIN enrichment: driver/order/buyer/offer/seller) |
| `handlers_users.go` | /api/users/* (admin user management, drivers) |
| `handlers_dashboard.go` | /api/dashboard/stats, /activity (array), /order-status-breakdown (array) |
| `handlers_inventory.go` | /api/inventory/* (CRUD for sellers, browse for buyers) |

The `dev` script in `package.json` is `go run .` so the existing Replit workflow works.

## Frontend Key Files

- `artifacts/quickrun/src/App.tsx` — routing with 4-role auth protection
- `artifacts/quickrun/src/components/layout.tsx` — nav (buyer: Orders+Marketplace; seller: Requests+Inventory; driver: Deliveries with online dot)
- `artifacts/quickrun/src/components/map-view.tsx` — Leaflet.js map (async import, pending markers queue to fix async race)
- `artifacts/quickrun/src/lib/api.ts` — `apiFetch<T>()` helper with auth token from localStorage
- `artifacts/quickrun/src/pages/marketplace/index.tsx` — Browse inventory; "Request Delivery" → /buyer?item=...&notes=...
- `artifacts/quickrun/src/pages/seller/inventory.tsx` — Seller inventory CRUD with dialog form
- `artifacts/quickrun/src/pages/seller/index.tsx` — Two tabs: Incoming Requests + My Submitted Offers
- `artifacts/quickrun/src/pages/buyer/tracking.tsx` — Live tracking with Leaflet map + STATUS_STEPS (4 steps, no at_seller)
- `artifacts/quickrun/src/pages/driver/index.tsx` — Online/offline toggle; enriched delivery cards with seller+address
- `artifacts/quickrun/src/pages/driver/delivery.tsx` — Active delivery page with real map + GPS simulation
- `artifacts/quickrun/src/pages/admin/index.tsx` — Dashboard charts (recharts) + activity feed
- `artifacts/quickrun/src/pages/admin/orders.tsx` — Admin orders table with status filter + cancel + view actions
- `lib/api-spec/openapi.yaml` — API contract (source of truth for codegen)
- `lib/api-client-react/src/custom-fetch.ts` — auth token injection for generated hooks

## API Routes Summary

```
GET  /api/healthz
POST /api/auth/register | login | logout
GET  /api/auth/me
PUT  /api/auth/online       — driver toggles online/offline { isOnline: bool }

GET  /api/orders               — buyer sees own, others see all
POST /api/orders               — buyer/admin only
GET  /api/orders/:id           — enriched with delivery ref
POST /api/orders/:id/cancel
GET  /api/orders/:id/offers    — returns Offer[] with seller info embedded
POST /api/orders/:id/offers    — seller/admin only
GET  /api/offers/mine          — seller's submitted offers with order context
POST /api/offers/:id/select    — buyer/admin; creates delivery + assigns driver

GET   /api/deliveries          — enriched DeliveryDetail[] with driver/order/offer/seller
GET   /api/deliveries/:id      — enriched with driver/order/offer JOINs
PATCH /api/deliveries/:id/status   — driver/admin; picking_up also sets order.status=picked_up
PATCH /api/deliveries/:id/location — driver/admin; updates delivery + users table

GET   /api/users               — admin only
PATCH /api/users/:id/status    — admin only
GET   /api/users/drivers/available

GET /api/dashboard/stats | /activity | /order-status-breakdown   — all return arrays

GET    /api/inventory          — all available items; ?category=X&search=Y
GET    /api/inventory/mine     — seller's own items
POST   /api/inventory          — seller only
PUT    /api/inventory/:id      — seller only (partial update)
DELETE /api/inventory/:id      — seller only
```

## Data Flow Notes

- Dashboard activity/breakdown → returned as bare JSON arrays (not wrapped objects)
- Offers list → returned as bare JSON array with seller embedded
- Deliveries list → returned as `{ deliveries: DeliveryDetail[], total: N }` (wrapped, frontend uses `.deliveries`)
- Orders list → returned as `{ orders: Order[], total: N }` (wrapped, frontend uses `.orders`)
- Users list → returned as `{ users: User[] }` (wrapped, frontend uses `.users`)

## Marketplace → Buyer Order Flow

Marketplace "Request Delivery" navigates to `/buyer?item=<name>&notes=<From seller · Rs. price/unit>`.
Buyer dashboard reads these URL params and prefills the form.

## Known Fixes Applied

- Routing: `HomeRedirect` must be a plain component (not wrapping a `<Route>`) in wouter `<Switch>`.
- Orval: zod output uses `mode: "single"` with absolute path.
- Seed data: bcrypt hash regenerated for Node 24 runtime compatibility.
- Leaflet: async dynamic import + pending markers queue to fix race condition.
- Inventory JOIN: must use `i.column_name` aliased form to avoid ambiguous column.
- Dashboard endpoints: return arrays directly (not wrapped) to match OpenAPI spec + frontend.
- Offers list: returns array directly (not wrapped `{offers:[]}`) so `data || []` default works.
- My Offers null scan: `COALESCE(o.selected_offer_id = of.id, false)` prevents pgx NULL bool scan failure.
- pgxpool: min=2 max=20 connections, health check, idle timeout for production load.
- Driver online: auto-online on login, auto-offline on logout, manual toggle via PUT /api/auth/online.
- Delivery status cascade: picking_up → order.status=picked_up; delivered → order.status=delivered.
