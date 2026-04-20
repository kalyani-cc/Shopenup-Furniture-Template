# Shiprocket Fulfillment Flow Testing Guide

This guide will help you test the complete fulfillment flow from checkout to Shiprocket shipment creation.

## Prerequisites

1. **Environment Setup**
   - Ensure Shiprocket credentials are configured in `.env`:
     ```env
     SHIPROCKET_EMAIL=your-email@example.com
     SHIPROCKET_PASSWORD=your-password
     SHIPROCKET_BASE_URL=https://apiv2.shiprocket.in/v1/external
     ```
   - Server should be running: `npm run dev` or `npm start`

2. **Test Data**
   - At least one product with inventory
   - A valid shipping address (Indian address for Shiprocket)
   - A test customer account

## Testing Flow

### Step 1: Create an Order (Checkout)

**Goal:** Verify that checkout creates an order WITHOUT any Shiprocket API calls.

1. **Add products to cart** (via storefront or admin)
   - Add 1-2 products with inventory
   - Ensure products have weights configured (or default 0.5kg will be used)

2. **Proceed to checkout**
   - Select Shiprocket shipping method
   - Choose a courier option
   - Complete payment

3. **Verify in Logs:**
   ```
   ✅ Should NOT see any "[Shiprocket]" logs during checkout
   ✅ Should NOT see "createFulfillment" logs
   ✅ Order should be created with status "pending" or "awaiting_fulfillment"
   ```

4. **Verify in Database/Admin:**
   - Order should exist in Medusa
   - Order should have reservations (inventory reserved)
   - Order should NOT have any Shiprocket metadata yet
   - No fulfillments should exist for this order

**Expected Result:** Order created successfully, no Shiprocket calls made.

---

### Step 2: Create a Fulfillment (Trigger Shiprocket)

**Goal:** Verify that creating a fulfillment triggers Shiprocket API calls.

#### Option A: Via Admin Panel (Manual)

1. **Navigate to Admin Panel**
   - Go to Orders section
   - Find the order created in Step 1
   - Click on the order to view details

2. **Create Fulfillment**
   - Click "Create Fulfillment" or "Fulfill Order"
   - Select "Shiprocket" as the fulfillment provider
   - Select items to fulfill (or fulfill all)
   - Click "Create Fulfillment" or "Confirm"

#### Option B: Via API (Automated)

```bash
# Create fulfillment via API
curl -X POST http://localhost:9000/admin/orders/{order_id}/fulfillments \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_id": "shiprocket",
    "items": [
      {
        "id": "item_id_1",
        "quantity": 1
      }
    ]
  }'
```

#### Option C: Via Code (For Testing)

```typescript
// In your test script or admin action
const fulfillmentService = container.resolve("fulfillmentService");
const orderService = container.resolve("orderService");

const order = await orderService.retrieve("order_123", {
  relations: ["items", "items.variant", "shipping_address"]
});

const fulfillment = await fulfillmentService.createFulfillment(
  {
    order: order,
    items: order.items.map(item => ({
      title: item.title,
      sku: item.variant?.sku,
      quantity: item.quantity,
      unit_price: item.unit_price,
      variant_id: item.variant_id,
    })),
    shipping_address: order.shipping_address,
    metadata: {
      courier_company_id: 123, // From shipping method selection
    }
  },
  order.items,
  order
);
```

---

### Step 3: Monitor Console Logs

**Watch your server console** for the following logs:

#### Expected Log Sequence:

```
================================================================================
[Shiprocket] 🚀 createFulfillment called - Starting fulfillment provider flow
================================================================================
[Shiprocket] Order ID: order_xxx
[Shiprocket] Order Display ID: #1234
[Shiprocket] Fulfillment Items Count: 2
[Shiprocket] Shipping Address: { name: 'John Doe', city: 'Mumbai', ... }
[Shiprocket] 📋 API Calls that will be made:
  1. POST /auth/login (if not authenticated)
  2. POST /orders/create/adhoc - Create Shiprocket order
  3. POST /orders/create/shipment - Create shipment and get AWB
================================================================================
[Shiprocket] Step 0: Ensuring authentication...
[Shiprocket] ✅ Authentication successful
[Shiprocket] Step 1: Resolving stock location...
[Shiprocket] Pickup Location: { name: 'Main Warehouse', city: 'Mumbai', ... }
[Shiprocket] Step 2: Building Shiprocket payload...
[Shiprocket] Fulfillment Items Details: [...]
[Shiprocket] Total Weight: 1.5 kg
[Shiprocket] Shiprocket Order Payload: { order_id: '...', ... }
[Shiprocket] Step 3: Creating Shiprocket order...
[Shiprocket] 📡 API Call: POST /orders/create
[Shiprocket] Request URL: https://apiv2.shiprocket.in/v1/external/orders/create/adhoc
[Shiprocket] Order Creation Response: { success: true, order_id: 12345, ... }
[Shiprocket] ✅ Order created successfully!
[Shiprocket] Shiprocket Order ID: 12345
[Shiprocket] Shiprocket Shipment ID: 67890
[Shiprocket] Creating shipment...
[Shiprocket] 📡 API Call: POST /orders/create/shipment
[Shiprocket] Request URL: https://apiv2.shiprocket.in/v1/external/orders/create/shipment
[Shiprocket] Shipment Request: { shipment_id: 67890, courier_id: 123 }
[Shiprocket] Shipment Creation Response: { success: true, awb_code: '1234567890', ... }
[Shiprocket] ✅ Shipment created successfully!
[Shiprocket] AWB Code: 1234567890
[Shiprocket] Courier Name: Delhivery
[Shiprocket] Label URL: https://...
[Shiprocket] Step 4: Preparing fulfillment data with metadata...
[Shiprocket] Fulfillment Metadata: { shiprocket_order_id: 12345, ... }
[Shiprocket] ✅ Fulfillment data prepared successfully!
================================================================================
[Shiprocket] 🎉 createFulfillment completed successfully!
[Shiprocket] Summary:
  - Shiprocket Order ID: 12345
  - Shiprocket Shipment ID: 67890
  - AWB Code: 1234567890
  - Courier: Delhivery
  - Label URL: https://...
  - Tracking URL: https://shiprocket.co/tracking/1234567890
================================================================================
```

#### Also Check for Fulfillment Subscriber Logs:

```
[Shiprocket] 📬 fulfillment.created event received
[Shiprocket] Fulfillment ID: fulfill_xxx
[Shiprocket] Fulfillment Provider ID: shiprocket
[Shiprocket] Order ID: order_xxx
[Shiprocket] ✅ Fulfillment already has Shiprocket shipment data
[Shiprocket] Shipment ID: 67890
[Shiprocket] AWB Code: 1234567890
```

---

### Step 4: Verify Data Persistence

**Check that all Shiprocket data is stored correctly:**

#### A. Check Fulfillment Metadata

```bash
# Via API
curl -X GET http://localhost:9000/admin/fulfillments/{fulfillment_id} \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected in `fulfillment.metadata`:**
```json
{
  "shiprocket_order_id": 12345,
  "shiprocket_shipment_id": 67890,
  "shiprocket_awb_code": "1234567890",
  "shiprocket_courier_id": 123,
  "shiprocket_courier_name": "Delhivery",
  "shiprocket_label_url": "https://...",
  "shiprocket_tracking_url": "https://shiprocket.co/tracking/1234567890"
}
```

**Expected in `fulfillment.data`:**
```json
{
  "shipment_id": 67890,
  "order_id": 12345,
  "awb_code": "1234567890",
  "courier_name": "Delhivery",
  "courier_company_id": 123,
  "label_url": "https://...",
  "tracking_data": { ... }
}
```

#### B. Check Fulfillment Tracking

```json
{
  "tracking_numbers": ["1234567890"],
  "tracking_links": [
    {
      "url": "https://shiprocket.co/tracking/1234567890",
      "tracking_number": "1234567890"
    }
  ]
}
```

#### C. Verify in Admin Panel

1. Go to Orders → Select the order
2. Check "Fulfillments" section:
   - Should show fulfillment with provider "shiprocket"
   - Should display AWB code
   - Should have tracking link
   - Should show courier name

3. Check Order Metadata (if accessible):
   - Should contain Shiprocket IDs

---

### Step 5: Verify Inventory & Reservations

**Check that inventory was decremented correctly:**

1. **Before Fulfillment:**
   - Product should have inventory reserved (reserved_quantity > 0)
   - Stock quantity should be unchanged

2. **After Fulfillment:**
   - Reservations should be removed (reserved_quantity = 0)
   - Stock quantity should be decremented
   - Fulfillment status should be "fulfilled" or "shipped"

**Verify via API:**
```bash
# Check inventory levels
curl -X GET http://localhost:9000/admin/products/{product_id} \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### Step 6: Test Edge Cases

#### Test Case 1: Missing Courier ID
- Create fulfillment without courier_company_id in metadata
- **Expected:** Should still work, but shipment creation might fail or use default courier

#### Test Case 2: Invalid Shipping Address
- Use an address with missing postal code or city
- **Expected:** Should fail with clear error message in logs

#### Test Case 3: Multiple Items
- Create fulfillment with multiple items
- **Expected:** All items should be included in Shiprocket order

#### Test Case 4: Partial Fulfillment
- Fulfill only some items from an order
- **Expected:** Only selected items should be sent to Shiprocket

---

## Troubleshooting

### Issue: No logs appearing

**Possible Causes:**
1. Fulfillment provider not registered
   - Check `shopenup-config.js` - Shiprocket provider should be listed
2. Wrong provider selected
   - Ensure "shiprocket" is selected, not "manual"
3. Server not running
   - Restart server and check logs

**Solution:**
```javascript
// Verify in shopenup-config.js
{
  resolve: './src/modules/shiprocket',
  id: 'shiprocket',
  options: { ... }
}
```

---

### Issue: Authentication errors

**Symptoms:**
```
[Shiprocket] Authentication failed: Invalid credentials
```

**Solution:**
1. Check `.env` file has correct credentials
2. Verify credentials in Shiprocket dashboard
3. Check if account is blocked (wait 15-30 minutes)

---

### Issue: Order creation fails

**Symptoms:**
```
[Shiprocket] ❌ Failed to create Shiprocket order: ...
```

**Common Causes:**
1. Missing required fields (postal code, city, etc.)
2. Invalid address format
3. Shiprocket API error

**Solution:**
- Check logs for specific error message
- Verify shipping address is complete
- Check Shiprocket API status

---

### Issue: Shipment creation fails

**Symptoms:**
```
[Shiprocket] ❌ Failed to create shipment: ...
```

**Common Causes:**
1. Invalid courier_id
2. Order not created successfully
3. Shiprocket API error

**Solution:**
- Verify order was created (check order_id in logs)
- Check courier_id is valid
- Review Shiprocket API response

---

### Issue: Metadata not persisting

**Symptoms:**
- Fulfillment created but metadata is empty

**Solution:**
1. Check if fulfillment was created via correct provider
2. Verify return value from `createFulfillment` includes metadata
3. Check Medusa/Shopenup version compatibility

---

## Quick Test Checklist

- [ ] Order created without Shiprocket calls
- [ ] Fulfillment creation triggers `createFulfillment` logs
- [ ] Authentication successful
- [ ] Stock location resolved (or default used)
- [ ] Shiprocket order created (API call successful)
- [ ] Shipment created with AWB code
- [ ] Label URL generated
- [ ] Metadata persisted in fulfillment
- [ ] Tracking numbers and links present
- [ ] Inventory decremented
- [ ] Reservations removed
- [ ] Fulfillment status updated

---

## API Endpoints Reference

The following Shiprocket API endpoints are called:

1. **POST /auth/login**
   - Called automatically if not authenticated
   - Returns authentication token

2. **POST /orders/create/adhoc**
   - Creates order in Shiprocket
   - Returns: `order_id`, `shipment_id`

3. **POST /orders/create/shipment**
   - Creates shipment and assigns courier
   - Returns: `awb_code`, `courier_name`, `label_url` (if available)

---

## Next Steps

After successful testing:

1. **Monitor Production:**
   - Set up log aggregation (e.g., CloudWatch, Datadog)
   - Monitor error rates
   - Track fulfillment success rate

2. **Set up Webhooks:**
   - Configure Shiprocket webhooks for status updates
   - Handle delivery notifications

3. **Automate:**
   - Set up automated fulfillment jobs
   - Create "ready-to-ship" automation

---

## Support

If you encounter issues:

1. Check logs for detailed error messages
2. Review Shiprocket API documentation
3. Verify credentials and configuration
4. Check network connectivity to Shiprocket API
