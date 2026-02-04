# BachHoaMMO Seller API Documentation

API cho seller quản lý kho hàng, sản phẩm và đơn hàng trên BachHoaMMO.

## Mục lục

- [Bắt đầu](#bắt-đầu)
- [Authentication](#authentication)
- [Rate Limits](#rate-limits)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Health & Info](#health--info)
  - [Inventory](#inventory)
  - [Products](#products)
  - [Orders](#orders)
- [Code Examples](#code-examples)

---

## Bắt đầu

### 1. Tạo API Key

1. Đăng nhập vào [BachHoaMMO](https://bachhoammo.store)
2. Vào **Seller Dashboard** → **Cài đặt** → **API Integration**
3. Nhấn **Tạo Key** để tạo API Key mới
4. **LƯU LẠI SECRET** - Secret chỉ hiển thị **MỘT LẦN DUY NHẤT**!

### 2. Base URL

```
https://bachhoammo.store/api/v1
```

### 3. Import Postman Collection

Download và import file [BachHoaMMO-Seller-API.postman_collection.json](./postman/BachHoaMMO-Seller-API.postman_collection.json) vào Postman.

Cập nhật biến môi trường:
- `api_key`: API Key của bạn
- `api_secret`: Secret của bạn

---

## Authentication

Mỗi request (trừ `/health`) cần 3 headers:

| Header | Mô tả |
|--------|-------|
| `X-API-Key` | API Key của bạn (bắt đầu bằng `bhmmo_`) |
| `X-Timestamp` | Unix timestamp (giây), phải trong ±5 phút so với server |
| `X-Signature` | HMAC-SHA256 signature |

### Cách tính Signature

```javascript
const crypto = require('crypto');

function generateSignature(secretHash, timestamp, method, path, body) {
  const signaturePayload = timestamp + method + path + (body || '');
  return crypto
    .createHmac('sha256', secretHash)
    .update(signaturePayload)
    .digest('hex');
}

// Ví dụ:
const timestamp = Math.floor(Date.now() / 1000).toString();
const method = 'GET';
const path = '/api/v1/inventory';
const body = '';

const signature = generateSignature(secretHash, timestamp, method, path, body);
```

### Ví dụ Request với cURL

```bash
API_KEY="bhmmo_your_key_here"
SECRET="your_secret_here"
TIMESTAMP=$(date +%s)
METHOD="GET"
PATH="/api/v1/inventory"
BODY=""

SIGNATURE=$(echo -n "${TIMESTAMP}${METHOD}${PATH}${BODY}" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)

curl -X GET "https://bachhoammo.store${PATH}" \
  -H "X-API-Key: $API_KEY" \
  -H "X-Timestamp: $TIMESTAMP" \
  -H "X-Signature: $SIGNATURE"
```

---

## Rate Limits

- **Default**: 100 requests/phút
- Rate limit áp dụng riêng cho mỗi API Key

### Response Headers

| Header | Mô tả |
|--------|-------|
| `X-RateLimit-Limit` | Số request tối đa/phút |
| `X-RateLimit-Remaining` | Số request còn lại |
| `X-RateLimit-Reset` | Unix timestamp khi reset |

### Khi vượt Rate Limit

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Limit: 100 requests per minute"
  }
}
```

---

## Error Handling

### Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": { ... }
  }
}
```

### Error Codes

| Code | HTTP Status | Mô tả |
|------|-------------|-------|
| `INVALID_API_KEY` | 401 | API Key không hợp lệ |
| `INVALID_SIGNATURE` | 401 | Signature không đúng |
| `EXPIRED_TIMESTAMP` | 401 | Timestamp quá cũ (>5 phút) |
| `API_KEY_INACTIVE` | 401 | API Key đã bị tắt |
| `API_KEY_EXPIRED` | 401 | API Key hết hạn |
| `RATE_LIMIT_EXCEEDED` | 429 | Vượt rate limit |
| `VALIDATION_ERROR` | 400 | Dữ liệu không hợp lệ |
| `NOT_FOUND` | 404 | Không tìm thấy resource |
| `FORBIDDEN` | 403 | Không có quyền truy cập |
| `INTERNAL_ERROR` | 500 | Lỗi server |

---

## Endpoints

### Health & Info

#### GET /api/v1/health

Kiểm tra API có hoạt động. **Không cần authentication.**

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "version": "1.0.0",
    "timestamp": "2024-01-30T10:00:00.000Z"
  }
}
```

#### GET /api/v1/me

Lấy thông tin seller và shop.

```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "seller@example.com",
    "name": "Seller Name",
    "balance": 1000000,
    "shop": {
      "name": "My Shop",
      "description": "Shop description",
      "logo": "/uploads/logo.png",
      "rating": 4.5,
      "totalSales": 100,
      "isVerified": true
    }
  }
}
```

#### GET /api/v1/stats

Thống kê tổng quan.

```json
{
  "success": true,
  "data": {
    "products": 15,
    "orders": {
      "total": 100,
      "pending": 5,
      "processing": 3,
      "completed": 90,
      "cancelled": 2,
      "revenue": 5000000
    },
    "inventory": {
      "total": 500,
      "available": 450,
      "sold": 50
    },
    "recentOrders": 12
  }
}
```

---

### Inventory

#### GET /api/v1/inventory

Lấy danh sách kho hàng.

**Query Parameters:**

| Param | Type | Mô tả |
|-------|------|-------|
| `productId` | string | Filter theo product |
| `variantId` | string | Filter theo variant |
| `status` | enum | AVAILABLE, RESERVED, SOLD, DISABLED |
| `limit` | number | Max 100, default 50 |
| `offset` | number | Default 0 |

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "inv-uuid",
        "productId": "product-uuid",
        "variantId": null,
        "status": "AVAILABLE",
        "createdAt": "2024-01-30T10:00:00.000Z"
      }
    ],
    "stats": {
      "total": 100,
      "available": 90,
      "reserved": 5,
      "sold": 5,
      "disabled": 0
    },
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 100,
      "hasMore": true
    }
  }
}
```

> **Note:** `accountData` không được trả về qua API vì lý do bảo mật.

#### POST /api/v1/inventory

Thêm nhiều tài khoản vào kho.

**Request Body:**
```json
{
  "productId": "product-uuid",
  "variantId": "variant-uuid-or-null",
  "items": [
    "username1|password1|email1@gmail.com",
    "username2|password2|email2@gmail.com"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "added": 2,
    "duplicates": 0,
    "errors": []
  }
}
```

#### DELETE /api/v1/inventory/:id

Xóa một item trong kho.

#### DELETE /api/v1/inventory

Xóa nhiều items.

**Request Body:**
```json
{
  "ids": ["inv-id-1", "inv-id-2"]
}
```

---

### Products

#### GET /api/v1/products

Lấy danh sách sản phẩm.

**Query Parameters:**

| Param | Type | Mô tả |
|-------|------|-------|
| `categoryId` | string | Filter theo danh mục |
| `status` | enum | ACTIVE, INACTIVE, OUT_OF_STOCK |
| `limit` | number | Max 100, default 20 |
| `offset` | number | Default 0 |

#### GET /api/v1/products/:id

Lấy chi tiết sản phẩm.

#### POST /api/v1/products

Tạo sản phẩm mới.

**Request Body:**
```json
{
  "title": "Premium Netflix Account",
  "description": "Tài khoản Netflix Premium 1 tháng",
  "price": 50000,
  "originalPrice": 100000,
  "categoryId": "category-uuid",
  "images": ["https://example.com/image.jpg"],
  "tags": ["netflix", "premium"],
  "autoDelivery": true,
  "productType": "STANDARD",
  "hasVariants": false,
  "variants": []
}
```

#### PUT /api/v1/products/:id

Cập nhật sản phẩm. Chỉ gửi các field cần update.

#### PUT /api/v1/products/:id/stock

Cập nhật stock thủ công.

```json
{
  "stock": 100
}
```

#### DELETE /api/v1/products/:id

Xóa sản phẩm (soft delete).

---

### Orders

#### GET /api/v1/orders

Lấy danh sách đơn hàng.

**Query Parameters:**

| Param | Type | Mô tả |
|-------|------|-------|
| `status` | enum | PENDING, PROCESSING, COMPLETED, CANCELLED, REFUNDED, DISPUTED |
| `productId` | string | Filter theo sản phẩm |
| `fromDate` | string | ISO date (2024-01-01) |
| `toDate` | string | ISO date |
| `limit` | number | Max 100, default 20 |
| `offset` | number | Default 0 |

#### GET /api/v1/orders/:id

Lấy chi tiết đơn hàng, bao gồm deliveries.

#### POST /api/v1/orders/:id/deliver

Giao hàng thủ công.

**Request Body:**
```json
{
  "orderItemId": "order-item-uuid",
  "accountData": [
    "username1|password1|email1@gmail.com",
    "username2|password2|email2@gmail.com"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "delivered": 2,
    "remaining": 0,
    "orderStatus": "COMPLETED"
  }
}
```

---

## Code Examples

### Node.js

```javascript
const crypto = require('crypto');
const axios = require('axios');

const API_KEY = 'bhmmo_your_api_key';
const SECRET = 'your_secret';
const BASE_URL = 'https://bachhoammo.store';

async function apiRequest(method, path, body = null) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyStr = body ? JSON.stringify(body) : '';
  
  const signaturePayload = timestamp + method + path + bodyStr;
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(signaturePayload)
    .digest('hex');

  const response = await axios({
    method,
    url: BASE_URL + path,
    headers: {
      'X-API-Key': API_KEY,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'Content-Type': 'application/json',
    },
    data: body,
  });

  return response.data;
}

// Ví dụ: Lấy danh sách kho hàng
async function getInventory() {
  const result = await apiRequest('GET', '/api/v1/inventory?limit=50');
  console.log(result);
}

// Ví dụ: Thêm hàng vào kho
async function addInventory(productId, items) {
  const result = await apiRequest('POST', '/api/v1/inventory', {
    productId,
    items,
  });
  console.log(result);
}

getInventory();
```

### Python

```python
import hashlib
import hmac
import time
import requests
import json

API_KEY = 'bhmmo_your_api_key'
SECRET = 'your_secret'
BASE_URL = 'https://bachhoammo.store'

def api_request(method, path, body=None):
    timestamp = str(int(time.time()))
    body_str = json.dumps(body) if body else ''
    
    signature_payload = timestamp + method + path + body_str
    signature = hmac.new(
        SECRET.encode(),
        signature_payload.encode(),
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
        headers=headers,
        json=body
    )
    
    return response.json()

# Ví dụ: Lấy danh sách kho hàng
result = api_request('GET', '/api/v1/inventory?limit=50')
print(result)

# Ví dụ: Thêm hàng vào kho
result = api_request('POST', '/api/v1/inventory', {
    'productId': 'your-product-id',
    'items': [
        'account1|pass1|email1@gmail.com',
        'account2|pass2|email2@gmail.com',
    ]
})
print(result)
```

### PHP

```php
<?php
$API_KEY = 'bhmmo_your_api_key';
$SECRET = 'your_secret';
$BASE_URL = 'https://bachhoammo.store';

function apiRequest($method, $path, $body = null) {
    global $API_KEY, $SECRET, $BASE_URL;
    
    $timestamp = time();
    $bodyStr = $body ? json_encode($body) : '';
    
    $signaturePayload = $timestamp . $method . $path . $bodyStr;
    $signature = hash_hmac('sha256', $signaturePayload, $SECRET);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $BASE_URL . $path);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'X-API-Key: ' . $API_KEY,
        'X-Timestamp: ' . $timestamp,
        'X-Signature: ' . $signature,
        'Content-Type: application/json',
    ]);
    
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $bodyStr);
    }
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

// Ví dụ: Lấy danh sách kho hàng
$result = apiRequest('GET', '/api/v1/inventory?limit=50');
print_r($result);
?>
```

---

## Support

- **Website:** https://bachhoammo.store
- **Email:** support@bachhoammo.store
- **Telegram:** @BachHoaMMO

---

## Changelog

### v1.0.0 (2024-01-30)
- Initial release
- Inventory management endpoints
- Product management endpoints
- Order management endpoints
