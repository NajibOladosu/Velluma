const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

export async function apiClient<T>(
    endpoint: string,
    { body, ...customConfig }: RequestInit = {}
): Promise<T> {
    const headers = { "Content-Type": "application/json" }
    const config: RequestInit = {
        method: body ? "POST" : "GET",
        ...customConfig,
        headers: {
            ...headers,
            ...customConfig.headers,
        },
    }

    if (body) {
        config.body = JSON.stringify(body)
    }

    const response = await fetch(`${API_URL}${endpoint}`, config)

    if (response.ok) {
        return await response.json()
    } else {
        const errorMessage = await response.text()
        return Promise.reject(new Error(errorMessage))
    }
}
