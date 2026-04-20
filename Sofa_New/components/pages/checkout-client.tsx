"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  addShippingMethod,
  completeCart,
  listPaymentProviders,
  listShippingOptions,
  retrieveCart,
  setPaymentSession,
  updateCart,
  type StoreCart,
} from "@/lib/shopenup/cart";
import { formatCurrency } from "@/lib/utils";

type CheckoutStep = "contact" | "delivery" | "shipping" | "payment" | "review";

export function CheckoutClient() {
  const router = useRouter();
  const [step, setStep] = useState<CheckoutStep>("contact");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cart, setCart] = useState<StoreCart | null>(null);
  const [shippingOptions, setShippingOptions] = useState<
    Array<{ id: string; name?: string; price_type?: string; provider_id?: string }>
  >([]);
  const [selectedShipping, setSelectedShipping] = useState("");
  const [appliedShipping, setAppliedShipping] = useState("");
  const [paymentProviders, setPaymentProviders] = useState<Array<{ id: string }>>([]);
  const [selectedPayment, setSelectedPayment] = useState("");
  const [appliedPayment, setAppliedPayment] = useState("");

  const getLineTotal = (item: NonNullable<StoreCart["items"]>[number]) =>
    item.total ?? item.subtotal ?? (item.unit_price || 0) * (item.quantity || 1);

  const loadCart = async () => {
    try {
      const data = await retrieveCart();
      setCart(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load cart. Please retry.");
      setCart(null);
    }
  };

  useEffect(() => {
    loadCart().catch(() => null);
  }, []);

  const subtotal = useMemo(() => {
    if (cart?.subtotal != null) {
      return cart.subtotal;
    }
    if (!cart?.items?.length) {
      return 0;
    }
    return cart.items.reduce((sum, item) => sum + getLineTotal(item), 0);
  }, [cart]);

  const hasItems = Boolean(cart?.items?.length);
  const isShippingApplied = Boolean(selectedShipping && appliedShipping === selectedShipping);
  const isPaymentApplied = Boolean(selectedPayment && appliedPayment === selectedPayment);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!hasItems) {
      setError("Your cart is empty. Add products before checking out.");
      return;
    }
    setLoading(true);

    const form = new FormData(event.currentTarget);

    try {
      const email = String(form.get("email") || "");
      const first_name = String(form.get("first_name") || "");
      const last_name = String(form.get("last_name") || "");
      const address_1 = String(form.get("address_1") || "");
      const city = String(form.get("city") || "");
      const postal_code = String(form.get("postal_code") || "");
      const phone = String(form.get("phone") || "");

      const updated = await updateCart({
        email,
        shipping_address: {
          first_name,
          last_name,
          address_1,
          city,
          postal_code,
          phone,
          country_code: "in",
          province: "GJ",
        },
        billing_address: {
          first_name,
          last_name,
          address_1,
          city,
          postal_code,
          phone,
          country_code: "in",
          province: "GJ",
        },
      });
      setCart(updated);
      setStep("shipping");

      const shippingOptions = await listShippingOptions();
      setShippingOptions(shippingOptions);
      const preferredOption =
        shippingOptions.find((option) => option.price_type !== "calculated") || shippingOptions[0];
      if (preferredOption?.id) {
        setSelectedShipping(preferredOption.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed. Please verify shipping/payment setup.");
    } finally {
      setLoading(false);
    }
  };

  const onApplyShipping = async () => {
    if (!hasItems) {
      setError("Your cart is empty. Add products before selecting shipping.");
      return;
    }
    if (!selectedShipping) {
      setError("Please select a shipping option.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const selectedOption = shippingOptions.find((option) => option.id === selectedShipping);
      const shippingData =
        selectedOption?.price_type === "calculated" ? { shipping_option_id: selectedShipping } : undefined;

      const updated = await addShippingMethod(selectedShipping, shippingData);
      setCart(updated);
      setAppliedShipping(selectedShipping);
      const providers = await listPaymentProviders(updated.region_id);
      setPaymentProviders(providers);
      if (providers[0]?.id) {
        setSelectedPayment(providers[0].id);
      }
      setStep("payment");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply shipping.");
    } finally {
      setLoading(false);
    }
  };

  const onApplyPayment = async () => {
    if (!hasItems) {
      setError("Your cart is empty. Add products before selecting payment.");
      return;
    }
    if (!selectedPayment) {
      setError("Please select a payment method.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const updated = await setPaymentSession(selectedPayment);
      setCart(updated);
      setAppliedPayment(selectedPayment);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set payment method.");
    } finally {
      setLoading(false);
    }
  };

  const onPlaceOrder = async () => {
    if (!hasItems) {
      setError("Your cart is empty. Add products before placing an order.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const result = await completeCart();
      if (result?.order?.id) {
        router.push(`/order-confirmation/${result.order.id}`);
        return;
      } else {
        router.push("/order-error?reason=missing-order-id");
        return;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Order placement failed.";
      const search = new URLSearchParams({ reason: message });
      router.push(`/order-error?${search.toString()}`);
      return;
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-card sm:p-8">
        {!cart?.items?.length ? (
          <p className="text-sm text-stone-600">
            No active cart found. Add products first, then return to checkout.
          </p>
        ) : null}
        <div className="border-b border-stone-200 pb-4">
          <p className="text-sm font-semibold text-stone-500">1. Contact</p>
          <p className="text-sm text-stone-600">Continue with your contact and delivery details</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <input name="first_name" required placeholder="First name" className="rounded-lg border border-stone-300 px-4 py-3" />
            <input name="last_name" required placeholder="Last name" className="rounded-lg border border-stone-300 px-4 py-3" />
          </div>
          <input name="email" type="email" required placeholder="Email" className="w-full rounded-lg border border-stone-300 px-4 py-3" />
          <input name="phone" required placeholder="Phone" className="w-full rounded-lg border border-stone-300 px-4 py-3" />
          <input name="address_1" required placeholder="Address" className="w-full rounded-lg border border-stone-300 px-4 py-3" />
          <div className="grid gap-4 md:grid-cols-2">
            <input name="city" required placeholder="City" className="rounded-lg border border-stone-300 px-4 py-3" />
            <input name="postal_code" required placeholder="Pincode" className="rounded-lg border border-stone-300 px-4 py-3" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? "Saving..." : "Continue to Shipping"}
          </button>
        </form>

        <div className="border-t border-stone-200 pt-6">
          <p className="text-sm font-semibold text-stone-500">2. Shipping</p>
          {step === "shipping" || step === "payment" || step === "review" ? (
            <div className="mt-3 space-y-2">
              {shippingOptions.length ? (
                shippingOptions.map((option) => (
                  <label key={option.id} className="flex items-center gap-2 rounded border border-stone-300 px-3 py-2">
                    <input
                      type="radio"
                      name="shipping_option"
                      checked={selectedShipping === option.id}
                      onChange={() => setSelectedShipping(option.id)}
                    />
                    <span className="text-sm text-stone-700">{option.name || option.id}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-stone-500">No shipping options loaded yet.</p>
              )}
              <button
                type="button"
                onClick={onApplyShipping}
                disabled={loading || !selectedShipping || !hasItems}
                className="rounded-xl border border-stone-300 px-5 py-2 text-sm font-semibold text-stone-700 disabled:opacity-60"
              >
                {isShippingApplied ? "Shipping Applied" : "Apply Shipping"}
              </button>
              {isShippingApplied ? (
                <p className="text-xs text-green-700">
                  Applied: {shippingOptions.find((option) => option.id === selectedShipping)?.name || selectedShipping}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-stone-500">Complete contact details to unlock shipping options.</p>
          )}
        </div>

        <div className="border-t border-stone-200 pt-6">
          <p className="text-sm font-semibold text-stone-500">3. Payment</p>
          {step === "payment" || step === "review" ? (
            <div className="mt-3 space-y-2">
              {paymentProviders.length ? (
                paymentProviders.map((provider) => (
                  <label key={provider.id} className="flex items-center gap-2 rounded border border-stone-300 px-3 py-2">
                    <input
                      type="radio"
                      name="payment_provider"
                      checked={selectedPayment === provider.id}
                      onChange={() => setSelectedPayment(provider.id)}
                    />
                    <span className="text-sm text-stone-700">{provider.id}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-stone-500">No payment providers loaded yet.</p>
              )}
              <button
                type="button"
                onClick={onApplyPayment}
                disabled={loading || !selectedPayment || !hasItems}
                className="rounded-xl border border-stone-300 px-5 py-2 text-sm font-semibold text-stone-700 disabled:opacity-60"
              >
                {isPaymentApplied ? "Payment Applied" : "Continue to Review"}
              </button>
              {isPaymentApplied ? (
                <p className="text-xs text-green-700">Applied: {selectedPayment}</p>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-stone-500">Apply shipping method first.</p>
          )}
        </div>

        <div className="border-t border-stone-200 pt-6">
          <p className="text-sm font-semibold text-stone-500">4. Review</p>
          <button
            type="button"
            onClick={onPlaceOrder}
            disabled={loading || step !== "review" || !hasItems}
            className="mt-3 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? "Processing..." : "Place Order"}
          </button>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-green-700">{success}</p> : null}
      </div>

      <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
        <h3 className="text-xl font-semibold text-stone-900">Order Summary</h3>
        <div className="mt-4 space-y-3">
          {cart?.items?.length ? (
            cart.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between text-sm">
                <div className="flex min-w-0 items-start gap-3">
                  {item.thumbnail ? (
                    <Image
                      src={item.thumbnail}
                      alt={item.product_title || item.title || "Product"}
                      width={44}
                      height={44}
                      className="h-11 w-11 shrink-0 rounded-md border border-stone-200 object-cover"
                    />
                  ) : (
                    <div className="h-11 w-11 shrink-0 rounded-md border border-stone-200 bg-stone-100" />
                  )}
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-medium text-stone-900">{item.product_title || item.title}</p>
                    <p className="text-stone-500">Qty: {item.quantity}</p>
                  </div>
                </div>
                <p className="text-stone-700">
                  {formatCurrency(getLineTotal(item))}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-stone-500">No cart items.</p>
          )}
        </div>
        <div className="mt-5 border-t border-stone-200 pt-4">
          <div className="flex items-center justify-between text-sm font-semibold text-stone-800">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
        </div>
      </aside>
    </section>
  );
}
