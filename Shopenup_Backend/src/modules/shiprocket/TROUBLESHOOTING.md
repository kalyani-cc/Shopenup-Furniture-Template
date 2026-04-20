# Shiprocket Provider Not Showing in Admin - Troubleshooting Guide

## Issue: Shiprocket Provider Not Appearing When Creating Shipping Options

If you're trying to create a shipping option in the admin panel but don't see Shiprocket as a provider option, follow these steps:

---

## Step 1: Verify Module Registration ✅

Check that the module is properly registered in `shopenup-config.js`:

```javascript
{
  resolve: '@shopenup/fulfillment',
  options: {
    providers: [
      {
        resolve: '@shopenup/fulfillment-manual',
        id: 'manual',
      },
      {
        resolve: './src/modules/shiprocket',  // ← Check this path
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

**Common Issues:**
- ❌ Wrong path: Should be `'./src/modules/shiprocket'` (relative to project root)
- ❌ Missing `id: 'shiprocket'`
- ❌ Module not in the `providers` array

---

## Step 2: Check Environment Variables 🔐

Verify your `.env` file has the required variables:

```bash
# Check if variables are set
echo $SHIPROCKET_EMAIL
echo $SHIPROCKET_PASSWORD
```

Or in PowerShell:
```powershell
Get-Content .env | Select-String "SHIPROCKET"
```

**Required Variables:**
- `SHIPROCKET_EMAIL` - Must be set
- `SHIPROCKET_PASSWORD` - Must be set

**If missing:** Add them to your `.env` file and restart the server.

---

## Step 3: Check Server Logs 📋

When the server starts, look for:

### ✅ Success Indicators:
```
info: Module loaded: fulfillment
info: Provider registered: shiprocket
```

### ❌ Error Indicators:
```
error: Failed to load module: fulfillment
error: Cannot find module './src/modules/shiprocket'
error: ShiprocketFulfillmentService: Options are required
error: Failed to initialize Shiprocket
```

**If you see errors:**
1. Check the error message
2. Verify the module path is correct
3. Ensure environment variables are loaded
4. Check if `@shopenup/logistic` package is installed

---

## Step 4: Verify Package Installation 📦

Ensure the `@shopenup/logistic` package is installed:

```bash
cd Akshar-Ayueved-App
npm list @shopenup/logistic
```

**If not installed:**
```bash
npm install
```

**If using local package:**
```bash
# Verify the link exists
cd Logistic
npm run build

cd ../Akshar-Ayueved-App
npm install
```

---

## Step 5: Restart the Server 🔄

After making any changes:

1. **Stop the server** (Ctrl+C)
2. **Clear any build cache** (if applicable)
3. **Restart the server:**
   ```bash
   npm run dev
   ```

**Important:** Environment variable changes require a server restart!

---

## Step 6: Verify Module Export 📤

Check that `src/modules/shiprocket/index.ts` exports correctly:

```typescript
import { ModuleProvider, Modules } from "@shopenup/framework/utils";
import ShiprocketFulfillmentService from "./service";
import shiprocketConfigLoader from "./loaders/shiprocket-config";

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [ShiprocketFulfillmentService],
  loaders: [shiprocketConfigLoader],
});
```

**Common Issues:**
- ❌ Service not exported
- ❌ Wrong module type (should be `Modules.FULFILLMENT`)
- ❌ Service class missing static properties

---

## Step 7: Verify Service Class Properties 🏷️

The service class must have these static properties:

```typescript
class ShiprocketFulfillmentService {
  static identifier = "shiprocket";      // ← Must match the 'id' in config
  static displayName = "Shiprocket";     // ← What shows in admin
  static defaultOptions = {};            // ← Default options
  // ...
}
```

**Check:** `src/modules/shiprocket/service.ts` has these properties.

---

## Step 8: Test Module Loading Manually 🧪

Create a test script to verify the module loads:

```typescript
// test-module-load.ts
import ShiprocketFulfillmentService from "./src/modules/shiprocket/service";

console.log("Identifier:", ShiprocketFulfillmentService.identifier);
console.log("Display Name:", ShiprocketFulfillmentService.displayName);
```

Run:
```bash
npx ts-node test-module-load.ts
```

**Expected Output:**
```
Identifier: shiprocket
Display Name: Shiprocket
```

---

## Step 9: Check Admin Panel Location 📍

In the admin panel, the provider should appear when:

1. **Creating a Shipping Option:**
   - Go to Settings → Shipping Options
   - Click "Add Shipping Option"
   - Look for "Shiprocket" in the provider dropdown

2. **Creating a Fulfillment:**
   - Go to Orders → Select an order
   - Click "Create Fulfillment"
   - Look for "Shiprocket" in the provider dropdown

**Note:** The provider might be called "Shiprocket" or "shiprocket" depending on how it's displayed.

---

## Step 10: Check Browser Console 🌐

Open browser developer tools (F12) and check:

1. **Network Tab:** Look for API calls to fulfillment providers
2. **Console Tab:** Look for JavaScript errors
3. **Application Tab:** Check if data is being loaded

**Common Issues:**
- API returning 500 error
- Provider list not loading
- JavaScript errors preventing UI from rendering

---

## Common Solutions 🔧

### Solution 1: Fix Module Path

If the path is wrong in `shopenup-config.js`:

```javascript
// Wrong:
resolve: '@shopenup/shiprocket'

// Correct:
resolve: './src/modules/shiprocket'
```

### Solution 2: Fix Environment Variables

If variables aren't loading:

```javascript
// In shopenup-config.js, add explicit check:
options: {
  email: process.env.SHIPROCKET_EMAIL || "",
  password: process.env.SHIPROCKET_PASSWORD || "",
  // ...
}
```

### Solution 3: Clear Cache and Rebuild

```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Rebuild Logistic package
cd ../Logistic
npm run build

# Restart server
cd ../Akshar-Ayueved-App
npm run dev
```

### Solution 4: Check File Permissions

Ensure the module files are readable:

```bash
# On Linux/Mac
chmod -R 755 src/modules/shiprocket

# On Windows, check file properties
```

---

## Still Not Working? 🆘

If the provider still doesn't appear:

1. **Check Server Logs:** Look for any errors during startup
2. **Verify Framework Version:** Ensure you're using a compatible Shopenup version
3. **Compare with Manual Provider:** Check if `@shopenup/fulfillment-manual` appears (it should)
4. **Check Module Registration:** Verify other modules are loading correctly
5. **Test with Minimal Config:** Try with just email and password, no other options

---

## Quick Diagnostic Checklist ✅

- [ ] Module path is correct in `shopenup-config.js`
- [ ] Environment variables are set in `.env`
- [ ] Server has been restarted after changes
- [ ] `@shopenup/logistic` package is installed
- [ ] Service class has `identifier`, `displayName`, `defaultOptions`
- [ ] No errors in server logs
- [ ] Module exports correctly in `index.ts`
- [ ] Browser console shows no errors
- [ ] Other providers (like "manual") are visible

---

## Expected Behavior ✅

When everything is working correctly:

1. **Server starts** without errors
2. **Module loads** successfully
3. **Provider appears** in admin panel dropdowns
4. **You can select** "Shiprocket" when creating shipping options
5. **Shipping rates** can be calculated
6. **Orders** can be fulfilled with Shiprocket

---

**Last Updated:** 2024-01-17

