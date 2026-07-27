# Velluma — Azure infrastructure (Bicep)

Deploys the Velluma backend to **Azure Container Apps** on the near-free tier
(see `../Azure_Plan.md`). The Next.js frontend is **not** here — it stays on
Vercel / Azure Static Web Apps (free).

## What gets created

| Resource | Purpose |
|----------|---------|
| Log Analytics workspace (`velluma-logs`) | Required by ACA. 1 GB/day cap keeps it in the free band. |
| Container Apps environment (`velluma-env`) | Private internal DNS for the mesh. |
| `velluma-redis` | Self-hosted `redis:7-alpine`, internal TCP :6379, password-protected. Replaces paid Azure Cache for Redis. |
| `velluma-<service>` ×12 | Internal NestJS workers (no ingress; outbound Redis only). Health probes on :3100. |
| `velluma-api-gateway` | The only public app. External HTTPS ingress on :3001. |

All apps run at 0.25 vCPU / 0.5 GiB, min-1 / max-1 (min-1 because Redis
subscribers must not scale to zero — see the plan's §8).

## Files

- `main.bicep` — environment + all 14 apps.
- `modules/containerApp.bicep` — reusable single-app module.
- `main.bicepparam` — parameter values (reads secrets from env vars).

## Deploy

```bash
# 1. Log in and create the resource group
az login
az group create -n rg-velluma -l eastus

# 2. Export secrets (never commit these)
export GHCR_OWNER=your-github-username
export GHCR_TOKEN=ghp_xxx                 # PAT with read:packages (omit if images are public)
export IMAGE_TAG=$(git rev-parse --short HEAD)
export SUPABASE_URL=https://xxx.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=...
export SUPABASE_ANON_KEY=...
export REDIS_PASSWORD=$(openssl rand -base64 24)
export ALLOWED_ORIGINS=https://your-frontend.vercel.app
export VAPID_PUBLIC_KEY=...
export VAPID_PRIVATE_KEY=...
export STRIPE_SECRET_KEY=...
export STRIPE_WEBHOOK_SECRET=...
export GOOGLE_GENERATIVE_AI_API_KEY=...
export RESEND_API_KEY=...
export TWILIO_ACCOUNT_SID=...
export TWILIO_AUTH_TOKEN=...
export TWILIO_FROM_NUMBER=...

# 3. Validate, then deploy
az deployment group validate -g rg-velluma -f infra/main.bicep -p infra/main.bicepparam
az deployment group create   -g rg-velluma -f infra/main.bicep -p infra/main.bicepparam
```

The deployment outputs `gatewayUrl` — set that as the frontend's
`NEXT_PUBLIC_API_URL`, and add the frontend URL to `ALLOWED_ORIGINS`.

## Notes

- **Images must exist in ghcr.io first.** Push them via the
  `.github/workflows/deploy.yml` pipeline (or `docker build/push` manually)
  before deploying, otherwise the apps fail to pull.
- `REDIS_PASSWORD` must be identical here and in the images' runtime env — the
  Bicep wires the same secret into Redis and every service, so just set it once.
- Redis is **ephemeral** (transient RPC bus). Restarts drop in-flight calls;
  the transport retries (`retryAttempts: 5`).
