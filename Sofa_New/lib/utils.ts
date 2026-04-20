export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR"
  }).format(value);
}

/** Customer-facing status: backend updates fulfillment from admin; `status` is often workflow-only. */
export function formatOrderDisplayStatus(order: {
  fulfillment_status?: string | null;
  payment_status?: string | null;
  status?: string | null;
}): string {
  const raw = (order.fulfillment_status || "").trim().toLowerCase().replace(/-/g, "_");
  switch (raw) {
    case "delivered":
      return "Delivered";
    case "shipped":
      return "Shipped";
    case "fulfilled":
      return "Fulfilled";
    case "partially_fulfilled":
      return "Partially fulfilled";
    case "not_fulfilled":
      return "Unfulfilled";
    case "canceled":
    case "cancelled":
      return "Cancelled";
    case "":
      break;
    default:
      return raw.replace(/_/g, " ");
  }

  const pay = (order.payment_status || "").trim().toLowerCase();
  if (pay === "awaiting" || pay === "pending" || pay === "not_paid") {
    return "Payment pending";
  }

  const st = (order.status || "").trim().toLowerCase();
  if (st === "completed") {
    return "Confirmed";
  }
  if (st) {
    return st.replace(/_/g, " ");
  }
  return "Processing";
}
