import Cookies from "js-cookie";

/** Same cookie names as Shopenup storefront for compatibility with the backend. */
const JWT_COOKIE = "_shopenup_jwt";
const CART_COOKIE = "_shopenup_cart_id";

export const getAuthHeaders = async (): Promise<
  { authorization: string } | Record<string, never>
> => {
  const token = Cookies.get(JWT_COOKIE);
  if (token) {
    return { authorization: `Bearer ${token}` };
  }
  return {};
};

export const getCompleteHeaders = async (): Promise<Record<string, string>> => {
  const authHeaders = await getAuthHeaders();
  const publishableKey =
    process.env.NEXT_PUBLIC_SHOPENUP_PUBLISHABLE_KEY ||
    "pk_03d087dc82a71a3723b4ebfc54024a1b7ad03ab5c58b15d27129f8c482bfac5f";

  return {
    ...authHeaders,
    "x-publishable-api-key": publishableKey,
    "Content-Type": "application/json",
  };
};

export const setAuthToken = async (token: string) => {
  Cookies.set(JWT_COOKIE, token, {
    expires: 7,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
};

export const removeAuthToken = async () => {
  Cookies.remove(JWT_COOKIE, { path: "/" });
};

export const getCartId = (): string | undefined => {
  let cartId = Cookies.get(CART_COOKIE);
  if (!cartId && typeof window !== "undefined") {
    const legacy = window.localStorage.getItem("sofa_new_cart_id");
    if (legacy) {
      setCartId(legacy);
      window.localStorage.removeItem("sofa_new_cart_id");
      cartId = legacy;
    }
  }
  return cartId;
};

export const setCartId = (cartId: string) => {
  const opts = {
    expires: 7,
    sameSite: (process.env.NODE_ENV === "production" ? "strict" : "lax") as "strict" | "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
  Cookies.set(CART_COOKIE, cartId, opts);
  if (typeof window !== "undefined") {
    window.localStorage.setItem("sofa_new_cart_id", cartId);
  }
};

export const removeCartId = () => {
  Cookies.remove(CART_COOKIE, { path: "/" });
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("sofa_new_cart_id");
  }
};

export const clearAllCartData = async () => {
  removeCartId();
  await removeAuthToken();
};
