# Quick Test Checklist - Shiprocket Fulfillment Flow

## ✅ Pre-Test Setup

- [ ] Server is running (`npm run dev`)
- [ ] Shiprocket credentials configured in `.env`
- [ ] Console logs visible (watch for `[Shiprocket]` prefix)
- [ ] Test product with inventory available
- [ ] Test customer account ready

---

## 📋 Test Steps

### 1. Create Order (Checkout) - NO Shiprocket Calls

- [ ] Add products to cart
- [ ] Select Shiprocket shipping method
- [ ] Complete checkout
- [ ] **Verify:** No `[Shiprocket]` logs in console
- [ ] **Verify:** Order created with status "pending"
- [ ] **Verify:** Order has NO Shiprocket metadata
- [ ] **Verify:** Inventory is reserved (not decremented)

**Expected:** Order created, no Shiprocket API calls

---

### 2. Create Fulfillment - Shiprocket Calls Triggered

- [ ] Go to Admin Panel → Orders
- [ ] Find the test order
- [ ] Click "Create Fulfillment"
- [ ] Select "Shiprocket" provider
- [ ] Select items to fulfill
- [ ] Click "Create Fulfillment"

**Watch Console for:**

- [ ] `🚀 createFulfillment called` log appears
- [ ] `Step 0: Ensuring authentication...` → `✅ Authentication successful`
- [ ] `Step 1: Resolving stock location...`
- [ ] `Step 2: Building Shiprocket payload...`
- [ ] `Step 3: Creating Shiprocket order...`
- [ ] `📡 API Call: POST /orders/create` with URL
- [ ] `✅ Order created successfully!` with Order ID
- [ ] `📡 API Call: POST /orders/create/shipment` with URL
- [ ] `✅ Shipment created successfully!` with AWB Code
- [ ] `🎉 createFulfillment completed successfully!` with summary

**Expected:** All logs appear, API calls successful

---

### 3. Verify Fulfillment Data

- [ ] Check fulfillment in Admin Panel
- [ ] **Verify:** Provider is "shiprocket"
- [ ] **Verify:** AWB code is displayed
- [ ] **Verify:** Tracking link is present
- [ ] **Verify:** Courier name is shown

**Via API/DB, verify:**

- [ ] `fulfillment.metadata.shiprocket_order_id` exists
- [ ] `fulfillment.metadata.shiprocket_shipment_id` exists
- [ ] `fulfillment.metadata.shiprocket_awb_code` exists
- [ ] `fulfillment.metadata.shiprocket_label_url` exists
- [ ] `fulfillment.metadata.shiprocket_tracking_url` exists
- [ ] `fulfillment.data.awb_code` exists
- [ ] `fulfillment.tracking_numbers[0]` = AWB code
- [ ] `fulfillment.tracking_links[0].url` = tracking URL

**Expected:** All metadata fields populated

---

### 4. Verify Inventory & Status

- [ ] **Verify:** Inventory is decremented
- [ ] **Verify:** Reservations are removed
- [ ] **Verify:** Fulfillment status is "fulfilled" or "shipped"
- [ ] **Verify:** Order status updated (if applicable)

**Expected:** Inventory decremented, reservations cleared

---

## 🔍 What to Look For in Logs

### Success Indicators:

```
✅ [Shiprocket] Authentication successful
✅ [Shiprocket] ✅ Order created successfully!
✅ [Shiprocket] ✅ Shipment created successfully!
✅ [Shiprocket] AWB Code: 1234567890
✅ [Shiprocket] 🎉 createFulfillment completed successfully!
```

### API Calls Made:

1. `POST /auth/login` (if needed)
2. `POST /orders/create/adhoc` → Returns order_id, shipment_id
3. `POST /orders/create/shipment` → Returns awb_code, courier_name

### Error Indicators:

```
❌ [Shiprocket] Authentication failed
❌ [Shiprocket] Failed to create Shiprocket order
❌ [Shiprocket] Failed to create shipment
```

---

## 🐛 Common Issues

| Issue | Check |
|-------|-------|
| No logs appearing | Provider registered in config? |
| Authentication failed | Credentials correct in .env? |
| Order creation fails | Shipping address complete? |
| Shipment creation fails | Valid courier_id? |
| Metadata missing | Fulfillment created via correct provider? |

---

## 📊 Test Results Template

```
Test Date: ___________
Order ID: ___________
Display ID: ___________

✅ Step 1: Order Created (No Shiprocket calls)
✅ Step 2: Fulfillment Created (Shiprocket calls made)
✅ Step 3: Data Persisted (Metadata present)
✅ Step 4: Inventory Updated (Decremented)

Shiprocket Order ID: ___________
Shiprocket Shipment ID: ___________
AWB Code: ___________
Courier: ___________
Label URL: ___________

Notes: ___________
```

---

## 🚀 Quick Test Command

```bash
# Watch logs in real-time
npm run dev | grep -i shiprocket

# Or in PowerShell
npm run dev | Select-String -Pattern "Shiprocket"
```

---

## 📝 Notes

- All logs are prefixed with `[Shiprocket]` for easy filtering
- API endpoints are logged with full URLs
- Request/response data is logged for debugging
- Errors include stack traces for troubleshooting

---

**For detailed testing instructions, see `TESTING_GUIDE.md`**

