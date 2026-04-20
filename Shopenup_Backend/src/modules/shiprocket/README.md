# Shiprocket Fulfillment Provider

A comprehensive Shiprocket integration module for Shopenup/Shopenup that provides end-to-end logistics management including order fulfillment, shipping rate calculation, tracking, and webhook handling.

## Overview

This module integrates Shiprocket's logistics platform with your Shopenup/Shopenup e-commerce application, enabling you to:

- **Automatically create orders** in Shiprocket when orders are placed
- **Calculate shipping rates** during checkout
- **Create shipments** with AWB codes
- **Track shipments** in real-time
- **Handle webhooks** for shipment status updates
- **Manage returns** and cancellations

## Installation

The module is already integrated into your application. Ensure the `@shopenup/logistic` package is installed:

```bash
npm install @shopenup/logistic
```

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```env
# Shiprocket API Credentials
SHIPROCKET_EMAIL=your-email@example.com
SHIPROCKET_PASSWORD=your-password

# Optional Configuration
SHIPROCKET_BASE_URL=https://apiv2.shiprocket.in/v1/external
SHIPROCKET_TIMEOUT=30000
SHIPROCKET_RETRY_ATTEMPTS=3
SHIPROCKET_RETRY_DELAY=1000

# Default Pickup Location (JSON format)
SHIPROCKET_PICKUP_LOCATION={"pickup_location":"Main Warehouse","name":"Store Owner","email":"your-email@example.com","phone":"9876543210","address":"123 Main Street","city":"Mumbai","state":"Maharashtra","country":"India","pin_code":"400001"}
```

### Module Registration

The module is registered in `shopenup-config.js`:

```javascript
{
  resolve: '@shopenup/shopenup/fulfillment',
  options: {
    providers: [
      {
        resolve: './src/modules/shiprocket',
        id: 'shiprocket',
        options: {
          email: process.env.SHIPROCKET_EMAIL,
          password: process.env.SHIPROCKET_PASSWORD,
          // ... other options
        },
      }
    ],
  },
}
```

## Features

### 1. Automatic Order Creation

When an order is placed, the module automatically:

- Creates the order in Shiprocket
- Maps order data from Shopenup format to Shiprocket format
- Stores Shiprocket order ID and shipment ID in order metadata

**Subscriber**: `src/modules/shiprocket/subscribers/order-subscriber.ts`

### 2. Shipping Rate Calculation

During checkout, the module:

- Fetches available couriers for the pickup and delivery pincodes
- Calculates shipping rates based on weight and dimensions
- Returns multiple courier options with pricing

**Method**: `getFulfillmentOptions()`

### 3. Shipment Creation

When a fulfillment is created:

- Creates a shipment in Shiprocket
- Generates AWB (Airway Bill) code
- Updates fulfillment with tracking information

**Subscriber**: `src/modules/shiprocket/subscribers/fulfillment-subscriber.ts`

### 4. Tracking

#### Public Tracking API

Customers can track their shipments without authentication:

```
GET /store/tracking/:awbCode
```

**Example**:
```bash
curl https://your-store.com/store/tracking/AWB123456789
```

#### Admin Tracking API

Admins can track any order:

```
GET /admin/tracking/:orderId
```

**Example**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-store.com/admin/tracking/order_123
```

### 5. Webhook Handling

The module handles Shiprocket webhooks for real-time status updates:

```
POST /webhooks/shiprocket
```

**Supported Events**:
- `NEW` - Order created
- `PROCESSING` - Order processing
- `READY_TO_SHIP` - Ready to ship
- `PICKED_UP` - Picked up
- `IN_TRANSIT` - In transit
- `OUT_FOR_DELIVERY` - Out for delivery
- `DELIVERED` - Delivered
- `CANCELLED` - Cancelled
- `RTO` - Return to origin

**Webhook Configuration**:

1. Log in to your Shiprocket dashboard
2. Go to Settings → Webhooks
3. Add webhook URL: `https://your-store.com/webhooks/shiprocket`
4. Select events to receive

### 6. Admin Operations

#### Create Shipment

Manually create a shipment for an order:

```
POST /admin/orders/:orderId/create-shipment
```

**Request Body**:
```json
{
  "courier_id": 123
}
```

#### Cancel Order

Cancel an order in Shiprocket:

```
POST /admin/orders/:orderId/cancel
```

**Request Body**:
```json
{
  "reason": "Customer requested cancellation"
}
```

## Usage Examples

### Creating a Fulfillment

```typescript
import { FulfillmentService } from "@shopenup/framework";

const fulfillmentService = container.resolve("fulfillmentService");

const fulfillment = await fulfillmentService.createFulfillment({
  order_id: "order_123",
  provider_id: "shiprocket",
  items: [
    {
      id: "item_123",
      quantity: 1,
    },
  ],
  shipping_option_id: "shiprocket_123",
  metadata: {
    courier_company_id: 123,
  },
});
```

### Getting Shipping Options

```typescript
const fulfillmentService = container.resolve("fulfillmentService");

const options = await fulfillmentService.getFulfillmentOptions({
  items: [
    {
      variant_id: "variant_123",
      quantity: 1,
      weight: 0.5,
    },
  ],
  shipping_address: {
    address_1: "123 Main St",
    city: "Mumbai",
    country_code: "IN",
    postal_code: "400001",
  },
});
```

## Data Mapping

### Order Mapping

The module automatically maps Shopenup/Shopenup order data to Shiprocket format:

| Shopenup Field | Shiprocket Field |
|--------------|------------------|
| `order.id` | `order_id` |
| `shipping_address.address_1` | `billing_address` |
| `shipping_address.postal_code` | `billing_pincode` |
| `items[].title` | `order_items[].name` |
| `items[].variant.sku` | `order_items[].sku` |
| `items[].quantity` | `order_items[].units` |
| `items[].unit_price` | `order_items[].selling_price` |
| `payment_status` | `payment_method` (Prepaid/COD) |

### Status Mapping

Shiprocket statuses are mapped to Shopenup fulfillment statuses:

| Shiprocket Status | Shopenup Status |
|-------------------|---------------|
| `NEW`, `PROCESSING`, `READY_TO_SHIP` | `not_shipped` |
| `PICKED_UP`, `IN_TRANSIT`, `OUT_FOR_DELIVERY` | `shipped` |
| `DELIVERED` | `delivered` |
| `CANCELLED`, `LOST`, `DAMAGED` | `canceled` |
| `RTO` | `returned` |

## Error Handling

The module includes comprehensive error handling:

- **Authentication errors**: Automatically retries with token refresh
- **Network errors**: Implements retry logic with exponential backoff
- **API errors**: Maps to user-friendly error messages
- **Validation errors**: Validates data before sending to Shiprocket

## Testing

### Test Order Creation

1. Place a test order in your store
2. Check order metadata for `shiprocket_order_id` and `shiprocket_shipment_id`
3. Verify order appears in Shiprocket dashboard

### Test Tracking

1. Create a fulfillment for an order
2. Get the AWB code from fulfillment data
3. Test public tracking: `/store/tracking/{awbCode}`
4. Test admin tracking: `/admin/tracking/{orderId}`

### Test Webhooks

1. Configure webhook URL in Shiprocket dashboard
2. Update shipment status in Shiprocket
3. Verify fulfillment status updates in Shopenup

## Troubleshooting

### Order Not Created in Shiprocket

- Check environment variables are set correctly
- Verify Shiprocket credentials are valid
- Check application logs for errors
- Ensure order subscriber is registered

### Shipping Rates Not Showing

- Verify pickup location pincode is correct
- Check delivery pincode is serviceable
- Ensure items have weight/dimensions
- Check Shiprocket API is accessible

### Webhooks Not Working

- Verify webhook URL is publicly accessible
- Check webhook is configured in Shiprocket dashboard
- Review webhook logs for errors
- Ensure webhook endpoint is handling POST requests

## API Reference

### Fulfillment Service Methods

#### `getFulfillmentOptions(data)`

Get available shipping options for a cart/order.

**Parameters**:
- `data.items`: Array of order items
- `data.shipping_address`: Shipping address
- `data.pickup_address`: Optional pickup address

**Returns**: Array of fulfillment options

#### `createFulfillment(data, items, order)`

Create a fulfillment (shipment) for an order.

**Parameters**:
- `data.order`: Order object
- `data.items`: Array of items to fulfill
- `data.shipping_address`: Shipping address
- `data.metadata`: Optional metadata (courier_id, etc.)

**Returns**: Fulfillment object with tracking information

#### `cancelFulfillment(fulfillment)`

Cancel a fulfillment in Shiprocket.

**Parameters**:
- `fulfillment`: Fulfillment object

**Returns**: Updated fulfillment object

#### `getFulfillmentDocuments(data)`

Get tracking information for a fulfillment.

**Parameters**:
- `data`: Fulfillment data with AWB code

**Returns**: Tracking information

## Support

For issues or questions:

1. Check the [Shiprocket API Documentation](https://apidocs.shiprocket.in/)
2. Review application logs
3. Contact Shiprocket support for API-related issues
4. Open an issue in the project repository

## License

MIT

