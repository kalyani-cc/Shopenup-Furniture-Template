import { sdk } from "@/lib/config";
import type { StoreCustomer } from "@/lib/types/store-customer";
import {
  getCompleteHeaders,
  setAuthToken,
  removeAuthToken,
  getCartId,
} from "@/lib/shopenup/cookies";

export type LoginInput = { email: string; password: string };

export type SignupInput = LoginInput & {
  first_name: string;
  last_name: string;
  phone?: string;
};

export async function getCustomer(): Promise<StoreCustomer | null> {
  return sdk.client
    .fetch<{ customer: StoreCustomer }>(`/store/customers/me`, {
      headers: await getCompleteHeaders(),
      cache: "no-store",
    })
    .then((r) => r.customer)
    .catch(() => null);
}

export async function loginCustomer(
  input: LoginInput
): Promise<
  | { ok: true; customer: StoreCustomer | null }
  | { ok: false; error: string; oauthLocation?: string }
> {
  try {
    const token = await sdk.auth.login("customer", "emailpass", {
      email: input.email,
      password: input.password,
    });

    if (typeof token === "object" && token !== null && "location" in token) {
      return {
        ok: false,
        error: "Additional sign-in step required.",
        oauthLocation: (token as { location: string }).location,
      };
    }

    await setAuthToken(token as string);

    const cartId = getCartId();
    if (cartId) {
      try {
        await sdk.store.cart.transferCart(cartId, {}, await getCompleteHeaders());
      } catch {
        /* guest cart transfer is best-effort */
      }
    }

    const customer = await getCustomer();
    return { ok: true, customer };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Sign in failed.",
    };
  }
}

export async function signupCustomer(
  input: SignupInput
): Promise<
  | { ok: true; customer: StoreCustomer | null }
  | { ok: false; error: string; oauthLocation?: string }
> {
  try {
    const registrationToken = await sdk.auth.register("customer", "emailpass", {
      email: input.email,
      password: input.password,
    });

    await sdk.store.customer.create(
      {
        email: input.email,
        first_name: input.first_name,
        last_name: input.last_name,
        phone: input.phone,
      },
      {},
      { authorization: `Bearer ${registrationToken}` }
    );

    const loginToken = await sdk.auth.login("customer", "emailpass", {
      email: input.email,
      password: input.password,
    });

    if (typeof loginToken === "object" && loginToken !== null && "location" in loginToken) {
      return {
        ok: false,
        error: "Additional sign-in step required.",
        oauthLocation: (loginToken as { location: string }).location,
      };
    }

    await setAuthToken(loginToken as string);

    const cartId = getCartId();
    if (cartId) {
      try {
        await sdk.store.cart.transferCart(cartId, {}, await getCompleteHeaders());
      } catch {
        /* best-effort */
      }
    }

    const customer = await getCustomer();
    return { ok: true, customer };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not create account.",
    };
  }
}

export type UpdateCustomerInput = {
  first_name?: string;
  last_name?: string;
  phone?: string;
};

export async function updateCustomerProfile(
  input: UpdateCustomerInput
): Promise<{ ok: true; customer: StoreCustomer } | { ok: false; error: string }> {
  try {
    const response = await sdk.client.fetch<{ customer: StoreCustomer }>("/store/customers/me", {
      method: "POST",
      headers: await getCompleteHeaders(),
      body: {
        first_name: input.first_name,
        last_name: input.last_name,
        phone: input.phone,
      },
      cache: "no-store",
    });

    return { ok: true, customer: response.customer };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to update profile.",
    };
  }
}

export async function logoutCustomer(): Promise<void> {
  try {
    await sdk.auth.logout();
  } catch {
    /* ignore */
  }
  await removeAuthToken();
}
