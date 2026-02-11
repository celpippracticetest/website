# Google Tag Manager Implementation Guide

## Overview

This guide covers the complete GTM implementation for CELPIP Practice Test platform, including all tracked events, testing procedures, and GTM container configuration.

## Implementation Summary

### What's Been Implemented

1. **Core Infrastructure**

   - GTM utility library (`src/lib/gtm.ts`)
   - TypeScript interfaces (`src/types/analytics.ts`)
   - Custom React hooks (`src/hooks/useTracking.ts`)
   - Environment variable configuration

2. **Automatic Tracking**

   - Page views (all route changes)
   - Active user heartbeat (every 30 seconds)

3. **Conversion Tracking**

   - Plan selection (select_item)
   - Checkout initiation (begin_checkout)
   - Purchase completion (purchase)
   - Plan page views (view_item_list)

4. **User Journey Tracking**

   - CTA clicks (Hero section)
   - Authentication events (sign-up, login, logout)
   - Modal interactions (Premium Plan, Upgrade, Continue Exam)
   - Navigation clicks (via TrackedLink component)

5. **Engagement Tracking**
   - FAQ accordion clicks
   - Chatbot interactions (Intercom)
   - Exam activities (via ActivityLogger)
   - Practice activities (via ActivityLogger)

## Event Reference

### Page View Events

**Event:** `page_view`

**Triggered:** On every route change

**Parameters:**

- `page_path` - Current page path
- `page_title` - Page title
- `user_id` - User ID (if authenticated)
- `user_plan` - User plan type (free/premium)
- `user_authenticated` - Boolean

**Implementation:** `PageViewTracker` component in layout

---

### E-commerce Events

#### View Item List

**Event:** `view_item_list`

**Triggered:** Plans page viewed

**Parameters:**

- `item_list_id` - "plans_page"
- `item_list_name` - "Pricing Plans"
- `items[]` - Array of plan items with:
  - `item_id` - Plan identifier
  - `item_name` - Plan title
  - `price` - Plan price
  - `item_brand` - "CELPIP Practice Test"
  - `item_category` - "Subscription"

#### Select Item

**Event:** `select_item`

**Triggered:** Plan card clicked

**Parameters:**

- Same structure as `view_item_list`
- Triggered before checkout begins

#### Begin Checkout

**Event:** `begin_checkout`

**Triggered:** Plan purchase button clicked

**Parameters:**

- `currency` - "CAD"
- `value` - Plan price
- `items[]` - Selected plan details

#### Purchase

**Event:** `purchase`

**Triggered:** Successful payment on success page

**Parameters:**

- `transaction_id` - Stripe invoice ID
- `currency` - Transaction currency
- `value` - Transaction amount
- `items[]` - Purchased items
- `coupon` - Referral code (if applicable)
- `user_data` - User details for Enhanced Conversions (email, phone, address)

---

### CTA Events

**Event:** `cta_click`

**Triggered:** Call-to-action button clicked

**Parameters:**

- `cta_text` - Button text (e.g., "Start Your Free Practice")
- `cta_location` - Location identifier (e.g., "hero_main", "hero_floating_bottom")

**Locations:**

- Hero main section
- Hero floating bottom button

---

### Authentication Events

#### Sign Up Initiated

**Event:** `sign_up_initiated`

**Triggered:** Sign-up modal/form opened

**Parameters:**

- `method` - Sign-up method (email, Google, etc.)
- `source` - Trigger source

#### Sign Up Completed

**Event:** `sign_up_completed`

**Triggered:** User registration successful

**Parameters:**

- `user_id` - New user ID
- `method` - Sign-up method used
- `user_data` - User details for Enhanced Conversions

#### Login Initiated

**Event:** `login_initiated`

**Triggered:** Login modal/form opened

**Parameters:**

- `method` - Login method

#### Login Completed

**Event:** `login_completed`

**Triggered:** User login successful

**Parameters:**

- `user_id` - User ID
- `method` - Login method

#### Logout

**Event:** `logout`

**Triggered:** User logs out

**Parameters:**

- `user_id` - User ID

---

### Modal Events

#### Modal Viewed

**Event:** `modal_viewed`

**Triggered:** Modal opened

**Parameters:**

- `modal_name` - Modal identifier
- `trigger_source` - What triggered the modal

**Tracked Modals:**

- Premium Plan Modal
- Upgrade Modal
- Continue Exam Modal

#### Modal Closed

**Event:** `modal_closed`

**Triggered:** Modal dismissed or closed

**Parameters:**

- `modal_name` - Modal identifier
- `user_action` - "dismissed" or "completed"

---

### Exam Events

All exam events are automatically tracked via `ActivityLogger` in `userActivity.ts`

#### Exam Started

**Event:** `exam_started`

**Parameters:**

- `exam_id` - Exam identifier
- `part_id` - Exam part (if applicable)
- `section_type` - Listening/Reading/Writing/Speaking
- `user_plan` - User's plan type

#### Exam Part Started

**Event:** `exam_part_started`

**Parameters:**

- `exam_id`
- `part_id`
- `section_type`

#### Exam Part Completed

**Event:** `exam_part_completed`

**Parameters:**

- `exam_id`
- `part_id`
- `section_type`
- `time_spent` - Seconds
- `score` - Achieved score

#### Exam Completed

**Event:** `exam_completed`

**Parameters:**

- `exam_id`
- `total_score`
- `time_spent`

#### Exam Results Viewed

**Event:** `exam_results_viewed`

**Parameters:**

- `exam_id`
- `score`

---

### Practice Events

All practice events are automatically tracked via `ActivityLogger` in `userActivity.ts`

#### Practice Started

**Event:** `practice_started`

**Parameters:**

- `practice_id`
- `skill_type` - Listening/Reading/Writing/Speaking
- `difficulty_level`

#### Practice Completed

**Event:** `practice_completed`

**Parameters:**

- `practice_id`
- `skill_type`
- `score`
- `time_spent`

#### Practice Results Viewed

**Event:** `practice_results_viewed`

**Parameters:**

- `practice_id`
- `skill_type`
- `score`

---

### Engagement Events

#### FAQ Click

**Event:** `faq_click`

**Triggered:** FAQ accordion opened

**Parameters:**

- `faq_question` - The question text
- `faq_category` - Question category

#### Chatbot Message Sent

**Event:** `chatbot_message_sent`

**Triggered:** Intercom chat opened

**Parameters:**

- `message_type` - "manual_open" or "auto_open"

---

## Testing Guide

### Prerequisites

1. **Browser Extensions:**

   - [Google Tag Assistant](https://tagassistant.google.com/)
   - [GTM/GA Debugger](https://chrome.google.com/webstore/detail/tag-assistant-legacy-by-g/kejbdjndbnbjgmefkgdddjlbokphdefk)

2. **Access:**
   - GTM container access (GTM-M24FJ7JC)
   - GA4 property access (G-S24BC0HY77)

### Testing Procedure

#### 1. Local Development Testing

```bash
# Start development server
npm run dev

# Open browser console
# Check for GTM debug logs: [GTM] Event pushed: {...}
```

#### 2. GTM Preview Mode

1. Go to GTM container: [https://tagmanager.google.com](https://tagmanager.google.com)
2. Click "Preview" button
3. Enter your development URL: `http://localhost:3000`
4. GTM Debug panel will appear

#### 3. Test Each Event Type

**Page Views:**

- Navigate between pages
- Check dataLayer for `page_view` events
- Verify `page_path` and `page_title` are correct

**E-commerce:**

1. Visit `/plans` page
2. Verify `view_item_list` fires
3. Click a plan card
4. Verify `select_item` fires
5. Click purchase button
6. Verify `begin_checkout` fires
7. Complete test purchase (use Stripe test mode)
8. Verify `purchase` fires on success page

**CTA Clicks:**

- Click "Start Your Free Practice" buttons
- Verify `cta_click` events with correct `cta_location`

**Modals:**

1. Trigger Premium Plan Modal
2. Verify `modal_viewed` fires
3. Close modal
4. Verify `modal_closed` fires

**FAQ:**

- Click FAQ accordions
- Verify `faq_click` events with question text

**Chatbot:**

- Click Beavo chat icon
- Verify `chatbot_message_sent` fires

#### 4. GA4 DebugView Testing

1. Go to GA4 property: [https://analytics.google.com](https://analytics.google.com)
2. Navigate to: Admin > DebugView
3. Perform test actions
4. Verify events appear in real-time with correct parameters

#### 5. Browser DevTools Testing

```javascript
// Open console and check dataLayer
console.log(window.dataLayer);

// Should show array of events like:
// [
//   {event: 'page_view', page_path: '/', ...},
//   {event: 'cta_click', cta_text: 'Start Your Free Practice', ...},
//   ...
// ]
```

### Testing Checklist

- [ ] Page views tracking on all routes
- [ ] E-commerce funnel (view → select → checkout → purchase)
- [ ] CTA clicks from Hero section
- [ ] Modal open/close tracking
- [ ] FAQ accordion clicks
- [ ] Chatbot interactions
- [ ] Authentication events (sign-up, login)
- [ ] Exam start/complete via ActivityLogger
- [ ] Practice start/complete via ActivityLogger
- [ ] User context enrichment (userId, planType)

---

## GTM Container Configuration

### Required Setup in GTM Dashboard

#### 1. Variables

Create these Data Layer Variables:

| Variable Name       | Data Layer Variable Name | Type                |
| ------------------- | ------------------------ | ------------------- |
| DL - Event          | event                    | Data Layer Variable |
| DL - User ID        | userId                   | Data Layer Variable |
| DL - User Plan      | userPlan                 | Data Layer Variable |
| DL - Page Path      | page_path                | Data Layer Variable |
| DL - Page Title     | page_title               | Data Layer Variable |
| DL - CTA Text       | cta_text                 | Data Layer Variable |
| DL - CTA Location   | cta_location             | Data Layer Variable |
| DL - Exam ID        | exam_id                  | Data Layer Variable |
| DL - Practice ID    | practice_id              | Data Layer Variable |
| DL - Transaction ID | transaction_id           | Data Layer Variable |
| DL - Currency       | currency                 | Data Layer Variable |
| DL - Value          | value                    | Data Layer Variable |
| DL - Items          | items                    | Data Layer Variable |
| DL - Modal Name     | modal_name               | Data Layer Variable |
| DL - FAQ Question   | faq_question             | Data Layer Variable |

#### 2. Triggers

Create these Custom Event Triggers:

| Trigger Name            | Event Name           | Trigger Type |
| ----------------------- | -------------------- | ------------ |
| CE - Page View          | page_view            | Custom Event |
| CE - CTA Click          | cta_click            | Custom Event |
| CE - Select Item        | select_item          | Custom Event |
| CE - Begin Checkout     | begin_checkout       | Custom Event |
| CE - Purchase           | purchase             | Custom Event |
| CE - View Item List     | view_item_list       | Custom Event |
| CE - Sign Up Initiated  | sign_up_initiated    | Custom Event |
| CE - Sign Up Completed  | sign_up_completed    | Custom Event |
| CE - Login Completed    | login_completed      | Custom Event |
| CE - Modal Viewed       | modal_viewed         | Custom Event |
| CE - Exam Started       | exam_started         | Custom Event |
| CE - Exam Completed     | exam_completed       | Custom Event |
| CE - Practice Started   | practice_started     | Custom Event |
| CE - Practice Completed | practice_completed   | Custom Event |
| CE - FAQ Click          | faq_click            | Custom Event |
| CE - Chatbot Message    | chatbot_message_sent | Custom Event |

#### 3. Tags

##### GA4 Configuration Tag

**Tag Type:** Google Analytics: GA4 Configuration

**Configuration:**

- Measurement ID: `{{DL - GA Measurement ID}}` or hardcode `G-S24BC0HY77`
- Send a page view event: False (handled by custom events)

**User Properties:**

- user_id: `{{DL - User ID}}`
- user_plan: `{{DL - User Plan}}`

**Trigger:** All Pages

##### GA4 Event Tags

Create separate GA4 Event tags for each event type:

**Example: GA4 - Page View**

- Tag Type: Google Analytics: GA4 Event
- Configuration Tag: `{{GA4 Configuration}}`
- Event Name: `page_view`
- Event Parameters:
  - page_path: `{{DL - Page Path}}`
  - page_title: `{{DL - Page Title}}`
  - user_id: `{{DL - User ID}}`
  - user_plan: `{{DL - User Plan}}`
- Trigger: CE - Page View

**Example: GA4 - Purchase**

- Tag Type: Google Analytics: GA4 Event
- Configuration Tag: `{{GA4 Configuration}}`
- Event Name: `purchase`
- Event Parameters:
  - transaction_id: `{{DL - Transaction ID}}`
  - currency: `{{DL - Currency}}`
  - value: `{{DL - Value}}`
  - items: `{{DL - Items}}`
- Trigger: CE - Purchase

**Repeat for all event types listed above**

##### Google Ads Remarketing Tag (Optional)

**Tag Type:** Google Ads Remarketing

**Configuration:**

- Conversion ID: Your Google Ads ID
- Trigger: All Pages

##### Facebook Pixel Tag (Optional)

**Tag Type:** Custom HTML

**HTML:**

```html
<script>
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(
    window,
    document,
    "script",
    "https://connect.facebook.net/en_US/fbevents.js"
  );
  fbq("init", "YOUR_PIXEL_ID");
  fbq("track", "PageView");
</script>
```

**Trigger:** All Pages

#### 4. Built-in Variables

Enable these Built-in Variables:

- Click Element
- Click Classes
- Click ID
- Click URL
- Click Text
- Page URL
- Page Path
- Referrer

---

## Advanced Configuration

### Enhanced Conversions (Google Ads)

To support Google Ads Enhanced Conversions, send user data (email, phone, address) with conversion events (`purchase`, `begin_checkout`, `sign_up_completed`).

**Parameters:**

- `user_data` - Object containing:
  - `email`
  - `phone_number`
  - `address` (first_name, last_name, street, city, region, postal_code, country)

**Example:**

```typescript
trackEcommerce.purchase(
  transactionId,
  items,
  currency,
  value,
  coupon,
  {
    email: user.email,
    phone_number: user.phone,
    address: {
      first_name: user.firstName,
      last_name: user.lastName,
      // ...
    }
  }
);
```

### Consent Mode

The implementation includes default consent mode (all denied). To update consent based on user preferences:

```javascript
import { updateConsent } from "@/lib/gtm";

// When user accepts cookies
updateConsent({
  analytics_storage: "granted",
  ad_storage: "granted",
  ad_user_data: "granted",
  ad_personalization: "granted",
});
```

### Custom Dimensions (GA4)

Recommended custom dimensions to create in GA4:

1. **User Plan Type**

   - Scope: User
   - Parameter: user_plan
   - Description: Free or Premium user

2. **Exam ID**

   - Scope: Event
   - Parameter: exam_id
   - Description: Unique exam identifier

3. **Practice ID**

   - Scope: Event
   - Parameter: practice_id
   - Description: Unique practice identifier

4. **Skill Type**

   - Scope: Event
   - Parameter: skill_type
   - Description: Listening/Reading/Writing/Speaking

5. **CTA Location**
   - Scope: Event
   - Parameter: cta_location
   - Description: Where the CTA was clicked

### Conversion Actions (Google Ads)

Already configured:

- Conversion ID: `AW-16871603801`
- Purchase conversion: `AW-17024504219/OTSDCOvziL4aEJuj9bU_`

Additional conversions to consider:

- Sign-up completion
- Free practice start
- Exam completion
- High score achievement

---

## Troubleshooting

### Events Not Firing

1. **Check GTM Container Loading:**

   ```javascript
   console.log(window.dataLayer);
   // Should not be undefined
   ```

2. **Verify Environment Variables:**

   - `NEXT_PUBLIC_GTM_ID` should be set
   - Check `.env` and `.env.production.local`

3. **Check Network Tab:**
   - Look for GTM script requests
   - Look for GA4 measurement protocol requests

### Missing Event Parameters

1. **Check dataLayer structure:**

   ```javascript
   window.dataLayer.forEach((event) => {
     if (event.event === "your_event_name") {
       console.log(event);
     }
   });
   ```

2. **Verify user context enrichment:**
   - Events should include `userId`, `userPlan`, `timestamp`

### GTM Preview Mode Not Working

1. Clear browser cache
2. Disable ad blockers
3. Try incognito mode
4. Check that GTM container is published

---

## Performance Considerations

### Lazy Loading

GTM is lazy-loaded on user interaction:

- First click, scroll, mousemove, touchstart, or keydown
- Reduces initial page load impact

### Debug Mode

Debug logging only enabled in development:

```typescript
const DEBUG = process.env.NODE_ENV === "development";
```

### Server-Side Rendering

All tracking functions check for browser environment:

```typescript
const isBrowser = typeof window !== "undefined";
```

---

## Maintenance

### Adding New Events

1. **Define TypeScript interface** in `src/types/analytics.ts`
2. **Add tracking function** in `src/lib/gtm.ts`
3. **Create custom hook** (optional) in `src/hooks/useTracking.ts`
4. **Implement in component** where event should fire
5. **Create GTM trigger** in GTM dashboard
6. **Create GA4 event tag** in GTM dashboard
7. **Test** using Preview mode and DebugView

### Updating Existing Events

1. Update TypeScript interface if parameters changed
2. Update tracking function
3. Update GTM variables/tags if needed
4. Test changes

---

## Resources

- [GTM Container](https://tagmanager.google.com/): GTM-M24FJ7JC
- [GA4 Property](https://analytics.google.com/): G-S24BC0HY77
- [GA4 Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/ga4)
- [GTM Developer Guide](https://developers.google.com/tag-platform/tag-manager)
- [GA4 E-commerce Events](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce)

---

## Support

For issues or questions:

1. Check browser console for debug logs
2. Use GTM Preview mode to inspect events
3. Verify GA4 DebugView for real-time data
4. Check this documentation for implementation details
