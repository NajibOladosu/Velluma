<h1 align="center">
   <strong>Velluma</strong>
</h1>

<p align="center">
  <strong>The Freelancer Business Operating System.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.1-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/NestJS-11.0-e0234e?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS">
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Supabase-Database-3ecf8e?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind">
</p>

Velluma is a full-stack platform that handles the entire freelance business lifecycle — from pipeline and proposals through contracts, invoicing, time tracking, and escrow payments.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4 |
| Backend | 13 NestJS microservices + API Gateway |
| Database | Supabase (PostgreSQL with RLS) |
| Transport | Redis pub/sub (ioredis) |
| Payments | Stripe Connect + Escrow |
| AI | Google Generative AI (contract wizard) |
| Monorepo | Turborepo |

## Architecture

```
Next.js Frontend (port 3000)
  → API Gateway / BFF (port 3001, NestJS)
    → Domain Microservices (Redis pub/sub)
      → Supabase PostgreSQL (RLS-enforced)
```

### Monorepo Layout

```
apps/
├── web/                          # Next.js frontend
├── api-gateway/                  # BFF — routes requests to microservices
├── contract-service/             # Contract lifecycle & signatures
├── invoice-payment-service/      # Invoicing & Stripe escrow payments
├── identity-service/             # User identity, tenants, KYC
├── crm-service/                  # Client management
├── project-service/              # Projects & milestones
├── document-service/             # Proposals & document generation
├── notification-service/         # Email, push, in-app notifications
├── budget-tracking-service/      # Budget tracking & profitability
├── expense-bookkeeping-service/  # Expense categorization
├── time-tracking-service/        # Time logging & billing
├── resource-service/             # Deliverables & file management
└── automation-service/           # Workflow automation & triggers
packages/
└── supabase-lib/                 # Shared Supabase client (NestJS module)
supabase/
└── migrations/                   # PostgreSQL migration files
```

## Dual-Experience Architecture

Velluma has two distinct UX modes:

**Freelancer Dashboard** (`/dashboard`, `/clients`, `/contracts`, etc.)
- Sidebar navigation with collapsible sections
- Command palette (Cmd+K) for keyboard-driven navigation
- Data-dense layouts for managing the business

**Client Portal** (`/portal`)
- Clean, center-aligned single-column layout
- Magic link (OTP) authentication — no password required
- Trust signals: Stripe badge, encryption indicators

## Getting Started

### Prerequisites

- **Node.js** >= 18 (24+ recommended)
- **Docker Desktop** (for local Redis)
- **npm** (ships with Node)

### Setup

```bash
# Clone the repo
git clone https://github.com/your-org/velluma.git
cd velluma

# Install dependencies
npm install

# Start Redis
docker-compose up -d redis

# Start the full stack (frontend + all services)
npm run dev
```

The frontend is available at **http://localhost:3000** and the API Gateway at **http://localhost:3001**.

### Environment Variables

Create `.env` files in the relevant `apps/` directories. See `apps/identity-service/.env.example` for the pattern.

**Frontend** (`apps/web/.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Backend services** (each service's `.env`):
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Additional** (service-specific):
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — invoice-payment-service
- `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASSWORD` — notification-service
- `GOOGLE_GENERATIVE_AI_API_KEY` — contract AI wizard

## Scripts

### Root (monorepo)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all services concurrently |
| `npm run build` | Build entire monorepo via Turbo |
| `npm run lint` | ESLint across all packages |
| `npm run format` | Prettier formatting |

### Frontend (`apps/web`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server (port 3000) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |

### Backend services (`apps/*-service`)

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run test` | Jest tests |

### Infrastructure

| Command | Description |
|---------|-------------|
| `docker-compose up -d` | Start Redis + all services |
| `docker-compose up -d redis` | Start only Redis (for local dev) |

## Key Features

**Pipeline & CRM** — Track leads, manage client relationships, move deals through stages.

**Proposals** — Rich text editor (TipTap) with interactive pricing tables and digital signatures.

**Contracts** — AI-assisted contract generation, clause locking, version history, multi-party signatures.

**Invoicing & Escrow** — Stripe-powered invoicing with escrow payments. Funds are held until milestones are approved.

**Time Tracking** — Global timer, manual entries, billable hours linked to projects and clients.

**Expense Tracking** — Categorize expenses, track receipts, monitor spending per project.

**Profitability & Analytics** — Per-project profitability, revenue dashboards, billable utilization metrics.

**Automations** — Event-driven workflow triggers (e.g., send contract after proposal acceptance).

## Contract Status Flow

```
draft → pending_signatures → pending_funding → active → pending_delivery
  → in_review → pending_completion → completed
                                        ↓
                                  disputed / cancelled
```

## Database

- PostgreSQL via Supabase with Row Level Security (RLS)
- Multi-tenant isolation via `tenant_id` on core tables
- 26 migration files in `supabase/migrations/`
- Service role client bypasses RLS (system operations only)
- User-scoped client enforces RLS (default for all user requests)

## Deployment

- **Frontend**: Vercel
- **CI/CD**: GitHub Actions — lint + typecheck on PRs, Vercel deploy on push to `master`
- **Backend services**: Dockerized via `docker-compose.yml` with shared Dockerfile template

## Project Structure (Frontend)

```
apps/web/src/
├── app/
│   ├── (dashboard)/       # Freelancer views (sidebar layout)
│   ├── (portal)/          # Client portal (centered layout)
│   ├── login/             # Auth pages
│   └── signup/
├── components/ui/         # Design system (shadcn/ui + custom)
├── lib/
│   ├── api-client.ts      # Gateway client with auth injection
│   └── queries/           # TanStack Query hooks
├── store/                 # Zustand stores
├── providers/             # React context providers
└── utils/supabase/        # Supabase client helpers
```

## License

Private. All rights reserved.
