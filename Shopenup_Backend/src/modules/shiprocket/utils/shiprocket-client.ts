/**
 * Shared Shiprocket Client Utility
 * 
 * This utility provides a single Shiprocket instance to avoid multiple
 * authentication calls and duplicate API requests.
 */

import { Shiprocket } from "@shopenup/logistic";

let sharedClient: Shiprocket | null = null;
let authPromise: Promise<void> | null = null;

interface ShiprocketConfig {
  email: string;
  password: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Get or create a shared Shiprocket client instance
 */
export function getShiprocketClient(config: ShiprocketConfig): Shiprocket {
  // If client exists and credentials match, reuse it
  if (sharedClient) {
    return sharedClient;
  }

  // Create new client
  sharedClient = new Shiprocket({
    email: config.email,
    password: config.password,
    baseUrl: config.baseUrl,
    timeout: config.timeout,
    retryAttempts: config.retryAttempts,
    retryDelay: config.retryDelay,
  });

  return sharedClient;
}

/**
 * Ensure Shiprocket client is authenticated
 * Uses a promise to prevent multiple simultaneous authentication calls
 */
export async function ensureAuthenticated(client: Shiprocket): Promise<void> {
  // If already authenticated, return immediately
  if (client.isAuthenticated()) {
    return;
  }

  // If authentication is in progress, wait for it
  if (authPromise) {
    await authPromise;
    return;
  }

  // Start authentication
  authPromise = client.authenticate().catch((error) => {
    // Reset promise on error so we can retry
    authPromise = null;
    throw error;
  });

  try {
    await authPromise;
  } finally {
    // Clear promise after authentication completes (success or failure)
    // Only clear if this was the current auth attempt
    if (authPromise) {
      authPromise = null;
    }
  }
}

/**
 * Get authenticated Shiprocket client
 * This is the main function to use - it gets client and ensures it's authenticated
 */
export async function getAuthenticatedClient(config: ShiprocketConfig): Promise<Shiprocket> {
  const client = getShiprocketClient(config);
  await ensureAuthenticated(client);
  return client;
}

/**
 * Reset the shared client (useful for testing or when credentials change)
 */
export function resetClient(): void {
  sharedClient = null;
  authPromise = null;
}

