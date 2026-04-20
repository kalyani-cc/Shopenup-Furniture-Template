import { backendUrl } from "./client"

/**
 * Admin fetch utility for custom API endpoints
 */
export async function adminFetch<T = any>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${backendUrl}${path.startsWith("/") ? path : `/${path}`}`
  
  const response = await fetch(url, {
    ...options,
    credentials: "include", // Include cookies for session auth
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }

  return response.json()
}

