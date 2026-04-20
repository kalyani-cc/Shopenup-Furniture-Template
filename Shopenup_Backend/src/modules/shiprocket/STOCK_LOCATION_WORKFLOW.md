# Stock Location & Shiprocket Pickup Workflow

This document describes the workflow for integrating stock locations with Shiprocket pickup addresses.

## Overview

When creating a stock location in Medusa, admins can check "Use for Shiprocket" to automatically create a corresponding pickup address in Shiprocket. When creating fulfillments, the system will use the Shiprocket pickup_id from the stock location metadata.

## Workflow

### 1. Stock Location Creation/Update

**Admin Action:**
- Admin creates or updates a stock location
- Checks "Use for Shiprocket" checkbox
- Saves the stock location

**Backend Process:**
1. `stock_location.created` or `stock_location.updated` event is triggered
2. `stock-location-created.ts` or `stock-location-updated.ts` handler in `src/subscribers/` receives the event
3. Checks if `metadata.use_for_shiprocket === true`
4. If checked and no existing pickup_id:
   - Maps stock location address to Shiprocket pickup location format
   - Calls `shiprocket.pickups.createPickupLocation()`
   - Saves `pickup_location_id` and `pickup_location` name to `stock_location.metadata`
5. If checked and pickup_id exists:
   - Updates the Shiprocket pickup location via `shiprocket.pickups.updatePickupLocation()`

**Metadata Saved:**
```json
{
  "use_for_shiprocket": true,
  "shiprocket_pickup_id": 12345,
  "shiprocket_pickup_location": "Main Warehouse",
  "shiprocket_pickup_created_at": "2024-01-15T10:30:00Z"
}
```

### 2. Fulfillment Creation

**Admin Action:**
- Admin creates a fulfillment for an order
- Selects "Shiprocket" as the fulfillment provider
- System automatically uses the stock location's Shiprocket pickup address

**Backend Process:**
1. `createFulfillment()` is called
2. Resolves stock location from order or fulfillment items
3. Checks `stock_location.metadata.shiprocket_pickup_id`
4. If pickup_id exists:
   - Uses the pickup_id in the Shiprocket order creation
   - Maps stock location address to pickup_location object
   - Includes pickup_id in `order_meta` for reference
5. Creates Shiprocket order with the pickup location
6. Creates shipment and gets AWB code

## Implementation Details

### Files Modified/Created

1. **`src/subscribers/stock-location-created.ts`** (NEW)
   - Handles `stock_location.created` event
2. **`src/subscribers/stock-location-updated.ts`** (NEW)
   - Handles `stock_location.updated` event
   - Creates/updates Shiprocket pickup locations
   - Saves pickup data to stock location metadata

2. **`service.ts`** (UPDATED)
   - `resolveStockLocation()`: Now actually fetches stock location from service
   - `createFulfillment()`: Uses pickup_id from stock location metadata
   - `mapOrderToShiprocket()`: Accepts and uses pickup_id parameter

3. **`index.ts`** (UPDATED)
   - Registers stock location event subscribers

### API Endpoints Used

**Shiprocket API:**
- `POST /pickup/location` - Create pickup location
- `PUT /pickup/location/:id` - Update pickup location
- `GET /pickup/location/:id` - Get pickup location (for validation)

### Data Flow

```
Stock Location Creation
  ↓
Admin checks "Use for Shiprocket"
  ↓
stock_location.created event
  ↓
stock-location-created/updated handler
  ↓
Create Shiprocket pickup location
  ↓
Save pickup_id to stock_location.metadata
  ↓
─────────────────────────────────────
Fulfillment Creation
  ↓
Admin selects "Shiprocket" provider
  ↓
createFulfillment() called
  ↓
Resolve stock location
  ↓
Get pickup_id from metadata
  ↓
Create Shiprocket order with pickup location
  ↓
Create shipment → Get AWB
```

## Frontend Requirements

### Stock Location Form

Add checkbox field:
```typescript
<Checkbox
  label="Use for Shiprocket"
  name="metadata.use_for_shiprocket"
  defaultChecked={stockLocation?.metadata?.use_for_shiprocket}
/>
```

### Fulfillment Form

Add provider dropdown:
```typescript
<Select
  label="Shipping Provider"
  name="provider_id"
  options={[
    { value: "manual", label: "Manual" },
    { value: "shiprocket", label: "Shiprocket" }
  ]}
/>
```

## Testing

### Test Case 1: Create Stock Location with Shiprocket

1. Create a stock location with address
2. Check "Use for Shiprocket"
3. Save
4. **Verify:**
   - Console shows: `[Shiprocket] Creating Shiprocket pickup location...`
   - Console shows: `[Shiprocket] ✅ Pickup location created successfully!`
   - Stock location metadata contains `shiprocket_pickup_id`

### Test Case 2: Create Fulfillment with Shiprocket

1. Create an order
2. Create fulfillment with provider "Shiprocket"
3. **Verify:**
   - Console shows: `[Shiprocket] Using Shiprocket pickup_id from stock location metadata`
   - Shiprocket order created with correct pickup location
   - AWB code generated

### Test Case 3: Update Stock Location

1. Update stock location address
2. **Verify:**
   - Shiprocket pickup location is updated
   - Metadata still contains pickup_id

## Error Handling

- If Shiprocket API fails, error is logged but stock location creation continues
- If stock location address is incomplete, pickup creation is skipped with warning
- If pickup_id exists but Shiprocket pickup is deleted, fulfillment will use address data

## Logging

All operations are logged with `[Shiprocket]` prefix:
- Stock location events
- Pickup location creation/updates
- Pickup_id usage in fulfillments

## Configuration

No additional configuration needed. Uses existing Shiprocket credentials from:
- `SHIPROCKET_EMAIL`
- `SHIPROCKET_PASSWORD`
- `SHIPROCKET_BASE_URL`

## Notes

- Pickup locations are created automatically when stock location is saved
- Pickup_id is stored in metadata for quick lookup
- If "Use for Shiprocket" is unchecked, pickup_id remains but is not used
- Multiple stock locations can have Shiprocket pickup addresses
- Fulfillment automatically selects the correct pickup location based on order's stock location

