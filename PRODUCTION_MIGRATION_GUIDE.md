# Excel Computers — WhatsApp Business Cloud API Production Migration Guide

This guide documents the exact steps to migrate from the **Meta Test Environment** to the **Excel Computers Production Number** via configuration updates only.

> [!NOTE]
> **Zero Code Modifications Required**: The application's provider architecture (`WhatsAppDispatchEngine`, `IWhatsAppProvider`, `MetaWhatsAppProvider`, and serverless gateway `/api/whatsapp/send`) is designed to switch to production numbers via environment variables alone.

---

## 📋 Production Migration Checklist

```
[ Step 1: Meta Business Verification ]
                 ↓
[ Step 2: Add Production Phone Number ]
                 ↓
[ Step 3: Generate System User Token ]
                 ↓
[ Step 4: Update Environment Variables ]
                 ↓
[ Step 5: Configure Webhook Endpoint ]
                 ↓
[ Step 6: Execute Health Check ]
```

---

### Step 1: Meta Business Verification
1. Log into [Meta Business Suite / Business Manager](https://business.facebook.com/).
2. Navigate to **Business Settings → Security Center**.
3. Complete **Business Verification** for *Excel Computers Kolhapur* (submit registration documents / utility bill).
4. Wait for Meta's verification approval badge.

---

### Step 2: Add & Register Production Phone Number
1. In Meta Developer Portal, go to your App ➔ **WhatsApp ➔ API Setup**.
2. Under **Step 5: Add a Phone Number**, click **Add Phone Number**.
3. Enter official Excel Computers phone number (e.g. `+91 98230 45678`).
4. Complete OTP verification via SMS / voice call.
5. Record the generated **Production Phone Number ID**.

---

### Step 3: Generate Permanent System User Access Token
1. Go to **Business Settings ➔ System Users**.
2. Create or select a System User (Role: *Admin*).
3. Assign your WhatsApp App asset to the System User.
4. Click **Generate New Token**.
5. Select permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
6. Set token expiration to **Never** (Permanent Access Token).
7. Copy and securely store the generated token.

---

### Step 4: Update Production Environment Variables
In your hosting dashboard (Vercel / Server Environment), update the environment variables:

```bash
# Replace Meta Test Access Token with System User Permanent Token
WHATSAPP_ACCESS_TOKEN=EAAG...your_permanent_production_system_user_token...

# Replace Meta Test Phone Number ID with Production Phone Number ID
WHATSAPP_PHONE_NUMBER_ID=109283749201938

# Production WhatsApp Business Account (WABA) ID
WHATSAPP_WABA_ID=104928374920193

# Graph API Version (defaults to v25.0)
META_GRAPH_API_VERSION=v25.0

# Public Production Origin
APP_PUBLIC_URL=https://courses.excelcomputers.info
```

---

### Step 5: Configure Webhooks (Optional Status Tracking)
1. In Meta Developer Portal, go to **WhatsApp ➔ Configuration**.
2. Set Callback URL: `https://courses.excelcomputers.info/api/whatsapp/webhook`
3. Enter your Verify Token.
4. Subscribe to webhook field: `messages`.
5. Webhook status events (`sent`, `delivered`, `read`, `failed`) will automatically correlate using the stored `wamid` message IDs.

---

### Step 6: Verify Production Health Status
After deploying the new environment variables, verify readiness by visiting:

```http
GET https://courses.excelcomputers.info/api/health
```

Expected Response:
```json
{
  "success": true,
  "message": "System & WhatsApp Gateway Health Status",
  "data": {
    "status": "healthy",
    "provider": "Meta WhatsApp Business Cloud API",
    "apiVersion": "v25.0",
    "whatsappConfigured": true,
    "hasAccessToken": true,
    "hasPhoneNumberId": true,
    "hasWabaId": true,
    "appPublicUrl": "https://courses.excelcomputers.info"
  }
}
```

---

## 🛡️ Summary of Zero-Code Migration Guarantee
- ❌ No source code changes required.
- ❌ No refactoring of `WhatsAppDispatchEngine` or UI components.
- ✅ 100% configuration-driven production promotion.
