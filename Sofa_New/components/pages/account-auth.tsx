"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { loginCustomer, signupCustomer, updateCustomerProfile } from "@/lib/shopenup/customer";
import { sdk } from "@/lib/config";
import { getCompleteHeaders } from "@/lib/shopenup/cookies";
import { formatCurrency, formatOrderDisplayStatus } from "@/lib/utils";

type Mode = "login" | "signup";
function safeInternalPath(next: string | null): string | null {
  if (!next) {
    return null;
  }
  if (!next.startsWith("/") || next.startsWith("//")) {
    return null;
  }
  return next;
}

type StoreOrder = {
  id: string;
  display_id?: number;
  status?: string;
  fulfillment_status?: string | null;
  payment_status?: string | null;
  created_at?: string;
  total?: number;
  items?: Array<{
    id: string;
    title?: string;
    quantity?: number;
  }>;
};

function AccountAuthInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { customer, isLoading, refresh, logout } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const loadOrders = async () => {
    setOrdersLoading(true);
    setOrdersError("");
    try {
      // Omit narrow `fields` so the API returns fulfillment_status / payment_status (admin updates these).
      const res = await sdk.client.fetch<{ orders?: StoreOrder[] }>("/store/orders", {
        method: "GET",
        headers: await getCompleteHeaders(),
        query: {
          limit: 10,
          order: "-created_at",
        },
        cache: "no-store",
      });

      setOrders(res?.orders || []);
    } catch (e) {
      setOrders([]);
      setOrdersError(e instanceof Error ? e.message : "Failed to load orders.");
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (customer) {
      void loadOrders();
    } else {
      setOrders([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id]);

  useEffect(() => {
    if (!customer) {
      setIsEditingProfile(false);
      setProfileMessage("");
    }
  }, [customer]);

  const onLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);

    try {
      const email = String(form.get("email") || "");
      const password = String(form.get("password") || "");
      const result = await loginCustomer({ email, password });
      if (!result.ok) {
        if (result.oauthLocation) {
          window.location.href = result.oauthLocation;
          return;
        }
        setError(result.error);
        return;
      }
      await refresh();
      await loadOrders();
      event.currentTarget.reset();
      const next = safeInternalPath(searchParams.get("next"));
      if (next) {
        router.replace(next);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const onSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);

    const first_name = String(form.get("first_name") || "");
    const last_name = String(form.get("last_name") || "");
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    const phone = String(form.get("phone") || "").trim();

    if (!first_name || !last_name) {
      setError("Please enter first name and last name.");
      setLoading(false);
      return;
    }

    try {
      const result = await signupCustomer({ first_name, last_name, email, password, phone });
      if (!result.ok) {
        if (result.oauthLocation) {
          window.location.href = result.oauthLocation;
          return;
        }
        setError(result.error);
        return;
      }
      await refresh();
      await loadOrders();
      setMode("login");
      event.currentTarget.reset();
      const next = safeInternalPath(searchParams.get("next"));
      if (next) {
        router.replace(next);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  const onUpdateProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileMessage("");
    setProfileLoading(true);
    const form = new FormData(event.currentTarget);
    const first_name = String(form.get("first_name") || "").trim();
    const last_name = String(form.get("last_name") || "").trim();
    const phone = String(form.get("phone") || "").trim();

    try {
      const result = await updateCustomerProfile({ first_name, last_name, phone });
      if (!result.ok) {
        setProfileMessage(result.error);
        return;
      }
      await refresh();
      setProfileMessage("Profile updated successfully.");
      setIsEditingProfile(false);
    } catch (e) {
      setProfileMessage(e instanceof Error ? e.message : "Failed to update profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  if (isLoading) {
    return (
      <section className="mx-auto max-w-2xl px-6 py-14">
        <p className="text-center text-stone-600">Checking your session…</p>
      </section>
    );
  }

  if (customer) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1.8fr]">
          <div className="space-y-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-card sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold text-stone-900">Profile Info</h2>
              {!isEditingProfile ? (
                <button
                  type="button"
                  onClick={() => {
                    setProfileMessage("");
                    setIsEditingProfile(true);
                  }}
                  className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
                >
                  Edit Profile
                </button>
              ) : null}
            </div>

            {isEditingProfile ? (
              <form onSubmit={onUpdateProfile} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">First Name</label>
                    <input
                      name="first_name"
                      defaultValue={customer.first_name || ""}
                      placeholder="First name"
                      required
                      className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-brand"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">Last Name</label>
                    <input
                      name="last_name"
                      defaultValue={customer.last_name || ""}
                      placeholder="Last name"
                      required
                      className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-brand"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">Email</label>
                    <input
                      name="email"
                      value={customer.email}
                      disabled
                      className="w-full rounded-xl border border-stone-200 bg-stone-100 px-4 py-3 text-sm text-stone-600"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">Phone</label>
                    <input
                      name="phone"
                      defaultValue={customer.phone || ""}
                      placeholder="Phone number"
                      className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-brand"
                    />
                  </div>
                </div>
                {profileMessage ? <p className="text-sm text-stone-600">{profileMessage}</p> : null}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
                  >
                    {profileLoading ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingProfile(false);
                      setProfileMessage("");
                    }}
                    className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:border-brand hover:text-brand"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-sm font-medium text-stone-700">First Name</p>
                  <p className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                    {customer.first_name || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="mb-1.5 text-sm font-medium text-stone-700">Last Name</p>
                  <p className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                    {customer.last_name || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="mb-1.5 text-sm font-medium text-stone-700">Email</p>
                  <p className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                    {customer.email}
                  </p>
                </div>
                <div>
                  <p className="mb-1.5 text-sm font-medium text-stone-700">Phone</p>
                  <p className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                    {customer.phone || "Not provided"}
                  </p>
                </div>
              </div>
            )}

            {!isEditingProfile && profileMessage ? <p className="text-sm text-stone-600">{profileMessage}</p> : null}
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:border-brand hover:text-brand"
            >
              Logout
            </button>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-stone-900">My Orders</h3>
              <button
                type="button"
                onClick={() => void loadOrders()}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700"
              >
                Refresh
              </button>
            </div>

            {ordersLoading ? (
              <p className="text-sm text-stone-500">Loading orders...</p>
            ) : orders.length ? (
              <div className="space-y-3">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/order-details/${order.id}`}
                    className="block rounded-xl border border-stone-200 p-4 transition hover:border-brand hover:shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-stone-900">
                        Order #{order.display_id || order.id}
                      </p>
                      <p className="text-xs uppercase tracking-wide text-stone-500">
                        {formatOrderDisplayStatus(order)}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      {order.created_at ? new Date(order.created_at).toLocaleString() : ""}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-stone-900">
                      {formatCurrency(order.total || 0)}
                    </p>
                    {order.items?.length ? (
                      <p className="mt-1 text-sm text-stone-600">
                        {order.items[0]?.title || "Item"}
                        {order.items.length > 1 ? ` +${order.items.length - 1} more` : ""}
                      </p>
                    ) : null}
                    <p className="mt-3 text-xs font-semibold text-brand-dark">View details →</p>
                  </Link>
                ))}
              </div>
            ) : ordersError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">{ordersError}</p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-stone-300 p-4">
                <p className="text-sm text-stone-600">No orders yet. Start shopping to place your first order.</p>
                <Link href="/shop" className="mt-2 inline-block text-sm font-semibold text-brand-dark">
                  Go to Shop
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-6 py-14">
      <div className="mb-6 flex gap-3">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            mode === "login" ? "bg-brand text-white" : "border border-stone-300 text-stone-700"
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            mode === "signup" ? "bg-brand text-white" : "border border-stone-300 text-stone-700"
          }`}
        >
          Sign Up
        </button>
      </div>

      <form
        onSubmit={mode === "login" ? onLogin : onSignup}
        className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-card sm:p-8"
      >
        {mode === "signup" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <input
              name="first_name"
              placeholder="First name"
              required
              className="w-full rounded-lg border border-stone-300 px-4 py-3 outline-none focus:border-brand"
            />
            <input
              name="last_name"
              placeholder="Last name"
              required
              className="w-full rounded-lg border border-stone-300 px-4 py-3 outline-none focus:border-brand"
            />
          </div>
        ) : null}
        {mode === "signup" ? (
          <input
            name="phone"
            type="tel"
            placeholder="Phone number"
            required
            className="w-full rounded-lg border border-stone-300 px-4 py-3 outline-none focus:border-brand"
          />
        ) : null}

        <input
          name="email"
          type="email"
          placeholder="Email address"
          required
          className="w-full rounded-lg border border-stone-300 px-4 py-3 outline-none focus:border-brand"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          minLength={6}
          required
          className="w-full rounded-lg border border-stone-300 px-4 py-3 outline-none focus:border-brand"
        />

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
        </button>
      </form>
    </section>
  );
}

export function AccountAuth() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-5xl px-6 py-14">
          <p className="text-center text-stone-600">Loading…</p>
        </section>
      }
    >
      <AccountAuthInner />
    </Suspense>
  );
}
