# Google Analytics 4 Data API Setup Guide

## Overview

The live stats widget now fetches data directly from Google Analytics 4 using **OAuth 2.0 with your existing credentials**. No service account needed!

## ✅ What's Already Configured

You already have these in your `.env` file:

- ✅ `GOOGLE_CLIENT_ID`
- ✅ `GOOGLE_CLIENT_SECRET`
- ✅ `GOOGLE_REFRESH_TOKEN`
- ✅ `GA_MEASUREMENT_ID`

**That's all you need!** The API will use these existing OAuth credentials.

---

## How It Works

### Authentication Flow

1. **OAuth 2.0** - Uses your existing `GOOGLE_REFRESH_TOKEN` to get access tokens
2. **GA4 Data API** - Authenticated client fetches analytics data
3. **Property ID** - Automatically derived from `GA_MEASUREMENT_ID` (G-S24BC0HY77)

### Data Fetched

#### From GA4 Realtime Report (Last 30 minutes)

- `activeUsers` - Users currently on your site

#### From GA4 Standard Report (Last 24 hours)

- `totalUsers` - Total unique users
- `newUsers` - New user signups
- Custom events: `practice_started`, `practice_completed`
  - Filtered by `skill_type` custom dimension (Speaking, Writing, Listening, Reading)

---

## Setup Steps

### Step 1: Enable Google Analytics Data API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (the one associated with your OAuth credentials)
3. Go to **APIs & Services** > **Library**
4. Search for "**Google Analytics Data API**"
5. Click **Enable**

### Step 2: Verify OAuth Scopes

Your OAuth token needs the analytics scope. If you encounter permission errors, you may need to regenerate your refresh token with the correct scope:

**Required scope:**

```
https://www.googleapis.com/auth/analytics.readonly
```

If you need to regenerate:

1. Go to [Google OAuth Playground](https://developers.google.com/oauthplayground/)
2. Click settings ⚙️ (top right)
3. Check "Use your own OAuth credentials"
4. Enter your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
5. In Step 1, select: **Google Analytics API v3** > `https://www.googleapis.com/auth/analytics.readonly`
6. Click "Authorize APIs"
7. In Step 2, click "Exchange authorization code for tokens"
8. Copy the new `refresh_token` to your `.env` file

---

## Testing

### Test the Endpoint

Start your dev server and visit the endpoint:

```bash
npm run dev

# Visit in browser:
http://localhost:3000/api/analytics/live-stats
```

**Expected Response:**

```json
{
  "success": true,
  "stats": {
    "onlineUsers": 150,
    "recentSignups": 25,
    "practicingUsers": 60,
    "recentPractices": 60,
    "skillBreakdown": {
      "Speaking": 15,
      "Writing": 12,
      "Listening": 18,
      "Reading": 15
    }
  },
  "timestamp": "2026-02-06T...",
  "source": "google_analytics_4_oauth"
}
```

**Check Server Console:**

```
[GA4 Live Stats - OAuth] {
  activeUsersNow: 150,
  totalUsers24h: 500,
  newUsers24h: 25,
  totalPracticing: 60,
  skillBreakdown: { Speaking: 15, Writing: 12, ... }
}
```

### Verify in Google Analytics

1. Go to [Google Analytics](https://analytics.google.com/)
2. Select your property: **CELPIP Practice Test**
3. Go to **Reports** > **Realtime**
4. Compare the numbers with your API response

---

## Troubleshooting

### Error: "GA_MEASUREMENT_ID not configured"

**Fix:** Make sure `GA_MEASUREMENT_ID` is set in `.env`:

```env
GA_MEASUREMENT_ID="G-S24BC0HY77"
```

### Error: "Request had insufficient authentication scopes"

**Cause:** Your OAuth refresh token doesn't have the analytics scope.

**Fix:** Regenerate refresh token with `https://www.googleapis.com/auth/analytics.readonly` scope (see Step 2 above).

### Error: "User does not have sufficient permissions"

**Cause:** The Google account associated with your OAuth token doesn't have access to the GA4 property.

**Fix:**

1. Go to [Google Analytics](https://analytics.google.com/)
2. **Admin** > **Property Access Management**
3. Verify your Google account (email) has at least **Viewer** role

### Error: "Property not found"

**Cause:** The measurement ID is incorrect or doesn't exist.

**Fix:** Verify `GA_MEASUREMENT_ID="G-S24BC0HY77"` is correct in GA4 settings.

### No Data Showing

**Check:**

1. GA4 is receiving events (go to GA4 > Reports > Realtime)
2. Custom dimension `skill_type` is configured in GA4:
   - Go to **Admin** > **Data display** > **Custom definitions**
   - Should see `skill_type` as a custom dimension
3. Events `practice_started`/`practice_completed` are being sent from your app

---

## Benefits

✅ **No New Service Account** - Uses existing OAuth credentials  
✅ **Real-Time Data** - GA4 realtime reports update instantly  
✅ **Single Source of Truth** - All data from GA4  
✅ **No Database Load** - Faster API responses  
✅ **Consistent with GTM** - Same tracking pipeline  
✅ **Better User Deduplication** - GA4 handles this properly

---

## Environment Variables Reference

```env
# These are already in your .env file:
GOOGLE_CLIENT_ID="89106468712-i2vg4djiunappgem7js7afcd4co7luln.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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"
GOOGLE_REFRESH_TOKEN="1//03Aet3XkPNXkeCgYIARAAGAMSNwF-L9IrI_olOUI5RHODK3A5QReUAV7v5YXiZfEfINjQ7FH50y_JvNSrV4qkpYtZa-cZGc2gLFM"
GA_MEASUREMENT_ID="G-S24BC0HY77"
```

No additional environment variables needed!

---

## Next Steps

1. ✅ Enable **Google Analytics Data API** in Google Cloud Console
2. ✅ Verify OAuth token has analytics scope (regenerate if needed)
3. ✅ Test the endpoint: `http://localhost:3000/api/analytics/live-stats`
4. ✅ Check console logs for `[GA4 Live Stats - OAuth]`
5. ✅ Deploy and verify on production

Once the API is enabled and tested, your live stats widget will show **real Google Analytics data**! 🎉

The only thing left is to import GTM_workspace.json into your GTM workspace and mark sign_up, begin_checkout, purchase, and subscription_renewal as conversions in GA4.
