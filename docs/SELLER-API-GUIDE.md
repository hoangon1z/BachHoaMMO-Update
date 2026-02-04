# BachHoaMMO Seller API - Hướng dẫn tích hợp

## Giới thiệu

API cho phép seller quản lý sản phẩm, kho hàng và đơn hàng thông qua các request HTTP.

**Base URL:** `https://bachhoammo.store/api/v1`

## Bắt đầu

### 1. Tạo API Key

1. Đăng nhập vào BachHoaMMO
2. Vào **Seller Settings** → **API Integration**
3. Click **Tạo API Key mới**
4. Lưu lại **API Key** và **Secret** (Secret chỉ hiển thị 1 lần!)

### 2. Authentication

Mỗi request cần 3 headers:

```
X-API-Key: bhmmo_xxxxxxxxxxxxxxxx
X-Timestamp: 1706623200
X-Signature: abc123...
```

### Tính Signature

```javascript
const crypto = require('crypto');

// 1. Lấy timestamp (giây)
const timestamp = Math.floor(Date.now() / 1000).toString();

// 2. Tạo payload
const method = 'GET'; // hoặc POST, PUT, DELETE
const path = '/api/v1/me';
const body = ''; // JSON minified hoặc '' nếu không có body

const payload = timestamp + method + path + body;

// 3. Tính HMAC-SHA256
const signature = crypto
  .createHmac('sha256', YOUR_SECRET)
  .update(payload)
  .digest('hex');
```

## Code Examples

### Node.js

```javascript
const crypto = require('crypto');
const axios = require('axios');

const API_KEY = 'bhmmo_xxxxxxxx';
const SECRET = 'your_secret_here';
const BASE_URL = 'https://bachhoammo.store';

async function callApi(method, path, body = null) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyStr = body ? JSON.stringify(body) : '';
  
  const payload = timestamp + method + path + bodyStr;
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('hex');
  
  const response = await axios({
    method,
    url: BASE_URL + path,
    data: body,
    headers: {
      'X-API-Key': API_KEY,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'Content-Type': 'application/json',
    },
  });
  
  return response.data;
}

// Sử dụng
async function main() {
  // Lấy thông tin seller
  const me = await callApi('GET', '/api/v1/me');
  console.log('Seller:', me.data);
  
  // Lấy danh sách sản phẩm
  const products = await callApi('GET', '/api/v1/products?limit=10');
  console.log('Products:', products.data.items);
  
  // Thêm inventory
  const result = await callApi('POST', '/api/v1/inventory', {
    productId: 'your-product-id',
    items: [
      'account1@email.com|password1',
      'account2@email.com|password2',
    ],
  });
  console.log('Added:', result.data);
}

main();
```

### Python

```python
import hmac
import hashlib
import time
import json
import requests

API_KEY = 'bhmmo_xxxxxxxx'
SECRET = 'your_secret_here'
BASE_URL = 'https://bachhoammo.store'

def call_api(method, path, body=None):
    timestamp = str(int(time.time()))
    body_str = json.dumps(body, separators=(',', ':')) if body else ''
    
    payload = f'{timestamp}{method}{path}{body_str}'
    signature = hmac.new(
        SECRET.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    headers = {
        'X-API-Key': API_KEY,
        'X-Timestamp': timestamp,
        'X-Signature': signature,
        'Content-Type': 'application/json',
    }
    
    response = requests.request(
        method,
        BASE_URL + path,
        json=body,
        headers=headers
    )
    return response.json()

# Sử dụng
if __name__ == '__main__':
    # Lấy thông tin
    me = call_api('GET', '/api/v1/me')
    print('Seller:', me['data'])
    
    # Thêm inventory
    result = call_api('POST', '/api/v1/inventory', {
        'productId': 'your-product-id',
        'items': ['acc1@email.com|pass1', 'acc2@email.com|pass2']
    })
    print('Added:', result['data'])
```

### PHP

```php
<?php
$apiKey = 'bhmmo_xxxxxxxx';
$secret = 'your_secret_here';
$baseUrl = 'https://bachhoammo.store';

function callApi($method, $path, $body = null) {
    global $apiKey, $secret, $baseUrl;
    
    $timestamp = (string) time();
    $bodyStr = $body ? json_encode($body, JSON_UNESCAPED_UNICODE) : '';
    
    $payload = $timestamp . $method . $path . $bodyStr;
    $signature = hash_hmac('sha256', $payload, $secret);
    
    $headers = [
        'X-API-Key: ' . $apiKey,
        'X-Timestamp: ' . $timestamp,
        'X-Signature: ' . $signature,
        'Content-Type: application/json',
    ];
    
    $ch = curl_init($baseUrl . $path);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    
    if ($body) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $bodyStr);
    }
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

// Sử dụng
$me = callApi('GET', '/api/v1/me');
print_r($me);

$result = callApi('POST', '/api/v1/inventory', [
    'productId' => 'your-product-id',
    'items' => ['acc1@email.com|pass1', 'acc2@email.com|pass2']
]);
print_r($result);
```

### cURL

```bash
# Tính signature (Linux/Mac)
TIMESTAMP=$(date +%s)
METHOD="GET"
PATH="/api/v1/me"
BODY=""
PAYLOAD="${TIMESTAMP}${METHOD}${PATH}${BODY}"
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "YOUR_SECRET" | cut -d' ' -f2)

# Gọi API
curl -X GET "https://bachhoammo.store/api/v1/me" \
  -H "X-API-Key: bhmmo_xxxxxxxx" \
  -H "X-Timestamp: $TIMESTAMP" \
  -H "X-Signature: $SIGNATURE"
```

## API Endpoints

### Health & Info

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/health` | Kiểm tra API (không cần auth) |
| GET | `/me` | Thông tin seller |
| GET | `/stats` | Thống kê tổng quan |
| GET | `/categories` | Danh sách danh mục |

### Products

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/products` | Danh sách sản phẩm |
| GET | `/products/:id` | Chi tiết sản phẩm |
| POST | `/products` | Tạo sản phẩm |
| PUT | `/products/:id` | Cập nhật sản phẩm |
| DELETE | `/products/:id` | Xóa sản phẩm |
| PUT | `/products/:id/stock` | Cập nhật stock |

### Variants

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/products/:id/variants` | Danh sách variants |
| POST | `/products/:id/variants` | Tạo variant |
| PUT | `/products/:id/variants/:variantId` | Cập nhật variant |
| DELETE | `/products/:id/variants/:variantId` | Xóa variant |

### Inventory

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/inventory` | Danh sách inventory |
| GET | `/inventory/count` | Đếm nhanh |
| POST | `/inventory` | Thêm inventory (bulk) |
| DELETE | `/inventory/:id` | Xóa 1 item |
| DELETE | `/inventory` | Xóa nhiều items |

### Orders

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/orders` | Danh sách đơn hàng |
| GET | `/orders/:id` | Chi tiết đơn hàng |
| POST | `/orders/:id/deliver` | Giao hàng thủ công |

## Rate Limits

- **100 requests/phút** mỗi API key
- Headers trả về:
  - `X-RateLimit-Limit`: Giới hạn
  - `X-RateLimit-Remaining`: Còn lại
  - `X-RateLimit-Reset`: Thời điểm reset

## Error Codes

| Code | HTTP | Mô tả |
|------|------|-------|
| `INVALID_API_KEY` | 401 | API key không hợp lệ |
| `INVALID_SIGNATURE` | 401 | Chữ ký sai |
| `EXPIRED_TIMESTAMP` | 401 | Timestamp quá cũ |
| `API_KEY_INACTIVE` | 401 | API key bị vô hiệu |
| `RATE_LIMIT_EXCEEDED` | 429 | Vượt quá giới hạn |
| `NOT_FOUND` | 404 | Không tìm thấy |
| `VALIDATION_ERROR` | 400 | Dữ liệu không hợp lệ |

## Tips

1. **Timestamp:** Đồng bộ thời gian máy với NTP server để tránh lỗi `EXPIRED_TIMESTAMP`

2. **Body minification:** Khi gửi JSON body, đảm bảo minify (không có whitespace thừa):
   ```javascript
   // Đúng
   JSON.stringify({ productId: 'abc', items: ['x'] })
   // => {"productId":"abc","items":["x"]}
   
   // Sai (sẽ lỗi signature)
   {
     "productId": "abc",
     "items": ["x"]
   }
   ```

3. **Xử lý lỗi:** Luôn check `success` field trước khi sử dụng `data`:
   ```javascript
   const response = await callApi('GET', '/api/v1/me');
   if (response.success) {
     console.log(response.data);
   } else {
     console.error(response.error.code, response.error.message);
   }
   ```

4. **Pagination:** Với danh sách lớn, sử dụng `limit` và `offset`:
   ```javascript
   let offset = 0;
   const limit = 50;
   let hasMore = true;
   
   while (hasMore) {
     const response = await callApi('GET', `/api/v1/inventory?limit=${limit}&offset=${offset}`);
     // Process response.data.items
     hasMore = response.data.pagination.hasMore;
     offset += limit;
   }
   ```

## Webhooks - Tự động hóa giao hàng

Webhooks cho phép hệ thống của bạn nhận thông báo real-time khi có đơn hàng mới, giúp tự động giao hàng.

### Webhook Events

| Event | Mô tả | Khi nào trigger |
|-------|-------|-----------------|
| `order.created` | Đơn hàng mới | Ngay khi đơn được tạo |
| `order.paid` | Đã thanh toán | Sau khi thanh toán thành công (trigger giao hàng) |
| `order.completed` | Hoàn thành | Sau khi buyer xác nhận hoặc hết thời gian escrow |
| `order.cancelled` | Bị hủy | Khi đơn bị hủy |
| `order.disputed` | Khiếu nại | Khi buyer mở khiếu nại |
| `order.refunded` | Hoàn tiền | Khi đơn được hoàn tiền |
| `inventory.low` | Sắp hết hàng | Khi stock < 10 |
| `inventory.empty` | Hết hàng | Khi stock = 0 |

### Webhook Payload

```json
{
  "event": "order.paid",
  "timestamp": 1706700000,
  "data": {
    "orderId": "order-uuid",
    "orderNumber": "ORD-20240131-ABC123",
    "status": "PROCESSING",
    "total": 100000,
    "buyerName": "Nguyen Van A",
    "items": [
      {
        "orderItemId": "item-uuid",
        "productId": "prod-uuid",
        "productTitle": "Netflix Premium 1 tháng",
        "variantId": "var-uuid",
        "quantity": 2,
        "price": 50000,
        "total": 100000,
        "deliveredQuantity": 0,
        "productType": "STANDARD",
        "autoDelivery": false
      }
    ],
    "deliveredCount": 0,
    "createdAt": "2024-01-31T10:00:00.000Z"
  }
}
```

### Xác thực Webhook

BachHoaMMO gửi signature trong header để bạn verify:

```
X-Webhook-Signature: hmac_sha256_signature
X-Webhook-Timestamp: 1706700000
```

**Verify signature (Node.js):**

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return signature === expected;
}

// Express middleware
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body;
  
  if (!verifyWebhook(payload, signature, WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook
  handleWebhook(payload);
  
  res.status(200).json({ received: true });
});
```

### Ví dụ: Tự động giao hàng

```javascript
const axios = require('axios');

const API_KEY = 'bhmmo_xxx';
const SECRET = 'your_secret';

// Webhook handler
async function handleWebhook(payload) {
  if (payload.event !== 'order.paid') return;
  
  const order = payload.data;
  
  for (const item of order.items) {
    // Bỏ qua sản phẩm đã giao tự động
    if (item.autoDelivery) continue;
    
    // Lấy tài khoản từ hệ thống của bạn
    const accounts = await getAccountsFromYourSystem(
      item.productId,
      item.variantId,
      item.quantity - item.deliveredQuantity
    );
    
    if (accounts.length === 0) {
      console.error(`No accounts available for ${item.productTitle}`);
      continue;
    }
    
    // Giao hàng qua API
    const result = await callApi('POST', `/api/v1/orders/${order.orderId}/deliver`, {
      orderItemId: item.orderItemId,
      accountData: accounts,
    });
    
    console.log(`Delivered ${result.data.delivered} accounts for ${item.productTitle}`);
  }
}

// Webhook server
const express = require('express');
const app = express();

app.post('/webhook', express.json(), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  
  // Verify signature
  if (!verifyWebhook(req.body, signature, WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process async
  handleWebhook(req.body).catch(console.error);
  
  // Respond immediately
  res.status(200).json({ received: true });
});

app.listen(3000, () => console.log('Webhook server running on port 3000'));
```

### Retry & Failure Handling

- **Retry**: BachHoaMMO retry tối đa 3 lần với delay: 5s, 30s, 2 phút
- **Timeout**: 10 giây
- **Auto-disable**: Webhook tự động bị tắt sau 10 lần fail liên tiếp
- **Logs**: Xem lịch sử gọi webhook qua `GET /webhooks/:id/logs`

### Best Practices

1. **Respond nhanh**: Return 200 ngay lập tức, xử lý async
2. **Idempotency**: Xử lý trường hợp nhận cùng event nhiều lần
3. **Verify signature**: Luôn verify để tránh fake requests
4. **Log everything**: Lưu log để debug khi có vấn đề
5. **Monitor failures**: Check webhook logs thường xuyên

## Hỗ trợ

- Website: https://bachhoammo.store
- Telegram: @bachhoammobot
