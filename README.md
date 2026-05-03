# QuickRun ⚡

QuickRun is a high-performance, hyperlocal delivery platform designed to connect buyers, sellers, and drivers in real-time. Built with a modern Go backend and a responsive React frontend, it offers a seamless experience for on-demand item requests and delivery tracking.

## 🚀 Key Features

- **🛍️ Buyers**: Create item requests, receive multiple offers from local sellers, select the best deal, and track deliveries in real-time.
- **🏪 Sellers**: View nearby requests, submit competitive offers, and manage outgoing orders.
- **🛵 Drivers**: Real-time job assignments, GPS location reporting, and status management for active deliveries.
- **📊 Admin Dashboard**: Platform-wide metrics, user management, and order monitoring.

## 🛠️ Technology Stack

### Backend
- **Language**: Go (v1.22)
- **API**: RESTful API with OpenAPI/Swagger documentation
- **Database**: PostgreSQL with Drizzle ORM (Type-safe SQL)
- **Auth**: JWT-based session management

### Frontend
- **Framework**: React (Vite)
- **State Management**: TanStack Query (React Query) v5
- **Styling**: Vanilla CSS with shadcn/ui components
- **Routing**: Wouter

### Infrastructure
- **Package Manager**: pnpm (Monorepo workspace)
- **Containerization**: Docker & Docker Compose
- **API Generation**: Orval (Type-safe React hooks from OpenAPI)

## 📦 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v22+)
- [pnpm](https://pnpm.io/)
- [Go](https://go.dev/) (v1.22+)
- [Docker](https://www.docker.com/) & Docker Compose

### Fast Track with Docker
The easiest way to get the full stack running is using Docker Compose:

```bash
# Clone the repository
git clone <repository-url>
cd Local-Swift-Dash

# Start the environment
docker-compose up --build
```
The services will be available at:
- **Frontend**: [http://localhost:19572](http://localhost:19572)
- **API Server**: [http://localhost:8080](http://localhost:8080)
- **Database**: localhost:5432

### Local Development Setup
If you prefer running services natively:

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Start the API Server**:
   ```bash
   cd artifacts/api-server
   # Set environment variables (see below)
   go run .
   ```

3. **Start the Frontend**:
   ```bash
   cd artifacts/quickrun
   pnpm run dev
   ```

## 📂 Project Structure

```text
.
├── artifacts/
│   ├── api-server/      # Go Backend API
│   ├── quickrun/        # React Frontend Application
│   └── mockup-sandbox/  # UI prototyping environment
├── lib/
│   ├── api-client-react/# Generated API hooks
│   ├── api-spec/        # OpenAPI definitions
│   ├── api-zod/         # Zod schemas for validation
│   └── db/              # Database models and migrations
├── scripts/             # Development and utility scripts
├── docker-compose.yml   # Orchestration for the full stack
└── pnpm-workspace.yaml  # Monorepo configuration
```

## ⚙️ Environment Variables

The application requires the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:password@localhost:5432/quickrun` |
| `SESSION_SECRET`| Secret for JWT signing | `quickrun-secret-key` |
| `PORT` | API or Frontend port | `8080` (API) / `19572` (FE) |

## 🛡️ Security
This project implements a **1-day minimum release age** for all npm packages to prevent supply-chain attacks. This is configured in `pnpm-workspace.yaml`.

## 📄 License
MIT License. See [LICENSE](LICENSE) for details.
