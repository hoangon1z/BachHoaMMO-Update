# Notification System Analysis

## 1. How Recharge/Top-Up Notifications Are Triggered

### Flow Overview
Recharge notifications are triggered through the **PayOS payment webhook** system:

1. **User initiates recharge** → `POST /payos/create-payment`
   - Creates a `PENDING` transaction in the database
   - Stores PayOS order code in transaction metadata

2. **User completes payment** → PayOS payment gateway processes the payment

3. **PayOS sends webhook** → `POST /payos/webhook` or `/payos/webhook-mb`
   - Controller validates signature and rate limits
   - Calls `PayOSService.handleWebhook(payload)`

4. **Webhook handler processes payment**:
   ```typescript
   // In payos.service.ts:364-491
   async handleWebhook(payload: WebhookPayload)
   ```
   - Verifies transaction exists and matches amount
   - **IDEMPOTENCY CHECK**: Returns early if already `COMPLETED`
   - Updates transaction status to `COMPLETED`
   - **Increments user balance**
   - **Triggers 3 notifications** (lines 450-482):
     ```typescript
     a) sendDepositNotification() → In-app notification
     b) telegramService.notifyDeposit() → Telegram notification
     c) paymentGateway.notifyPaymentConfirmed() → WebSocket notification
     ```

### Key Code Path
```
PayOS Webhook → handleWebhook() → Balance Update + 3 Notifications
```

---

## 2. Race Conditions & Duplicate Notification Sending

### ✅ Good: Webhook Idempotency is Implemented
```typescript
// Lines 399-408 in payos.service.ts
if (transaction.status === 'COMPLETED') {
  return { success: true, message: 'Payment already processed' };
}

if (transaction.status !== 'PENDING') {
  return { success: false, message: `Transaction status is ${transaction.status}` };
}
```

### ✅ Good: Atomic Transaction Claim (Lines 415-436)
```typescript
const updateResult = await this.prisma.transaction.updateMany({
  where: {
    id: transaction.id,
    status: 'PENDING',  // ← Conditional update
  },
  data: { status: 'COMPLETED' },
});

if (updateResult.count === 0) {
  return { success: true, message: 'Payment already processed' };
}
```

**Why this works**: If two webhook requests come in simultaneously:
- Both queries find `status: PENDING`
- Both attempt `updateMany` with `status: 'PENDING'` condition
- Only ONE succeeds (first one to claim the update)
- Second one gets `updateResult.count === 0` and returns early

### ⚠️ PROBLEM: Notifications Can Still Be Sent Twice

Even though the transaction claim is atomic, **the notifications are called AFTER the atomic update**:

```typescript
// Lines 438-482
if (updateResult.count === 0) {
  return { success: true, message: 'Payment already processed' };
}

// ← NOTIFICATIONS SENT HERE
await this.notificationsService.sendDepositNotification(...);
await this.telegramService.notifyDeposit(...);
await this.paymentGateway.notifyPaymentConfirmed(...);
```

**Race Condition Scenario**:
1. Webhook A arrives, claims transaction, enters notification section
2. **Notifications are async (not awaited in a transaction)**
3. Before all notifications complete, Webhook B arrives
4. Webhook B's check sees already `COMPLETED` and returns early
5. But Webhook A's notifications are still pending...
6. **Result**: Notifications might be sent multiple times in edge cases

**Root Cause**: The notification calls are not transactional. If a notification fails or takes time to process, there's a small window where duplicate notifications could occur.

### ⚠️ CRITICAL: No Deduplication for Notifications

There's **NO deduplication mechanism** at the notification level:
- `notificationsService.sendDepositNotification()` just creates a new notification record
- No check for existing notifications with same data
- Could result in multiple notifications with identical content

---

## 3. Webhook Handling & Multiple Triggers

### Multiple Webhook Endpoints
The system has **4 webhook endpoints** (potentially multiplicative):

```typescript
// PayOS Controller endpoints:
POST /payos/webhook          // BIDV webhook
POST /payos/webhook/:secret  // BIDV webhook with secret
POST /payos/webhook-mb       // MB Bank webhook
POST /payos/webhook-mb/:secret // MB Bank webhook with secret
```

**Risk**: If PayOS sends webhooks to BOTH endpoints (misconfiguration), notifications could duplicate.

### Webhook Retry Mechanism
The `WebhookService` (used for seller webhooks) has **exponential backoff with retries**:

```typescript
// webhook.service.ts:43-44
private readonly MAX_RETRIES = 3;
private readonly RETRY_DELAYS = [5000, 30000, 120000]; // 5s, 30s, 2min
```

But this is for **seller webhooks** (inventory/order events), not PayOS payment webhooks.

### check-and-approve Endpoint: Another Trigger Point!

There's a secondary webhook trigger at `POST /payos/check-and-approve/:orderCode` (lines 329-403 in payos.controller.ts):

```typescript
if (paymentData.status === 'PAID') {
  const webhookPayload = { /* ... */ };
  const result = await this.payosService.handleWebhook(webhookPayload);
}
```

**Problem**: This endpoint can **manually trigger notifications** if:
1. User makes a payment
2. Webhook is missed/delayed
3. User calls `check-and-approve`
4. If the original webhook eventually arrives, **notifications duplicate**

---

## 4. PayOS Webhook Processing Details

### Payment Confirmation Event Processing

**Entry Point**: `POST /payos/webhook` (or variants)

**Processing Steps**:

1. **Rate Limiting** (lines 151-154):
   ```typescript
   if (!checkRateLimit(clientIp)) {
     return { success: false, message: 'Rate limited' };
   }
   ```
   - 30 requests per minute per IP

2. **Signature Verification** (lines 107-125):
   - Tries HMAC-SHA256 signature first
   - Falls back to API verification if signature fails
   - Either can succeed to proceed

3. **Find Transaction** (lines 374-392):
   ```typescript
   const transaction = candidates.find(t => {
     const metadata = JSON.parse(t.metadata || '{}');
     return Number(metadata.orderCode) === Number(orderCode);
   });
   ```
   - Searches in last 10 PENDING/COMPLETED transactions
   - Could have false positives if orderCodes repeat

4. **Idempotency Check** (lines 399-413):
   - Validates amount matches
   - Checks status is PENDING

5. **Atomic Update** (lines 415-436):
   - Updates with conditional `where { status: 'PENDING' }`
   - Only first webhook succeeds

6. **Balance & Notifications** (lines 440-483):
   ```typescript
   await prisma.user.update({ balance: { increment } });
   await notificationsService.sendDepositNotification();
   await telegramService.notifyDeposit();
   await paymentGateway.notifyPaymentConfirmed();
   ```

---

## 5. Notification Sources (Not Just PayOS)

The notification system is used across multiple services:

```typescript
// sendDepositNotification called from:
- payos.service.ts:451 (payment webhook)

// Other notification types:
- orders.service.ts:524 (sendNewOrderNotification)
- orders.service.ts:843 (escrow release)
- service-orders.service.ts (multiple)
- auction.service.ts (multiple)
```

**All use the same simple `create()` method with no deduplication**.

---

## Summary of Issues

| Issue | Severity | Details |
|-------|----------|---------|
| **Duplicate Notifications** | HIGH | Webhook can be retried; no notification deduplication |
| **Race Condition in Notifications** | MEDIUM | Notifications sent AFTER atomic transaction claim; small window for duplicates |
| **Multiple Webhook Endpoints** | MEDIUM | 4 different endpoints could all trigger; misconfiguration risk |
| **check-and-approve Trigger** | MEDIUM | Manual endpoint can resend notifications if webhook was already processed |
| **No Idempotent Keys** | MEDIUM | Notifications have no deduplication key/idempotency ID |
| **Async Notification Failures** | LOW | If notification service fails, transaction still succeeds (correct), but no retry for notifications |

---

## Recommendations

1. **Add Idempotency IDs to Notifications**
   ```typescript
   // Create notification with idempotencyKey to prevent duplicates
   async create(data: CreateNotificationDto & { idempotencyKey?: string })
   ```

2. **Make Notifications Part of Transaction**
   ```typescript
   await prisma.$transaction(async (tx) => {
     await tx.transaction.update({ status: 'COMPLETED' });
     await tx.notification.create({ /* deposit notification */ });
   });
   ```

3. **Add Webhook Deduplication at DB Level**
   - Track webhook `signature + reference + timestamp` to detect duplicates

4. **Consolidate Webhook Endpoints**
   - Single endpoint that handles all banks/paths

5. **Prevent check-and-approve if Already Processed**
   ```typescript
   if (transaction.status === 'COMPLETED') {
     return { success: false, message: 'Already processed' };
   }
   ```
