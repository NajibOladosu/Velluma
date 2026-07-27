// =============================================================================
// Velluma — Azure Container Apps deployment (near-free tier)
//
//   • 1 Container Apps Environment  (consumption + idle billing)
//   • 1 self-hosted Redis container (replaces paid Azure Cache for Redis)
//   • 12 internal NestJS worker services (Redis pub/sub, no ingress)
//   • 1 public API gateway (external ingress on :3001)
//   • Log Analytics with a daily cap to stay inside the 5 GB free band
//
// Images are pulled from GitHub Container Registry (ghcr.io). The Next.js
// frontend is NOT deployed here — it lives on Vercel / Static Web Apps (free).
//
// Deploy:
//   az group create -n rg-velluma -l eastus
//   az deployment group create -g rg-velluma -f infra/main.bicep -p infra/main.bicepparam
// =============================================================================

targetScope = 'resourceGroup'

// ---------------------------------------------------------------------------
// General
// ---------------------------------------------------------------------------
@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('Container Apps managed environment name.')
param environmentName string = 'velluma-env'

@description('GitHub org/user that owns the ghcr.io images.')
param ghcrOwner string

@description('ghcr.io username used to pull images (usually same as owner).')
param ghcrUsername string = ghcrOwner

@description('ghcr.io PAT with read:packages. Leave empty if the images are public.')
@secure()
param ghcrToken string = ''

@description('Image tag to deploy (e.g. the git SHA or "latest").')
param imageTag string = 'latest'

// ---------------------------------------------------------------------------
// Supabase (shared by every service)
// ---------------------------------------------------------------------------
@description('Supabase project URL.')
param supabaseUrl string

@secure()
param supabaseServiceRoleKey string

@secure()
param supabaseAnonKey string

// ---------------------------------------------------------------------------
// Redis (self-hosted container)
// ---------------------------------------------------------------------------
@description('Password enforced on the self-hosted Redis broker.')
@secure()
param redisPassword string

// ---------------------------------------------------------------------------
// Gateway
// ---------------------------------------------------------------------------
@description('Comma-separated allowed CORS origins (the frontend URL).')
param allowedOrigins string

@description('VAPID public key (safe to expose).')
param vapidPublicKey string

// ---------------------------------------------------------------------------
// Per-service external integrations
// ---------------------------------------------------------------------------
@secure()
param stripeSecretKey string = ''
@secure()
param stripeWebhookSecret string = ''
@secure()
param googleAiApiKey string = ''
@secure()
param resendApiKey string = ''
@secure()
param twilioAuthToken string = ''
@secure()
param vapidPrivateKey string = ''

param emailFrom string = 'noreply@velluma.com'
param twilioAccountSid string = ''
param twilioFromNumber string = ''
param vapidSubject string = 'mailto:noreply@velluma.com'

// ---------------------------------------------------------------------------
// Derived
// ---------------------------------------------------------------------------
var redisAppName = 'velluma-redis'
var imageRepo = 'ghcr.io/${ghcrOwner}'
var useRegistryAuth = !empty(ghcrToken)
var registries = useRegistryAuth
  ? [ { server: 'ghcr.io', username: ghcrUsername, passwordSecretRef: 'ghcr-pat' } ]
  : []
var registrySecrets = useRegistryAuth
  ? [ { name: 'ghcr-pat', value: ghcrToken } ]
  : []

// Config shared by all 12 workers -------------------------------------------
var commonSecrets = [
  { name: 'supabase-service-role-key', value: supabaseServiceRoleKey }
  { name: 'supabase-anon-key', value: supabaseAnonKey }
  { name: 'redis-password', value: redisPassword }
]
var commonSecretEnv = [
  { name: 'SUPABASE_SERVICE_ROLE_KEY', secretRef: 'supabase-service-role-key' }
  { name: 'SUPABASE_ANON_KEY', secretRef: 'supabase-anon-key' }
  { name: 'REDIS_PASSWORD', secretRef: 'redis-password' }
]
var commonEnv = [
  { name: 'SUPABASE_URL', value: supabaseUrl }
  { name: 'REDIS_HOST', value: redisAppName }
  { name: 'REDIS_PORT', value: '6379' }
  { name: 'HEALTH_PORT', value: '3100' }
  { name: 'NODE_ENV', value: 'production' }
]

// The 12 internal worker services. `dir` matches the apps/<dir> folder and the
// ghcr image name (velluma-<dir>:<tag>). Extras layer on top of the common set.
var services = [
  { dir: 'identity-service',            extraSecrets: [], extraSecretEnv: [], extraEnv: [] }
  { dir: 'crm-service',                 extraSecrets: [], extraSecretEnv: [], extraEnv: [] }
  { dir: 'project-service',             extraSecrets: [], extraSecretEnv: [], extraEnv: [] }
  { dir: 'document-service',            extraSecrets: [], extraSecretEnv: [], extraEnv: [] }
  { dir: 'automation-service',          extraSecrets: [], extraSecretEnv: [], extraEnv: [] }
  { dir: 'budget-tracking-service',     extraSecrets: [], extraSecretEnv: [], extraEnv: [] }
  { dir: 'expense-bookkeeping-service', extraSecrets: [], extraSecretEnv: [], extraEnv: [] }
  { dir: 'time-tracking-service',       extraSecrets: [], extraSecretEnv: [], extraEnv: [] }
  { dir: 'resource-service',            extraSecrets: [], extraSecretEnv: [], extraEnv: [] }
  {
    dir: 'contract-service'
    extraSecrets: [ { name: 'google-ai-api-key', value: googleAiApiKey } ]
    extraSecretEnv: [ { name: 'GOOGLE_GENERATIVE_AI_API_KEY', secretRef: 'google-ai-api-key' } ]
    extraEnv: []
  }
  {
    dir: 'invoice-payment-service'
    extraSecrets: [
      { name: 'stripe-secret-key', value: stripeSecretKey }
      { name: 'stripe-webhook-secret', value: stripeWebhookSecret }
    ]
    extraSecretEnv: [
      { name: 'STRIPE_SECRET_KEY', secretRef: 'stripe-secret-key' }
      { name: 'STRIPE_WEBHOOK_SECRET', secretRef: 'stripe-webhook-secret' }
    ]
    extraEnv: []
  }
  {
    dir: 'notification-service'
    extraSecrets: [
      { name: 'resend-api-key', value: resendApiKey }
      { name: 'twilio-auth-token', value: twilioAuthToken }
      { name: 'vapid-private-key', value: vapidPrivateKey }
    ]
    extraSecretEnv: [
      { name: 'RESEND_API_KEY', secretRef: 'resend-api-key' }
      { name: 'TWILIO_AUTH_TOKEN', secretRef: 'twilio-auth-token' }
      { name: 'VAPID_PRIVATE_KEY', secretRef: 'vapid-private-key' }
    ]
    extraEnv: [
      { name: 'EMAIL_FROM', value: emailFrom }
      { name: 'TWILIO_ACCOUNT_SID', value: twilioAccountSid }
      { name: 'TWILIO_FROM_NUMBER', value: twilioFromNumber }
      { name: 'VAPID_PUBLIC_KEY', value: vapidPublicKey }
      { name: 'VAPID_SUBJECT', value: vapidSubject }
    ]
  }
]

// ---------------------------------------------------------------------------
// Log Analytics — required by the Container Apps environment. Daily cap keeps
// ingestion inside the 5 GB/month free band.
// ---------------------------------------------------------------------------
resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'velluma-logs'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
    workspaceCapping: { dailyQuotaGb: 1 }
  }
}

// ---------------------------------------------------------------------------
// Container Apps environment
// ---------------------------------------------------------------------------
resource env 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: environmentName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Self-hosted Redis broker (internal TCP, min-1). Ephemeral by design — it is
// a transient RPC bus, not a datastore.
// ---------------------------------------------------------------------------
module redis 'modules/containerApp.bicep' = {
  name: 'app-redis'
  params: {
    name: redisAppName
    location: location
    environmentId: env.id
    image: 'redis:7-alpine'
    ingressEnabled: true
    ingressExternal: false
    targetPort: 6379
    ingressTransport: 'tcp'
    command: [ 'sh', '-c' ]
    args: [ 'redis-server --requirepass "$REDIS_PASSWORD" --maxmemory 128mb --maxmemory-policy allkeys-lru' ]
    secrets: [ { name: 'redis-password', value: redisPassword } ]
    secretEnvVars: [ { name: 'REDIS_PASSWORD', secretRef: 'redis-password' } ]
  }
}

// ---------------------------------------------------------------------------
// 12 internal worker services (no ingress; outbound Redis only)
// ---------------------------------------------------------------------------
module workers 'modules/containerApp.bicep' = [for svc in services: {
  name: 'app-${svc.dir}'
  params: {
    // ACA app names must be <= 32 chars; the image name keeps the full dir.
    name: take('velluma-${svc.dir}', 32)
    location: location
    environmentId: env.id
    image: '${imageRepo}/velluma-${svc.dir}:${imageTag}'
    ingressEnabled: false
    healthPort: 3100
    registries: registries
    secrets: concat(commonSecrets, svc.extraSecrets, registrySecrets)
    secretEnvVars: concat(commonSecretEnv, svc.extraSecretEnv)
    envVars: concat(commonEnv, svc.extraEnv)
  }
  dependsOn: [ redis ]
}]

// ---------------------------------------------------------------------------
// API gateway — the only public-facing service
// ---------------------------------------------------------------------------
module gateway 'modules/containerApp.bicep' = {
  name: 'app-api-gateway'
  params: {
    name: 'velluma-api-gateway'
    location: location
    environmentId: env.id
    image: '${imageRepo}/velluma-api-gateway:${imageTag}'
    ingressEnabled: true
    ingressExternal: true
    targetPort: 3001
    ingressTransport: 'auto'
    healthPort: 3001
    registries: registries
    secrets: concat(commonSecrets, registrySecrets)
    secretEnvVars: commonSecretEnv
    envVars: [
      { name: 'SUPABASE_URL', value: supabaseUrl }
      { name: 'REDIS_HOST', value: redisAppName }
      { name: 'REDIS_PORT', value: '6379' }
      { name: 'NODE_ENV', value: 'production' }
      { name: 'PORT', value: '3001' }
      { name: 'ALLOWED_ORIGINS', value: allowedOrigins }
      { name: 'VAPID_PUBLIC_KEY', value: vapidPublicKey }
    ]
  }
  dependsOn: [ redis ]
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------
@description('Public HTTPS URL of the API gateway. Point the frontend NEXT_PUBLIC_API_URL here.')
output gatewayUrl string = 'https://${gateway.outputs.fqdn}'
