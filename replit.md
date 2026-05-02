# QuickRun — Hyperlocal Delivery (Sri Lanka)

## Overview

pnpm workspace monorepo using TypeScript. Hyperlocal on-demand delivery web app for Colombo/Negombo. Buyers post item requests via free text, nearby sellers respond with price and availability, a driver delivers within 30–60 minutes.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS v4 + shadcn/ui
- **Routing**: Wouter
- **State**: TanStack Query

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

| Artifact | Path | Port |
|---|---|---|
| `quickrun` | `/` | 19572 |
| `api-server` | `/api` | 8080 |

## User Roles

- **Buyer** (`kasun@quickrun.lk`) — post item requests, view offers, track delivery
- **Seller** (`nimal@quickrun.lk`, `suresh@quickrun.lk`) — view incoming requests, submit offers with price
- **Driver** (`rajan@quickrun.lk`, `priya@quickrun.lk`) — see assigned deliveries, update status
- **Admin** (`admin@quickrun.lk`) — dashboard stats, manage all orders and users

All demo accounts use password: `password`

## Database Schema

Tables: `users`, `orders`, `offers`, `deliveries`, `activity`

Enums: `user_role` (buyer/seller/driver/admin), `order_status`, `delivery_status`

## Auth

JWT token stored in `localStorage` as `qr_token`, user as `qr_user`. Token injected via `setAuthTokenGetter` from `@workspace/api-client-react`. Secret from `SESSION_SECRET` env var.

## Key Files

- `artifacts/quickrun/src/App.tsx` — routing with 4-role auth protection (ProtectedRoute + wouter Switch)
- `lib/api-spec/openapi.yaml` — API contract (source of truth for codegen)
- `lib/api-spec/orval.config.ts` — codegen config (zod mode: "single" to avoid barrel conflict)
- `artifacts/api-server/src/routes/` — all route handler files
- `artifacts/api-server/src/lib/auth.ts` — JWT auth middleware
- `lib/db/src/schema/index.ts` — exports all DB tables
- `lib/api-client-react/src/custom-fetch.ts` — auth token injection

## Known Fixes Applied

- Routing: `HomeRedirect` must be a plain component (not wrapping a `<Route>`) when placed inside wouter `<Switch>` — inner Route with no path on the outer component blocks all other routes.
- Orval: zod output uses `mode: "single"` with absolute path; `lib/api-zod/src/index.ts` exports only from `./generated/api`.
- Seed data: bcrypt hash must be generated on the actual runtime (Node 24); pre-computed hashes from other environments may not verify correctly.
