import { channel } from 'diagnostics_channel';
import { resolve } from 'path';
import { optional } from 'zod';

const { loadEnv, defineConfig, Modules } = require('@shopenup/framework/utils');
const { ContainerRegistrationKeys } = require('@shopenup/framework');

loadEnv(process.env.NODE_ENV, process.cwd());

module.exports = defineConfig({
  admin: {
    backendUrl:
      process.env.BACKEND_URL ?? '',
    storefrontUrl: process.env.STOREFRONT_URL,
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS,
      adminCors: process.env.ADMIN_CORS,
      authCors: process.env.AUTH_CORS,
      jwtSecret: process.env.JWT_SECRET || 'supersecret',
      cookieSecret: process.env.COOKIE_SECRET || 'supersecret',
    },
  },
  // plugins: ["shopenup-plugin-razorpay-v2"],

  plugins: [
    {
      resolve: "@shopenup/shopenup-plugin-wishlist",
      options: {
      },
    },
    {
      resolve: "@shopenup/shopenup-plugin-blog",
      options: {
      }, // Add any options your plugin requires
    },
    {
      resolve: "@shopenup/shopenup-store-analytics",
      options: {
      },
    },
    // Product reviews temporarily disabled due to package unavailability
    {
      resolve: "@shopenup/shopenup-product-reviews",
      options: {
      },
    },
    {
      resolve: "@shopenup/shopenup-plugin-documents",
      options: {
      },
    },
    {
      resolve: "@shopenup/shopenup-plugin-doctor-appointment",
      options: {
      },
    },
  ],
  modules: [
    {
      resolve: '@shopenup/shopenup/cart',
    },
    {
      resolve: '@shopenup/shopenup/payment',
      options: {
        providers: [
          // {
          //   id: 'stripe',
          //   resolve: '@shopenup/shopenup/payment-stripe',
          //   options: {
          //     apiKey: process.env.STRIPE_API_KEY,
          //     webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
          //   },
          // },
          {
            resolve: "./src/modules/razorpay",
            id: "razorpay",
            options: {
              key_id:
                process?.env?.RAZORPAY_TEST_KEY_ID ??
                process?.env?.RAZORPAY_ID,
              key_secret:
                process?.env?.RAZORPAY_TEST_KEY_SECRET ??
                process?.env?.RAZORPAY_SECRET,
              razorpay_account:
                process?.env?.RAZORPAY_TEST_ACCOUNT ??
                process?.env?.RAZORPAY_ACCOUNT,
              automatic_expiry_period: 30 /* any value between 12minuts and 30 days expressed in minutes*/,
              manual_expiry_period: 20,
              refund_speed: "normal",
              webhook_secret:
                process?.env?.RAZORPAY_TEST_WEBHOOK_SECRET ??
                process?.env?.RAZORPAY_WEBHOOK_SECRET
            }
          }
        ],
      },
    },
    {
      resolve: '@shopenup/shopenup/fulfillment',
      options: {
        providers: [
          {
            resolve: '@shopenup/fulfillment-manual',
            id: 'manual',
          },
          {
            resolve: './src/modules/shiprocket',
            id: 'shiprocket',
            options: {
              email: process.env.SHIPROCKET_EMAIL,
              password: process.env.SHIPROCKET_PASSWORD,
              baseUrl: process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external',
              timeout: parseInt(process.env.SHIPROCKET_TIMEOUT || '30000'),
              retryAttempts: parseInt(process.env.SHIPROCKET_RETRY_ATTEMPTS || '3'),
              retryDelay: parseInt(process.env.SHIPROCKET_RETRY_DELAY || '1000'),
              defaultPickupLocation: process.env.SHIPROCKET_PICKUP_LOCATION ? JSON.parse(process.env.SHIPROCKET_PICKUP_LOCATION) : undefined,
            },
          }
        ],
      },
    },
    {
      resolve: "@shopenup/shopenup/file",
      options: {
        providers: [
          {
            resolve: "@shopenup/shopenup/file-local",
            id: "local",
            options: {
              upload_dir: "static",  // keeps uploads in /static folder
              backend_url: process.env.BACKEND_URL, // 👈 public URL for serving
            },
          },
        ],
      },
    },
    {
      resolve: "@shopenup/shopenup/notification",
      options: {
        providers: [
          {
            resolve:"@shopenup/notification-local",
            id:"local",
            options:{
              name:"Local Notification Provider",
              channels:["feed"],
            },
          },
          // # SMTP Notification - Only provider for email
          {
            resolve: "@shopenup/shopenup-plugin-smtp/providers/smtp",
            id: "notification-smtp",
            options: {
              channels: ["email"],
              fromEmail: process.env.SMTP_FROM,
              templatePath: "./src/notification-templates",
              transport: {
                host: process.env.SMTP_HOST || "smtp.gmail.com",
                port: process.env.SMTP_PORT || 465,
                secure: process.env.SMTP_SECURE || false,
                auth: {
                  user: process.env.SMTP_AUTH_USER,
                  pass: process.env.SMTP_AUTH_PASS,
                },
              },
            },
          },
          {
            resolve: "./src/modules/twilio-sms",
            id: "twilio-sms",
            options: {
              channels: ["sms"],
              accountSid: process.env.TWILIO_ACCOUNT_SID,
              authToken: process.env.TWILIO_AUTH_TOKEN,
              from: process.env.TWILIO_PHONE_NUMBER
              ,
            },
          },
        ],
      },
    },
    {
      resolve: "./src/modules/restock",
    },
    {
      resolve: "./src/modules/return-item-defect",
    },
    {
      resolve: "./src/modules/shiprocket-returns",
    },
  ],
});
