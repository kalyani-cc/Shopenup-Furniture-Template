export enum ShiprocketStatusCode {
    PICKUP_SCHEDULED = 3,
    SHIPPED = 6,
    DELIVERED = 7,
    CANCELLED = 8,
    RTO_INITIATED = 9,
    RTO_DELIVERED = 10,
    LOST = 12,
    PICKUP_ERROR = 13,
    PICKUP_RESCHEDULED = 15,
    OUT_FOR_DELIVERY = 17,
    IN_TRANSIT = 18,
    OUT_FOR_PICKUP = 19,
    PICKUP_EXCEPTION = 20,
    UNDELIVERED = 21,
    DELAYED = 22,
    PICKED_UP = 42,
    REACHED_WAREHOUSE = 48,
    QC_FAILED = 47,
  }

  
  export const SHIPROCKET_STATUS_LABEL: Record<number, string> = {
    [ShiprocketStatusCode.PICKUP_SCHEDULED]: "Pickup Scheduled",
    [ShiprocketStatusCode.SHIPPED]: "Shipped",
    [ShiprocketStatusCode.DELIVERED]: "Delivered",
    [ShiprocketStatusCode.CANCELLED]: "Cancelled",
    [ShiprocketStatusCode.RTO_INITIATED]: "RTO Initiated",
    [ShiprocketStatusCode.RTO_DELIVERED]: "RTO Delivered",
    [ShiprocketStatusCode.LOST]: "Lost",
    [ShiprocketStatusCode.PICKUP_ERROR]: "Pickup Error",
    [ShiprocketStatusCode.PICKUP_RESCHEDULED]: "Pickup Rescheduled",
    [ShiprocketStatusCode.OUT_FOR_DELIVERY]: "Out For Delivery",
    [ShiprocketStatusCode.IN_TRANSIT]: "In Transit",
    [ShiprocketStatusCode.OUT_FOR_PICKUP]: "Out For Pickup",
    [ShiprocketStatusCode.PICKUP_EXCEPTION]: "Pickup Exception",
    [ShiprocketStatusCode.UNDELIVERED]: "Undelivered",
    [ShiprocketStatusCode.DELAYED]: "Delayed",
    [ShiprocketStatusCode.PICKED_UP]: "Picked Up",
    [ShiprocketStatusCode.REACHED_WAREHOUSE]: "Reached Warehouse",
    [ShiprocketStatusCode.QC_FAILED]: "QC Failed",
  }
  
  export type ShiprocketStatusCategory =
  | "pickup"
  | "scheduled"
  | "picked"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "rto"
  | "exception"
  | "cancelled"
  | "other"

export const SHIPROCKET_STATUS_CATEGORY: Record<number, ShiprocketStatusCategory> = {
  3: "scheduled",
  27: "pickup",
  42: "pickup",

  18: "in_transit",
  38: "in_transit",

  17: "out_for_delivery",

  7: "delivered",

  9: "rto",
  10: "rto",
  14: "rto",
  40: "rto",
  46: "rto",

  12: "exception",
  20: "exception",
  21: "exception",
  22: "exception",
  47: "exception",

  8: "cancelled",
  16: "cancelled",
  45: "cancelled",
}

export function getShiprocketStatusLabel(
    statusCode?: number
  ): string {
    if (!statusCode) return "Unknown Status"
    return SHIPROCKET_STATUS_LABEL[statusCode] || "Unknown Status"
  }
  
  export function getShiprocketStatusCategory(
    statusCode?: number
  ): ShiprocketStatusCategory {
    if (!statusCode) return "other"
    return SHIPROCKET_STATUS_CATEGORY[statusCode] || "other"
  }
  

export function getShiprocketStatusInfo(statusCode?: number) {
    return {
      code: statusCode ?? null,
      label: getShiprocketStatusLabel(statusCode),
      category: getShiprocketStatusCategory(statusCode),
    }
  }
  