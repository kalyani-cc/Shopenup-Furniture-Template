# Shiprocket Integration Documentation

This guide provides comprehensive documentation for integrating Shiprocket logistics with your Shopenup/Shopenup e-commerce application.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Features](#features)
- [API Reference](#api-reference)
- [Webhooks](#webhooks)
- [Troubleshooting](#troubleshooting)

## Overview

The Shiprocket fulfillment provider enables seamless integration between your Shopenup/Shopenup store and Shiprocket's logistics platform. It handles order creation, shipment management, rate calculation, tracking, and webhook processing automatically.

### Key Capabilities

- ✅ Automatic order synchronization
- ✅ Real-time shipping rate calculation
- ✅ Multi-courier support
- ✅ Automated shipment creation
- ✅ Real-time tracking
- ✅ Webhook-based status updates
- ✅ Return management
- ✅ COD (Cash on Delivery) support

## Prerequisites

Before you begin, ensure you have:

1. **Active Shiprocket Account**
   - Sign up at [shiprocket.in](https://shiprocket.in)
   - Complete account verification
   - Get API credentials (email and password)

2. **Shiprocket API Access**
   - Go to Settings → API Settings in Shiprocket dashboard
   - Create API user if needed
   - Note your API email and password

3. **Pickup Location**
   - Configure at least one pickup location in Shiprocket
   - Note the pickup location details (address, pincode, etc.)

4. **Shopenup/Shopenup Setup**
   - Shopenup/Shopenup v1.7+ installed
   - Admin access configured
   - Database configured

## Installation

### Step 1: Install Package

The `@shopenup/logistic` package should already be installed. If not:

```bash
npm install @shopenup/logistic
```

### Step 2: Verify Module Registration

The module is registered in `shopenup-config.js`. Verify it's present:

```javascript
{
  resolve: '@shopenup/shopenup/fulfillment',
  options: {
    providers: [
      {
        resolve: './src/modules/shiprocket',
        id: 'shiprocket',
        // ...
      }
    ],
  },
}
```

## Configuration

### Environment Variables

Create or update your `.env` file with the following variables:

```env
# Required: Shiprocket API Credentials
SHIPROCKET_EMAIL=your-email@example.com
SHIPROCKET_PASSWORD=your-password

# Optional: API Configuration
SHIPROCKET_BASE_URL=https://apiv2.shiprocket.in/v1/external
SHIPROCKET_TIMEOUT=30000
SHIPROCKET_RETRY_ATTEMPTS=3
SHIPROCKET_RETRY_DELAY=1000

# Optional: Default Pickup Location (JSON format)
SHIPROCKET_PICKUP_LOCATION={"pickup_location":"Main Warehouse","name":"Store Owner","email":"your-email@example.com","phone":"9876543210","address":"123 Main Street","city":"Mumbai","state":"Maharashtra","country":"India","pin_code":"400001"}
```

### Pickup Location Configuration

You can configure the default pickup location in two ways:

#### Option 1: Environment Variable (Recommended)

Set `SHIPROCKET_PICKUP_LOCATION` as a JSON string:

```env
SHIPROCKET_PICKUP_LOCATION={"pickup_location":"Main Warehouse","name":"John Doe","email":"john@example.com","phone":"9876543210","address":"123 Main St","city":"Mumbai","state":"Maharashtra","country":"India","pin_code":"400001"}
```

#### Option 2: Module Options

Configure in `shopenup-config.js`:

```javascript
{
  resolve: './src/modules/shiprocket',
  id: 'shiprocket',
  options: {
    email: process.env.SHIPROCKET_EMAIL,
    password: process.env.SHIPROCKET_PASSWORD,
    defaultPickupLocation: {
      pickup_location: "Main Warehouse",
      name: "John Doe",
      email: "john@example.com",
      phone: "9876543210",
      address: "123 Main St",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      pin_code: "400001"
    }
  }
}
```

## Features

### 1. Automatic Order Creation

When a customer places an order, the module automatically:

1. Listens to the `order.placed` event
2. Maps order data to Shiprocket format
3. Creates the order in Shiprocket
4. Stores Shiprocket IDs in order metadata

**Order Metadata Stored**:
- `shiprocket_order_id`: Shiprocket order ID
- `shiprocket_shipment_id`: Shiprocket shipment ID

### 2. Shipping Rate Calculation

During checkout, the module:

1. Fetches available couriers for pickup and delivery pincodes
2. Calculates shipping rates based on:
   - Package weight
   - Package dimensions
   - Pickup pincode
   - Delivery pincode
   - Payment method (COD charges)
3. Returns multiple courier options with pricing

**Usage in Storefront**:

```typescript
// Get shipping options for cart
const options = await fulfillmentService.getFulfillmentOptions({
  items: cart.items,
  shipping_address: shippingAddress,
});
```

### 3. Shipment Creation

When a fulfillment is created:

1. Module listens to `fulfillment.created` event
2. Creates shipment in Shiprocket using stored shipment ID
3. Generates AWB (Airway Bill) code
4. Updates fulfillment with tracking information

**Fulfillment Data Includes**:
- `awb_code`: Tracking number
- `courier_name`: Courier company name
- `courier_company_id`: Courier ID
- `tracking_data`: Full tracking information

### 4. Tracking

#### Public Tracking Endpoint

Customers can track shipments without authentication:

```
GET /store/tracking/:awbCode
```

**Response**:
```json
{
  "success": true,
  "awbCode": "AWB123456789",
  "tracking": {
    "tracking_data": {
      "shipment_status": "In Transit",
      "shipment_track": [
        {
          "id": 1,
          "status": "Picked Up",
          "status_date": "2024-01-15 10:30:00",
          "status_location": "Mumbai",
          "status_description": "Package picked up from sender"
        }
      ]
    }
  }
}
```

#### Admin Tracking Endpoint

Admins can track any order:

```
GET /admin/tracking/:orderId
```

**Headers**:
```
Authorization: Bearer {admin_token}
```

**Response**:
```json
{
  "success": true,
  "orderId": "order_123",
  "awbCode": "AWB123456789",
  "tracking": { /* tracking data */ },
  "fulfillment": {
    "id": "fulfillment_123",
    "status": "shipped",
    "shipped_at": "2024-01-15T10:30:00Z"
  }
}
```

### 5. Webhook Integration

The module handles Shiprocket webhooks for real-time status updates.

#### Webhook Endpoint

```
POST /webhooks/shiprocket
```

#### Webhook Configuration

1. Log in to Shiprocket dashboard
2. Navigate to Settings → Webhooks
3. Click "Add Webhook"
4. Enter webhook URL: `https://your-store.com/webhooks/shiprocket`
5. Select events to receive:
   - Shipment Status Update
   - Shipment Delivered
   - Shipment Out for Delivery
   - Shipment Failed Delivery
   - Shipment Picked Up
   - Shipment In Transit

#### Webhook Payload

```json
{
  "awb_code": "AWB123456789",
  "shipment_id": 12345,
  "status": "DELIVERED",
  "shipment_status": "DELIVERED",
  "tracking_data": {
    "shipment_status": "DELIVERED",
    "shipment_track": [ /* tracking events */ ]
  }
}
```

#### Status Mapping

| Shiprocket Status | Shopenup Status | Description |
|-------------------|---------------|-------------|
| `NEW` | `not_shipped` | Order created |
| `PROCESSING` | `not_shipped` | Order processing |
| `READY_TO_SHIP` | `not_shipped` | Ready to ship |
| `PICKED_UP` | `shipped` | Picked up from sender |
| `IN_TRANSIT` | `shipped` | In transit |
| `OUT_FOR_DELIVERY` | `shipped` | Out for delivery |
| `DELIVERED` | `delivered` | Delivered to customer |
| `CANCELLED` | `canceled` | Order cancelled |
| `RTO` | `returned` | Return to origin |
| `LOST` | `canceled` | Package lost |
| `DAMAGED` | `canceled` | Package damaged |

### 6. Admin Operations

#### Create Shipment Manually

Create a shipment for an order that already exists in Shiprocket:

```
POST /admin/orders/:orderId/create-shipment
```

**Headers**:
```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Request Body**:
```json
{
  "courier_id": 123
}
```

**Response**:
```json
{
  "success": true,
  "shipment": {
    "shipment_id": 12345,
    "awb_code": "AWB123456789",
    "courier_name": "Delhivery",
    "status": "READY_TO_SHIP"
  }
}
```

#### Cancel Order

Cancel an order in Shiprocket:

```
POST /admin/orders/:orderId/cancel
```

**Headers**:
```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Request Body**:
```json
{
  "reason": "Customer requested cancellation"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Order cancelled successfully in Shiprocket"
}
```

## API Reference

### Fulfillment Service

#### `getFulfillmentOptions(data)`

Get available shipping options for a cart/order.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `items` | Array | Yes | Order items with variant_id, quantity, weight, dimensions |
| `shipping_address` | Object | Yes | Shipping address with postal_code, city, country_code |
| `pickup_address` | Object | No | Pickup address (uses default if not provided) |

**Returns**: Array of fulfillment options

**Example**:
```typescript
const options = await fulfillmentService.getFulfillmentOptions({
  items: [
    {
      variant_id: "variant_123",
      quantity: 1,
      weight: 0.5,
      length: 10,
      breadth: 10,
      height: 5
    }
  ],
  shipping_address: {
    address_1: "123 Main St",
    city: "Mumbai",
    country_code: "IN",
    postal_code: "400001"
  }
});
```

#### `createFulfillment(data, items, order)`

Create a fulfillment (shipment) for an order.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `order` | Object | Yes | Order object |
| `items` | Array | Yes | Items to fulfill |
| `shipping_address` | Object | Yes | Shipping address |
| `metadata` | Object | No | Optional metadata (courier_company_id, etc.) |

**Returns**: Fulfillment object with tracking information

**Example**:
```typescript
const fulfillment = await fulfillmentService.createFulfillment({
  order: orderObject,
  items: orderItems,
  shipping_address: shippingAddress,
  metadata: {
    courier_company_id: 123
  }
}, items, order);
```

#### `cancelFulfillment(fulfillment)`

Cancel a fulfillment in Shiprocket.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fulfillment` | Object | Yes | Fulfillment object |

**Returns**: Updated fulfillment object

#### `getFulfillmentDocuments(data)`

Get tracking information for a fulfillment.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `data` | Object | Yes | Fulfillment data with AWB code |

**Returns**: Tracking information

## Data Mapping

### Order to Shiprocket Mapping

| Shopenup/Shopenup Field | Shiprocket Field | Notes |
|----------------------|------------------|-------|
| `order.id` | `order_id` | Display ID or order ID |
| `order.created_at` | `order_date` | Formatted as YYYY-MM-DD |
| `shipping_address.address_1` | `billing_address` | Primary address |
| `shipping_address.address_2` | `billing_address_2` | Secondary address |
| `shipping_address.city` | `billing_city` | City name |
| `shipping_address.postal_code` | `billing_pincode` | Pincode |
| `shipping_address.province` | `billing_state` | State |
| `shipping_address.country_code` | `billing_country` | Mapped to country name |
| `shipping_address.phone` | `billing_phone` | Formatted phone number |
| `shipping_address.email` | `billing_email` | Email address |
| `items[].title` | `order_items[].name` | Product name |
| `items[].variant.sku` | `order_items[].sku` | SKU code |
| `items[].quantity` | `order_items[].units` | Quantity |
| `items[].unit_price` | `order_items[].selling_price` | Price per unit |
| `order.payment_status` | `payment_method` | Prepaid or COD |
| `items[].variant.weight` | `weight` | Total weight |
| `items[].variant.dimensions` | `length`, `breadth`, `height` | Package dimensions |

### Payment Method Mapping

- **Prepaid**: When payment status is `captured` or `paid`
- **COD**: When payment status is `awaiting` or `not_paid`, or when COD payment method is selected

## Troubleshooting

### Order Not Created in Shiprocket

**Symptoms**: Order placed but not appearing in Shiprocket dashboard.

**Solutions**:
1. Check environment variables are set correctly
2. Verify Shiprocket credentials are valid
3. Check application logs for errors
4. Ensure order subscriber is registered
5. Verify order has valid shipping address

### Shipping Rates Not Showing

**Symptoms**: No shipping options available during checkout.

**Solutions**:
1. Verify pickup location pincode is correct
2. Check delivery pincode is serviceable
3. Ensure items have weight/dimensions
4. Check Shiprocket API is accessible
5. Verify courier serviceability for the route

### Webhooks Not Working

**Symptoms**: Shipment status not updating automatically.

**Solutions**:
1. Verify webhook URL is publicly accessible
2. Check webhook is configured in Shiprocket dashboard
3. Review webhook logs for errors
4. Ensure webhook endpoint is handling POST requests
5. Check webhook signature validation (if implemented)

### AWB Code Not Generated

**Symptoms**: Fulfillment created but no AWB code.

**Solutions**:
1. Verify order exists in Shiprocket
2. Check shipment was created successfully
3. Ensure courier is assigned
4. Verify pickup location is configured
5. Check Shiprocket account has sufficient balance

### Tracking Not Working

**Symptoms**: Tracking endpoint returns error.

**Solutions**:
1. Verify AWB code is correct
2. Check AWB code exists in Shiprocket
3. Ensure tracking API is accessible
4. Verify authentication token is valid
5. Check tracking data is available in Shiprocket

## Best Practices

1. **Error Handling**: Always handle errors gracefully and log them for debugging
2. **Rate Limiting**: Be aware of Shiprocket API rate limits
3. **Webhook Security**: Implement webhook signature validation in production
4. **Testing**: Test in Shiprocket sandbox/staging environment first
5. **Monitoring**: Monitor order creation and shipment status regularly
6. **Backup**: Keep backup of order metadata in case of sync issues
7. **Retry Logic**: Implement retry logic for failed API calls
8. **Logging**: Log all Shiprocket API calls for debugging

## Support

For additional support:

- **Shiprocket API Docs**: [https://apidocs.shiprocket.in/](https://apidocs.shiprocket.in/)
- **Shiprocket Support**: Contact through dashboard
- **Module Issues**: Check application logs and error messages

## Changelog

### Version 1.0.0
- Initial release
- Order creation and synchronization
- Shipping rate calculation
- Shipment creation
- Tracking integration
- Webhook handling
- Admin operations

