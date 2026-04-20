# Shiprocket Fulfillment Metadata Standard

## Overview
This document describes the standardized structure for storing Shiprocket data in `fulfillment.data`. All Shiprocket-related metadata should follow this structure for consistency and clarity.

## Metadata Structure

### Core Identifiers (Required for Tracking)
```typescript
{
  awb_code: string,                    // AWB tracking number (e.g., "MOCK705821472373")
  shiprocket_order_id: number,         // Shiprocket order ID (e.g., 655610228)
  shiprocket_shipment_id: number,      // Shiprocket shipment ID (e.g., 38522292)
}
```

### Status Tracking (Updated by Webhooks)
```typescript
{
  last_status: string,                 // Current status: "Picked Up", "Delivered", "In Transit", etc.
  last_status_at: string,              // ISO timestamp of last status update (e.g., "2025-12-19 12:07:00")
  current_status_id: number,           // Shiprocket status ID (e.g., 6 for "Picked Up", 7 for "Delivered")
}
```

### Courier Information
```typescript
{
  courier_name: string,                // Courier service name (e.g., "Mock Courier Service")
  courier_id: number,                   // Courier ID (e.g., 51)
}
```

### Tracking & URLs
```typescript
{
  tracking_url: string,                // Shiprocket tracking URL (e.g., "https://shiprocket.co/tracking/MOCK705821472373")
  label_url: string,                   // Shipping label download URL
  manifest_url: string,                // Manifest download URL
  scans: Array<{                       // Tracking scan history
    date: string,                      // Scan date (e.g., "2025-12-19 12:14:00")
    activity: string,                  // Activity description (e.g., "SHIPMENT DELIVERED")
    location: string                   // Location (e.g., "Ahmedabad")
  }>,
}
```

### Timestamps (Informative)
```typescript
{
  packed_at: string,                   // ISO timestamp when packed (e.g., "2025-12-19T06:17:59.867Z")
  shipped_at: string,                 // ISO timestamp when shipped (also stored in fulfillment.shipped_at)
  delivered_at: string,               // ISO timestamp when delivered (also stored in fulfillment.delivered_at)
  awb_assigned_at: string,             // ISO timestamp when AWB was assigned
}
```

### Pickup Information
```typescript
{
  pickup_status: string,               // Pickup status: "Scheduled", "Picked Up", etc.
  pickup_token_number: string,         // Pickup token number (e.g., "PKP1766125099534")
  pickup_scheduled_date: string,       // Scheduled pickup date/time (e.g., "2025-12-20 14:00:00")
  pickup_requested_at: string,         // ISO timestamp when pickup was requested
}
```

### Manifest Information
```typescript
{
  manifest_id: string,                 // Manifest ID (e.g., "MNF1766125119673")
  manifest_generated_at: string,       // ISO timestamp when manifest was generated
}
```

### Additional Info
```typescript
{
  invoice_no: string,                  // Invoice number (e.g., "INV271")
  routing_code: string,                // Routing code (e.g., "DEL/DEL")
  rto_routing_code: string,           // RTO routing code (e.g., "DEL")
  applied_weight: number,             // Applied weight in kg (e.g., 0.5)
}
```

## Usage

### Import the Utility
```typescript
import { standardizeShiprocketMetadata } from '../../admin/fulfillments/utils/shiprocket-metadata';
```

### Update Metadata
```typescript
const fulfillmentData = (fulfillment.data as any) || {};

// Standardize and update metadata
const standardizedMetadata = standardizeShiprocketMetadata(fulfillmentData, {
  awb_code: "MOCK705821472373",
  last_status: "Delivered",
  last_status_at: "2025-12-19 12:14:00",
  current_status_id: 7,
  courier_name: "Mock Courier Service",
  scans: [
    {
      date: "2025-12-19 12:14:00",
      activity: "SHIPMENT DELIVERED",
      location: "Ahmedabad"
    }
  ]
});

await fulfillmentModuleService.updateFulfillment(fulfillment.id, {
  data: standardizedMetadata,
});
```

## Benefits

1. **Consistency**: All Shiprocket data follows the same structure
2. **Clarity**: Clear field names that are self-documenting
3. **Maintainability**: Easy to find and update specific fields
4. **Clean Data**: Only informative fields are stored, no redundant data
5. **Type Safety**: TypeScript interface ensures correct structure

## Migration Notes

- Old structure with nested `shiprocket` object is automatically handled
- The utility function merges existing data with updates
- Only standardized fields are kept, removing any non-standard fields

## Files Using This Standard

- ✅ `/api/webhooks/shiprocket/route.ts` - Webhook handler
- ⚠️ `/api/admin/fulfillments/[id]/shiprocket/*` - Admin endpoints (to be updated)
- ⚠️ `/subscribers/order-fullfillment-created.ts` - Fulfillment creation (to be updated)

