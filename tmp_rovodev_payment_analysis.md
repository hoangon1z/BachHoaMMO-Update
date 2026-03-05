# PayOS Payment Service Analysis

## 1. How Payment Webhooks Are Handled

### Webhook Reception (payos.controller.ts)
- **Endpoints**: Multiple webhook endpoints for both BIDV and MB Bank:
  - `POST /payos/webhook` (BIDV base)
  - `POST /payos/webhook/:secret` (BIDV with secret token)
  - `POST /payos/webhook-mb` (MB Bank base)
  - `POST /payos/webhook-mb/:secret` (MB Bank with secret token)

### Rate Limiting
- In-memory rate limiter: max 30 requests per 1-minute window per IP
- Old entries are cleaned up every 5 minutes
- Prevents webhook spam/DOS attacks

### Signature Verification
1. **HMAC-SHA256 Verification**: Uses bank-specific checksum keys
2. **Fallback Verification**: If signature fails, attempts API verification via `verifyPaymentViaAPI()`
3. **Both must fail** for the webhook to be rejected

### Processing Flow (payos.controller.ts → payos.service.ts)
1. Extract client IP
2. Check rate limit
3. Verify required fields (data, signature)
4. Verify HMAC signature with correct bank's checksum key
5. If signature fails, fallback to PayOS API verification
6. Call `handleWebhook()` service method

---

## 2. Wallet Top-Ups & Duplicate Prevention

### Payment Link Creation (payos.service.ts)
**Key Process** (`createPaymentLink()` lines 210-358):
1. Validates minimum amount (10,000 VND)
2. **Creates a PENDING transaction immediately** (lines 240-254)
3. Generates unique order code (9-digit integer from timestamp + random)
4. Stores bank info, order code, and payment link details in transaction metadata
5. Calls PayOS API to create payment link (with retry mechanism - 3 attempts)
6. Updates transaction with payment link details (QR code, account info, etc.)
7. Returns both payment link and transaction to frontend

### Webhook Handling - IDEMPOTENCY SAFEGUARDS (payos.service.ts, lines 364-491)

**Critical: This is the main duplicate prevention mechanism**

#### Step 1: Transaction Lookup (lines 374-392)
- Searches for transactions by order code
- Looks for PENDING or COMPLETED status (line 378)
- Takes last 10 candidates and finds exact match by orderCode in metadata
- **Accepts both PENDING and COMPLETED to allow idempotent retries**

#### Step 2: Idempotency Check (lines 399-403)
```typescript
if (transaction.status === 'COMPLETED') {
  this.logger.warn(`Transaction ${transaction.id} already completed for orderCode: ${orderCode}. Skipping duplicate processing.`);
  return { success: true, message: 'Payment already processed' };
}
```
- **If transaction is already COMPLETED, returns success without processing again**
- This handles duplicate webhook deliveries

#### Step 3: Status Validation (lines 405-413)
- Ensures transaction is PENDING (not REJECTED, CANCELLED, etc.)
- Validates amount matches exactly

#### Step 4: Atomic Claim - CRITICAL (lines 416-436)
```typescript
const updateResult = await this.prisma.transaction.updateMany({
  where: {
    id: transaction.id,
    status: 'PENDING',  // Only update if still PENDING
  },
  data: {
    status: 'COMPLETED',
    metadata: JSON.stringify({ ...metadata, completedAt, payosReference, transactionDateTime })
  },
});

if (updateResult.count === 0) {
  this.logger.warn(`Transaction ${transaction.id} was already claimed by another request. Skipping duplicate for orderCode: ${orderCode}`);
  return { success: true, message: 'Payment already processed' };
}
```

**This is the race condition protection:**
- Uses `updateMany` with a conditional WHERE clause requiring `status === 'PENDING'`
- If concurrent requests try to claim same transaction, only first succeeds (count = 1)
- Subsequent requests see count = 0 and return success (idempotent)
- **Prevents double-crediting user balance**

#### Step 5: Balance Update & Notifications (lines 438-483)
After atomic claim succeeds:
1. **Increments user balance** (line 443-446)
2. **Sends deposit notification** (line 451)
3. **Sends Telegram notification** (line 463)
4. **Sends WebSocket real-time notification** (line 476)
5. All notification failures are caught and logged, don't block payment success

---

## 3. Notification Logic When Payment Received

### Three Types of Notifications Sent

#### A. In-App Notification (payos.service.ts, line 451)
```typescript
await this.notificationsService.sendDepositNotification(transaction.userId, amount);
```
Creates a notification record in database via `notifications.service.ts`:
- Type: `DEPOSIT`
- Title: "Nạp tiền thành công!"
- Message: Shows amount formatted with Vietnamese locale
- Link: `/wallet`
- Icon: Wallet

**Location**: `backend/src/notifications/notifications.service.ts` lines 222-231

#### B. Telegram Notification (payos.service.ts, lines 463-469)
```typescript
await this.telegramService.notifyDeposit({
  userEmail: user?.email || 'Unknown',
  userName: user?.name || undefined,
  amount,
  orderCode,
  transactionId: transaction.id,
});
```
Sends to Telegram service with deposit details

#### C. WebSocket Real-Time Notification (payos.service.ts, lines 476-483)
```typescript
this.paymentGateway.notifyPaymentConfirmed(transaction.userId, {
  orderCode: Number(orderCode),
  amount,
  message: 'Thanh toán thành công!',
});
```

**WebSocket Implementation** (payos.gateway.ts, lines 101-109):
- Namespace: `/payment`
- Event: `payment:confirmed`
- Sends to user-specific room: `user:${userId}`
- Only sends to connected users (browser tabs with active WebSocket)

#### D. Payment Check-and-Approve Flow (payos.controller.ts, lines 328-402)
- Users can manually check payment status via `/payos/check-and-approve/:orderCode`
- Verification: Only transaction owner can check their own payment
- If payment is marked as PAID in PayOS, constructs webhook payload and calls `handleWebhook()`
- Same notifications are sent (in-app, Telegram, WebSocket)

---

## 4. Wallet Service Top-Up Integration (wallet.service.ts)

### Transaction Creation in wallet.service.ts (lines 52-69)
```typescript
async createRechargeRequest(userId: string, amount: number, metadata?: any) {
  const transaction = await this.prisma.transaction.create({
    data: {
      userId,
      type: 'DEPOSIT',
      amount,
      status: 'PENDING',
      description: 'Nạp tiền vào ví',
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
  return transaction;
}
```
- Simple transaction creation without immediate payment processing
- Can be used for manual admin top-ups (via `approveRecharge()`, lines 74-108)

### Admin Approval (lines 74-108)
- Uses Prisma `$transaction()` for atomicity
- Checks transaction status is PENDING
- Updates status to COMPLETED and increments user balance
- **Does NOT send notifications** (gap identified below)

### No Duplicate Prevention in Admin Flow
The manual admin approval flow does not have the same atomic claim mechanism as PayOS webhooks. If the admin approval endpoint were called twice concurrently, it could result in double-crediting.

---

## Potential Issues for Duplicate Recharge Notifications

### ✅ PROTECTED: PayOS Webhook Duplicate Payments
The webhook handler has robust idempotency:
1. Atomic conditional update prevents double balance increment
2. Early return if transaction already COMPLETED
3. Race condition protected via updateMany with status condition
4. Multiple concurrent webhooks are safely handled

### ⚠️ RISK 1: Multiple Notification Sends from Single Webhook
**Issue**: If webhook is delivered multiple times with small delays:
- First webhook: updates transaction to COMPLETED, sends all 3 notifications
- Second webhook (100ms later): finds transaction COMPLETED, returns early ✓
- **Notifications not resent** (safe)

### ⚠️ RISK 2: Manual Check-and-Approve Can Trigger Notifications
**Issue** (payos.controller.ts, lines 328-402):
- User calls `/payos/check-and-approve/:orderCode` after payment completes
- If payment already processed by webhook, transaction is COMPLETED
- BUT the endpoint doesn't check if ALREADY_COMPLETED before calling handleWebhook
- **Second call constructs new webhook payload and calls handleWebhook()**
- handleWebhook() sees COMPLETED status and returns early ✓
- **No duplicate notification, safe but inefficient**

### ⚠️ RISK 3: Admin Manual Approval Has No Duplicate Prevention
**Issue** (wallet.service.ts, lines 74-108):
- No atomic claim mechanism like PayOS webhook
- If endpoint called twice concurrently, could increment balance twice
- **Does NOT send notifications** (no duplication risk for notifications specifically)

### ⚠️ RISK 4: Notification Creation Not Idempotent
**Issue** (notifications.service.ts, lines 23-37):
- `sendDepositNotification()` always creates a new notification record
- No deduplication by transactionId or orderCode
- If somehow called twice for same transaction, creates 2 notification records
- But this is prevented by webhook idempotency, so low risk in practice

### ⚠️ RISK 5: Telegram/WebSocket Errors Don't Block Payment
**Issue** (payos.service.ts, lines 450-483):
- Notification failures are caught and logged but don't fail the webhook
- If Telegram service temporarily down, notification won't be sent on retry
- But balance IS updated (payment succeeds)
- **Payment succeeds even if all notifications fail** (intentional design)

---

## Summary Table

| Component | Duplicate Prevention | Notification Sent | Risk Level |
|-----------|-------------------|------------------|-----------|
| PayOS Webhook (1st time) | ✅ Atomic claim | ✅ Yes (3 types) | LOW |
| PayOS Webhook (2nd time) | ✅ Status check | ✅ No (early return) | LOW |
| Check-and-Approve (after webhook) | ⚠️ Partial (status check) | ✅ No (early return) | LOW |
| Admin Manual Approval | ❌ No atomic claim | ❌ Not sent | MEDIUM (balance risk) |
| Concurrent Webhooks | ✅ Race condition safe | ✅ Only 1st sends | LOW |

---

## Recommendations

1. **Add atomic claim to admin approval**: Use same conditional update pattern as webhook
2. **Add duplicate check to check-and-approve**: Return early if transaction COMPLETED before calling handleWebhook
3. **Track notification delivery**: Consider idempotency token for notifications (orderCode-based)
4. **Implement notification retry**: If Telegram/WebSocket fails, queue for retry
5. **Audit notifications by transactionId**: Build query index to prevent accidental double-send
