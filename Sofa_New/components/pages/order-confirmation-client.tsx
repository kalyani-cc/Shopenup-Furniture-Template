"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { sdk } from "@/lib/config";
import { getCompleteHeaders } from "@/lib/shopenup/cookies";
import { formatCurrency } from "@/lib/utils";

type OrderItem = {
  id: string;
  quantity?: number;
  unit_price?: number;
  total?: number;
  title?: string;
  product_title?: string;
  thumbnail?: string;
  variant?: {
    product?: {
      thumbnail?: string;
      title?: string;
    };
  };
};

type OrderResponse = {
  order?: {
    items?: OrderItem[];
  };
};

export function OrderConfirmationClient({ orderId }: { orderId: string }) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const data = await sdk.client.fetch<OrderResponse>(`/store/orders/${orderId}`, {
          method: "GET",
          headers: await getCompleteHeaders(),
          query: {
            fields:
              "*items,*items.variant,*items.variant.product,*items.thumbnail,*items.product_title,*items.title",
          },
          cache: "no-store",
        });
        if (mounted) {
          setItems(data.order?.items || []);
        }
      } catch {
        if (mounted) {
          setItems([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [orderId]);

  if (loading) {
    return <p className="mt-6 text-sm text-stone-500">Loading order items...</p>;
  }

  if (!items.length) {
    return <p className="mt-6 text-sm text-stone-500">Order items are not available for preview.</p>;
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-stone-900">Items in this order</h3>
      <div className="mt-3 space-y-3">
        {items.map((item) => {
          const title = item.product_title || item.title || item.variant?.product?.title || "Product";
          const image = item.thumbnail || item.variant?.product?.thumbnail;
          const quantity = item.quantity || 1;
          const lineTotal = item.total ?? (item.unit_price || 0) * quantity;

          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 px-3 py-3"
            >
              <div className="flex items-center gap-3">
                {image ? (
                  <Image
                    src={image}
                    alt={title}
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-md border border-stone-200 object-cover"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-md border border-stone-200 bg-stone-100" />
                )}
                <div>
                  <p className="text-sm font-medium text-stone-900">{title}</p>
                  <p className="text-xs text-stone-500">Qty: {quantity}</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-stone-900">{formatCurrency(lineTotal)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

