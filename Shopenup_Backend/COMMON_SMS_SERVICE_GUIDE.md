# Common SMS Service Guide

This guide explains how to use the common SMS service for all order events in your Akshar Ayurved e-commerce application.

## 🎯 Overview

The common SMS service provides a unified way to send SMS notifications for all order events without duplicating code. It handles:

- Order confirmation SMS
- Order shipped SMS  
- Order delivered SMS
- Order cancelled SMS
- Custom SMS messages

## 📁 File Structure

```
src/modules/sms-service/
└── index.ts                 # Main SMS service module

src/subscribers/
├── order-sms-subscriber.ts  # Order placed event handler
├── order-shipped.ts         # Order shipped event handler
├── order-delivered.ts       # Order delivered event handler
└── order-cancelled.ts       # Order cancelled event handler
```

## 🚀 Quick Start

### Import the Service

```typescript
import { 
  sendOrderConfirmationSMS,
  sendOrderShippedSMS, 
  sendOrderDeliveredSMS,
  sendOrderCancelledSMS,
  sendCustomSMS,
  smsService,
  type SMSData 
} from '../modules/sms-service';
```

### Basic Usage

```typescript
// Send order confirmation SMS
const result = await sendOrderConfirmationSMS(phone, {
  orderId: 'ORD-123',
  orderAmount: '₹1,500',
  storeName: 'Akshar Ayurved',
  customerName: 'John'
});

// Send order shipped SMS with tracking
const result = await sendOrderShippedSMS(phone, {
  orderId: 'ORD-123',
  orderAmount: '₹1,500',
  storeName: 'Akshar Ayurved',
  customerName: 'John',
  trackingNumber: 'TRK123456789',
  trackingUrl: 'https://track.example.com/TRK123456789'
});
```

## 📋 Available Functions

### 1. Order Confirmation SMS

```typescript
sendOrderConfirmationSMS(phone: string, data: SMSData)
```

**When to use:** When an order is placed
**Event:** `order.placed`

### 2. Order Shipped SMS

```typescript
sendOrderShippedSMS(phone: string, data: SMSData)
```

**When to use:** When an order is shipped
**Event:** `shipment.created`

### 3. Order Delivered SMS

```typescript
sendOrderDeliveredSMS(phone: string, data: SMSData)
```

**When to use:** When an order is delivered
**Event:** `delivery.created`

### 4. Order Cancelled SMS

```typescript
sendOrderCancelledSMS(phone: string, data: SMSData)
```

**When to use:** When an order is cancelled
**Event:** `order.cancelled`

### 5. Custom SMS

```typescript
sendCustomSMS(phone: string, message: string)
```

**When to use:** For any custom message

## 📊 SMSData Interface

```typescript
interface SMSData {
  orderId: string;           // Order ID (required)
  orderAmount: string;       // Formatted amount (required)
  storeName?: string;        // Store name (optional)
  trackingNumber?: string;   // Tracking number (optional)
  trackingUrl?: string;      // Tracking URL (optional)
  customerName?: string;     // Customer name (optional)
}
```

## 🔧 Utility Functions

### Get Phone Number from Order

```typescript
const phone = smsService.getPhoneFromOrder(order);
// Returns phone from billing_address, shipping_address, or customer
```

### Format Order Amount

```typescript
const amount = smsService.formatOrderAmount(1500, '₹');
// Returns: "₹1500"
```

### Get Order Display ID

```typescript
const displayId = smsService.getOrderDisplayId(order);
// Returns display_id if available, otherwise order.id
```

### Format Phone Number

```typescript
const formatted = smsService.formatPhoneNumber('+919876543210');
// Returns: "919876543210"
```

## 📱 SMS Templates

The service supports both DLT templates and fallback messages:

### DLT Templates (Preferred)
- Uses registered templates for transactional messages
- Compliant with TRAI regulations
- Professional appearance

### Fallback Messages
- Simple text messages when DLT fails
- Still professional and informative
- Automatic fallback system

## 🧪 Testing

### Run All Tests

```bash
npm run test:sms:integration
```

### Individual Tests

```bash
# Test order confirmation
node -e "import('./test-sms-integration.js').then(m => m.testOrderConfirmation())"

# Test order shipped
node -e "import('./test-sms-integration.js').then(m => m.testOrderShipped())"

# Test order delivered
node -e "import('./test-sms-integration.js').then(m => m.testOrderDelivered())"

# Test custom SMS
node -e "import('./test-sms-integration.js').then(m => m.testCustomSMS())"
```

## 🔄 Integration Examples

### Order Placed Event

```typescript
// src/subscribers/order-sms-subscriber.ts
import { sendOrderConfirmationSMS, smsService, type SMSData } from '../modules/sms-service'

export default async function orderPlacedHandler({ event: { data }, container }) {
  const query = container.resolve("query")
  
  // Get order details
  const { data: [order] } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "total", "currency_code", "billing_address.*", "shipping_address.*"],
    filters: { id: data.id },
  })

  // Get phone number
  const phone = smsService.getPhoneFromOrder(order)
  if (!phone) return

  // Get currency
  const currencyModuleService = container.resolve("currency")
  const currency = await currencyModuleService.retrieveCurrency(order.currency_code)
  
  // Send SMS
  const smsData: SMSData = {
    orderId: smsService.getOrderDisplayId(order),
    orderAmount: smsService.formatOrderAmount(order.total, currency.symbol_native),
    storeName: 'Akshar Ayurved',
    customerName: order.billing_address?.first_name
  }

  const result = await sendOrderConfirmationSMS(phone, smsData)
  
  if (result.success) {
    console.log('Order confirmation SMS sent successfully')
  } else {
    console.error('Failed to send SMS:', result.error)
  }
}
```

### Order Shipped Event

```typescript
// src/subscribers/order-shipped.ts
import { sendOrderShippedSMS, smsService, type SMSData } from '../modules/sms-service'

export default async function orderShippedHandler({ event: { data }, container }) {
  // ... get fulfillment and order data ...
  
  const phone = smsService.getPhoneFromOrder(order)
  if (!phone) return

  const smsData: SMSData = {
    orderId: smsService.getOrderDisplayId(order),
    orderAmount: smsService.formatOrderAmount(order.total, currency.symbol_native),
    storeName: 'Akshar Ayurved',
    customerName: order.shipping_address?.first_name,
    trackingNumber: trackingNumber,
    trackingUrl: trackingUrl
  }

  const result = await sendOrderShippedSMS(phone, smsData)
  // ... handle result ...
}
```

## ⚙️ Configuration

### Environment Variables

```env
# Required
SMSINDIAHUB_API_KEY=your_api_key
SMSINDIAHUB_SENDERID=your_sender_id
SMSINDIAHUB_TEST_NUMBER=91989xxxxxxx

# Optional
SMSINDIAHUB_USER=your_username
SMSINDIAHUB_PASSWORD=your_password
SMSINDIAHUB_CHANNEL=Trans
SMSINDIAHUB_DCS=0
SMSINDIAHUB_FLASHSMS=0
SMSINDIAHUB_ROUTE=
SMSINDIAHUB_BASE_URL=http://cloud.smsindiahub.in

# For DLT templates
PEID=your_dlt_entity_id
```

## 🎯 Benefits

1. **No Code Duplication**: Single service for all SMS needs
2. **Consistent Interface**: Same API for all order events
3. **Automatic Fallback**: DLT templates with fallback messages
4. **Type Safety**: Full TypeScript support
5. **Easy Testing**: Comprehensive test suite
6. **Error Handling**: Robust error handling and logging
7. **Maintainable**: Centralized SMS logic

## 🔍 Error Handling

The service provides comprehensive error handling:

```typescript
const result = await sendOrderConfirmationSMS(phone, data)

if (result.success) {
  console.log('SMS sent successfully:', result.result)
} else {
  console.error('SMS failed:', result.error)
  // Handle error appropriately
}
```

## 📈 Monitoring

All SMS operations are logged:

- Successful sends
- Failed sends with error details
- Fallback usage
- Template failures

## 🚀 Future Enhancements

- SMS delivery status tracking
- SMS analytics and reporting
- A/B testing for message templates
- Multi-language support
- SMS scheduling

## 📞 Support

For issues with the SMS service:

1. Check the logs for error details
2. Verify environment variables
3. Test with the provided test scripts
4. Check SMSIndiaHub API status

The common SMS service is now ready to use across all your order events! 🎉
