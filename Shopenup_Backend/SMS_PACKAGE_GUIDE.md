# SMSIndiaHub Package Integration Guide

This guide explains how to use the linked `@shopenup/smsindiahub` package in your Akshar Ayurved e-commerce application.

## 📦 Package Setup

The SMSIndiaHub package has been published locally and linked to your main application using npm link.

### Package Structure
```
@shopenup/smsindiahub/
├── dist/
│   ├── index.js          # Main SMSIndiaHub client
│   ├── errors.js         # Error handling utilities
│   ├── templates.js      # DLT template functions
│   └── react.js          # React components (if needed)
├── examples/             # Usage examples
└── package.json
```

## 🚀 Usage in Your Application

### 1. Import the Package

```javascript
// Import main client
import { SmsIndiaHubClient } from '@shopenup/smsindiahub';

// Import error handling
import { describeSmsIndiaHubError } from '@shopenup/smsindiahub/errors';

// Import template functions
import { buildTemplatedMessage } from '@shopenup/smsindiahub/templates';
```

### 2. Initialize the Client

```javascript
const smsClient = new SmsIndiaHubClient({
  apiKey: process.env.SMSINDIAHUB_API_KEY,
  user: process.env.SMSINDIAHUB_USER,
  password: process.env.SMSINDIAHUB_PASSWORD,
  baseUrl: process.env.SMSINDIAHUB_BASE_URL || 'http://cloud.smsindiahub.in'
});
```

### 3. Send SMS

```javascript
// Basic SMS
const result = await smsClient.sendSMS({
  number: '91989xxxxxxx',
  text: 'Your message here',
  senderid: 'CDCLPL',
  channel: 'Trans',
  DCS: '0',
  flashsms: '0',
  route: ''
});

// DLT Templated SMS
const { text, dcs, templateId } = buildTemplatedMessage('ORDER_CONFIRMED', [
  'ORD-12345',    // Order ID
  '₹1,500',       // Order amount
  'Akshar Ayurved' // Store name
]);

const result = await smsClient.sendSMS({
  number: '91989xxxxxxx',
  text,
  senderid: 'CDCLPL',
  channel: 'Trans',
  DCS: dcs,
  flashsms: '0',
  route: '',
  PEId: process.env.PEID,
  TemplateId: templateId,
  DLT_TE_ID: templateId
});
```

## 🧪 Testing

### Available Test Scripts

```bash
# Test the linked package
npm run test:sms:linked

# Test basic SMS functionality
npm run test:sms

# Test single SMS
npm run test:sms:single
```

### Manual Testing

```bash
# Test linked package
node test-linked-package.js

# Test basic functionality
node test-smsindiahub.js

# Test single SMS
node test-single-sms.js
```

## 🔧 Environment Variables

Make sure your `.env` file contains:

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

## 📱 Order SMS Integration

The package is already integrated with your order placement system:

- **File**: `src/subscribers/order-sms-subscriber.ts`
- **Event**: `order.placed`
- **Functionality**: Automatically sends SMS when orders are placed

### How It Works

1. Customer places an order
2. `order.placed` event is triggered
3. SMS subscriber catches the event
4. Order details are retrieved
5. SMS is sent using the linked package
6. Customer receives confirmation SMS

## 🔄 Package Management

### Updating the Package

If you make changes to the SMSIndiaHub package:

```bash
# Navigate to package directory
cd ../shopenup-smsindiahub

# Rebuild if needed
npm run build

# The changes will be automatically reflected in the main app
# since it's linked
```

### Unlinking the Package

If you need to unlink the package:

```bash
# In the main app directory
npm unlink @shopenup/smsindiahub

# In the package directory
npm unlink
```

### Re-linking the Package

```bash
# In the package directory
npm link

# In the main app directory
npm link @shopenup/smsindiahub
```

## 📋 Available Templates

The package includes these DLT templates:

- `ORDER_CONFIRMED` - Order confirmation
- `ORDER_SHIPPED` - Order shipped notification
- `ORDER_DELIVERED` - Order delivered notification
- `ORDER_CANCELLED` - Order cancellation

## 🐛 Troubleshooting

### Common Issues

1. **Module not found**: Make sure the package is properly linked
2. **Environment variables**: Check your `.env` file
3. **Phone number format**: Ensure numbers are in 91XXXXXXXXXX format
4. **API errors**: Check your SMSIndiaHub credentials

### Debug Mode

Enable debug logging by setting:

```env
DEBUG=smsindiahub:*
```

## 📞 Support

For issues with the SMSIndiaHub package:

1. Check the package documentation
2. Review the examples in `/examples` directory
3. Test with the provided test scripts
4. Check environment variable configuration

## 🎯 Next Steps

1. Test the integration with real orders
2. Customize SMS templates as needed
3. Add more SMS triggers (shipped, delivered, etc.)
4. Monitor SMS delivery and performance
