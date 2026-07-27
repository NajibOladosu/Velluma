// =============================================================================
// Reusable Azure Container App module
// Deploys a single container app into a shared Container Apps Environment.
// Used for the API gateway, the 12 NestJS worker services, and self-hosted Redis.
// =============================================================================

@description('Container app name (must be unique within the environment).')
param name string

@description('Azure region.')
param location string = resourceGroup().location

@description('Resource ID of the Container Apps managed environment.')
param environmentId string

@description('Fully-qualified container image, e.g. ghcr.io/owner/velluma-crm-service:sha.')
param image string

@description('vCPU allocation (string so it can be json()-parsed, e.g. "0.25").')
param cpu string = '0.25'

@description('Memory allocation, e.g. "0.5Gi".')
param memory string = '0.5Gi'

@description('Minimum replicas. Kept at 1 for Redis-subscriber services so they never scale to zero.')
param minReplicas int = 1

@description('Maximum replicas.')
param maxReplicas int = 1

@description('Enable ingress. Workers that only make outbound Redis calls leave this false.')
param ingressEnabled bool = false

@description('Expose ingress to the public internet (true) or keep it internal to the environment (false).')
param ingressExternal bool = false

@description('Container/ingress target port.')
param targetPort int = 0

@description('Ingress transport: "auto" (HTTP), "http", "http2", or "tcp".')
param ingressTransport string = 'auto'

@description('Plain environment variables: [{ name, value }].')
param envVars array = []

@description('Secret-backed environment variables: [{ name, secretRef }].')
param secretEnvVars array = []

@description('Secrets stored on the app: [{ name, value }]. Individual values originate from @secure() params in the parent template.')
param secrets array = []

@description('Private registry configs: [{ server, username, passwordSecretRef }].')
param registries array = []

@description('Container entrypoint override.')
param command array = []

@description('Container args override.')
param args array = []

@description('HTTP health probe port (the service /health endpoint). 0 disables probes.')
param healthPort int = 0

@description('User-assigned managed identity resource IDs to attach (optional).')
param userAssignedIdentities array = []

var hasIngress = ingressEnabled && targetPort > 0
var isTcp = ingressTransport == 'tcp'

// For-expressions can't be nested directly inside a function call (concat),
// so build the plain and secret env arrays as variables first.
var plainEnvVars = [for e in envVars: { name: e.name, value: e.value }]
var secretRefEnvVars = [for e in secretEnvVars: { name: e.name, secretRef: e.secretRef }]

var probes = healthPort > 0
  ? [
      {
        type: 'Liveness'
        httpGet: {
          path: '/health'
          port: healthPort
        }
        initialDelaySeconds: 20
        periodSeconds: 30
        failureThreshold: 3
      }
      {
        type: 'Readiness'
        httpGet: {
          path: '/health'
          port: healthPort
        }
        initialDelaySeconds: 10
        periodSeconds: 15
        failureThreshold: 3
      }
    ]
  : []

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: name
  location: location
  identity: empty(userAssignedIdentities)
    ? { type: 'None' }
    : {
        type: 'UserAssigned'
        userAssignedIdentities: toObject(userAssignedIdentities, id => id, id => {})
      }
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      activeRevisionsMode: 'Single'
      secrets: [for s in secrets: { name: s.name, value: s.value }]
      registries: registries
      ingress: hasIngress
        ? union(
            {
              external: ingressExternal
              targetPort: targetPort
              transport: ingressTransport
            },
            isTcp ? { exposedPort: targetPort } : { allowInsecure: false }
          )
        : null
    }
    template: {
      containers: [
        {
          name: name
          image: image
          command: empty(command) ? null : command
          args: empty(args) ? null : args
          resources: {
            cpu: json(cpu)
            memory: memory
          }
          env: concat(plainEnvVars, secretRefEnvVars)
          probes: probes
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
      }
    }
  }
}

output fqdn string = hasIngress ? app.properties.configuration.ingress.fqdn : ''
output name string = app.name
