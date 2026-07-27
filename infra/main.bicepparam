// =============================================================================
// Parameter file for infra/main.bicep
//
// Fill in real values, or (recommended) source secrets from the environment so
// they never land in git:
//   export SUPABASE_SERVICE_ROLE_KEY=... REDIS_PASSWORD=... etc.
// getSecret()/readEnvironmentVariable() below read those at deploy time.
//
// Deploy:
//   az deployment group create -g rg-velluma -f infra/main.bicep -p infra/main.bicepparam
// =============================================================================

using './main.bicep'

// --- General -----------------------------------------------------------------
param location = 'eastus'
param environmentName = 'velluma-env'
param ghcrOwner = readEnvironmentVariable('GHCR_OWNER', 'your-github-username')
param ghcrUsername = readEnvironmentVariable('GHCR_USERNAME', 'your-github-username')
param ghcrToken = readEnvironmentVariable('GHCR_TOKEN', '')
param imageTag = readEnvironmentVariable('IMAGE_TAG', 'latest')

// --- Supabase ----------------------------------------------------------------
param supabaseUrl = readEnvironmentVariable('SUPABASE_URL', 'https://your-project.supabase.co')
param supabaseServiceRoleKey = readEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY', '')
param supabaseAnonKey = readEnvironmentVariable('SUPABASE_ANON_KEY', '')

// --- Redis (self-hosted) -----------------------------------------------------
param redisPassword = readEnvironmentVariable('REDIS_PASSWORD', '')

// --- Gateway -----------------------------------------------------------------
param allowedOrigins = readEnvironmentVariable('ALLOWED_ORIGINS', 'https://your-frontend.vercel.app')
param vapidPublicKey = readEnvironmentVariable('VAPID_PUBLIC_KEY', '')

// --- Integrations ------------------------------------------------------------
param stripeSecretKey = readEnvironmentVariable('STRIPE_SECRET_KEY', '')
param stripeWebhookSecret = readEnvironmentVariable('STRIPE_WEBHOOK_SECRET', '')
param googleAiApiKey = readEnvironmentVariable('GOOGLE_GENERATIVE_AI_API_KEY', '')
param resendApiKey = readEnvironmentVariable('RESEND_API_KEY', '')
param twilioAuthToken = readEnvironmentVariable('TWILIO_AUTH_TOKEN', '')
param vapidPrivateKey = readEnvironmentVariable('VAPID_PRIVATE_KEY', '')
param emailFrom = readEnvironmentVariable('EMAIL_FROM', 'noreply@velluma.com')
param twilioAccountSid = readEnvironmentVariable('TWILIO_ACCOUNT_SID', '')
param twilioFromNumber = readEnvironmentVariable('TWILIO_FROM_NUMBER', '')
param vapidSubject = readEnvironmentVariable('VAPID_SUBJECT', 'mailto:noreply@velluma.com')
