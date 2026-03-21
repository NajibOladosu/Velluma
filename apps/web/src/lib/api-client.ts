import { createClient } from "@/utils/supabase/client"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

// ---------------------------------------------------------------------------
// Typed API error — carry back the HTTP status alongside the message
// ---------------------------------------------------------------------------
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }
}

interface ApiClientOptions extends Omit<RequestInit, "body"> {
  /** JSON-serialisable request body. Sets method to POST if not overridden. */
  body?: unknown
  /** Override the HTTP method explicitly. */
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
}

// ---------------------------------------------------------------------------
// Core client — injects Supabase Bearer token on every request
// ---------------------------------------------------------------------------
export async function apiClient<T>(
  endpoint: string,
  { body, method, ...customConfig }: ApiClientOptions = {}
): Promise<T> {
  // Retrieve the current Supabase session from the browser cookie store
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`
  }

  const config: RequestInit = {
    method: method ?? (body ? "POST" : "GET"),
    ...customConfig,
    headers: {
      ...headers,
      // Allow callers to override specific headers (e.g. omit Content-Type for FormData)
      ...(customConfig.headers as Record<string, string> | undefined),
    },
  }

  if (body !== undefined) {
    config.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_URL}${endpoint}`, config)

  // Token expired or revoked — sign out and redirect to login
  if (response.status === 401) {
    await supabase.auth.signOut()
    window.location.href = "/login"
    throw new ApiError("Session expired. Please sign in again.", 401)
  }

  if (response.ok) {
    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as unknown as T
    }
    return (await response.json()) as T
  }

  // Parse error body for structured API error messages
  let errorBody: unknown
  let errorMessage = `HTTP ${response.status}`
  try {
    errorBody = await response.json()
    if (
      typeof errorBody === "object" &&
      errorBody !== null &&
      "message" in errorBody
    ) {
      errorMessage = String((errorBody as { message: unknown }).message)
    }
  } catch {
    errorMessage = await response.text().catch(() => `HTTP ${response.status}`)
  }

  throw new ApiError(errorMessage, response.status, errorBody)
}

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------
export const api = {
  get: <T>(endpoint: string, config?: Omit<ApiClientOptions, "body" | "method">) =>
    apiClient<T>(endpoint, { ...config, method: "GET" }),

  post: <T>(endpoint: string, body: unknown, config?: Omit<ApiClientOptions, "body" | "method">) =>
    apiClient<T>(endpoint, { ...config, method: "POST", body }),

  put: <T>(endpoint: string, body: unknown, config?: Omit<ApiClientOptions, "body" | "method">) =>
    apiClient<T>(endpoint, { ...config, method: "PUT", body }),

  patch: <T>(endpoint: string, body: unknown, config?: Omit<ApiClientOptions, "body" | "method">) =>
    apiClient<T>(endpoint, { ...config, method: "PATCH", body }),

  delete: <T>(endpoint: string, config?: Omit<ApiClientOptions, "body" | "method">) =>
    apiClient<T>(endpoint, { ...config, method: "DELETE" }),
}

