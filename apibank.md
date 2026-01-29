Tạo link thanh toán
API dùng để tạo link thanh toán đơn hàng

Authorizations:
(x-client-idx-api-key)
header Parameters
x-partner-code	
string
Partner Code tham gia chương trình tích hợp đối tác payOS Tại đây

Request Body schema: application/json
orderCode
required
integer
Mã đơn hàng

amount
required
integer
Số tiền thanh toán

description
required
string
Mô tả thanh toán, với tài khoản ngân hàng không phải liên kết qua payOS thì giới hạn ký tự là 9

buyerName	
string
Tên của người mua hàng. Thông tin dùng trong trường hợp tích hợp tạo hoá đơn điện tử.

buyerCompanyName	
string
Tên đơn vị mua hàng. Thông tin dùng trong trường hợp tích hợp tạo hoá đơn điện tử.

buyerTaxCode	
string
Mã số thuế của đơn vị mua hàng. Thông tin dùng trong trường hợp tích hợp tạo hoá đơn điện tử.

buyerAddress	
string
Địa chỉ của đơn vị mua hàng. Thông tin dùng trong trường hợp tích hợp tạo hoá đơn điện tử.

buyerEmail	
string <email>
Email của người mua hàng. Thông tin dùng trong trường hợp tích hợp tạo hoá đơn điện tử.

buyerPhone	
string
Số điện thoại người mua hàng. Thông tin dùng trong trường hợp tích hợp tạo hoá đơn điện tử.

items	
Array of objects
Danh sách các sản phẩm thanh toán

cancelUrl
required
string <uri>
URL nhận dữ liệu khi người dùng chọn Huỷ đơn hàng.

returnUrl
required
string <uri>
URL nhận dữ liệu khi đơn hàng thanh toán thành công

invoice	
object
Thông tin hóa đơn

expiredAt	
number <timestamp>
Thời gian hết hạn của link thanh toán, là Unix Timestamp và kiểu Int32

signature
required
string
Chữ ký kiểm tra thông tin không bị thay đổi trong qua trình chuyển dữ liệu từ hệ thống của bạn sang payOS. Bạn cần dùng checksum key từ Kênh thanh toán và HMAC_SHA256 để tạo signature và data theo định dạng được sort theo alphabet: amount=$amount&cancelUrl=$cancelUrl&description=$description&orderCode=$orderCode&returnUrl=$returnUrl.

Responses
200 Thành công
401 Unauthorized
429 Too Many Request - Gọi API quá nhiều

post
/v2/payment-requests
Request samples
Payload
Content type
application/json

Copy
Expand allCollapse all
{
"orderCode": 0,
"amount": 0,
"description": "string",
"buyerName": "string",
"buyerCompanyName": "string",
"buyerTaxCode": "string",
"buyerAddress": "string",
"buyerEmail": "user@example.com",
"buyerPhone": "string",
"items": [
{
"name": "string",
"quantity": 0,
"price": 0,
"unit": "string",
"taxPercentage": -2
}
],
"cancelUrl": "http://example.com",
"returnUrl": "http://example.com",
"invoice": {
"buyerNotGetInvoice": true,
"taxPercentage": -2
},
"expiredAt": 0,
"signature": "string"
}
Response samples
200401
Content type
application/json
Example

Tạo link thanh toán thành công
Tạo link thanh toán thành công

Copy
Expand allCollapse all
{
"code": "00",
"desc": "success",
"data": {
"bin": "970422",
"accountNumber": "113366668888",
"accountName": "QUY VAC XIN PHONG CHONG COVID",
"amount": 10000,
"description": "THANH TOAN DON HANG 123",
"orderCode": 123,
"currency": "VND",
"paymentLinkId": "124c33293c934a85be5b7f8761a27a07",
"status": "PENDING",
"checkoutUrl": "https://pay.payos.vn/web/124c33293c934a85be5b7f8761a27a07",
"qrCode": "00020101021238570010A000000727012700069704220113113366668888020899998888530370454061000005802VN62230819THANH TOAN DON HANG6304BE36"
},
"signature": "aec38349957f1a6c22ded683d06477ac5dfe047cf5f23c70dc8e048759ef1234"
}
Lấy thông tin link thanh toán
API dùng để lấy thông tin của link thanh toán

Lưu ý: Hiện tại thông tin tài khoản đối ứng trong các trường counterAccount chỉ được hỗ trợ bởi các ngân hàng sau:

MB Bank
ACB
KienlongBank
Authorizations:
(x-client-idx-api-key)
path Parameters
id
required
number or string
Example: 3019
Mã đơn hàng của cửa hàng hoặc mã link thanh toán của payOS

Responses
200 Thành công
401 Unauthorized
429 Too Many Request - Gọi API quá nhiều

get
/v2/payment-requests/{id}
Response samples
200401
Content type
application/json
Example

Lấy thông tin link thanh toán thành công
Lấy thông tin link thanh toán thành công

Copy
Expand allCollapse all
{
"code": "00",
"desc": "success",
"data": {
"id": "124c33293c934a85be5b7f8761a27a07",
"orderCode": 123,
"amount": 10000,
"amountPaid": 0,
"amountRemaining": 10000,
"status": "PENDING",
"createdAt": "2024-01-15T10:30:00.000Z",
"transactions": [ ]
},
"signature": "bec38349957f1a6c22ded683d06477ac5dfe047cf5f23c70dc8e048759ef5678"
}
Huỷ link thanh toán
API dùng để hủy link thanh toán

Authorizations:
(x-client-idx-api-key)
path Parameters
id
required
number or string
Example: 3019
Mã đơn hàng của cửa hàng hoặc mã link thanh toán của payOS

Request Body schema: application/json
cancellationReason	
string
Responses
200 Thành công
401 Unauthorized
429 Too Many Request - Gọi API quá nhiều

post
/v2/payment-requests/{id}/cancel
Request samples
Payload
Content type
application/json

Copy
{
"cancellationReason": "Changed my mind"
}
Response samples
200401
Content type
application/json
Example

Hủy link thanh toán thành công
Hủy link thanh toán thành công

Copy
Expand allCollapse all
{
"code": "00",
"desc": "success",
"data": {
"id": "124c33293c934a85be5b7f8761a27a07",
"orderCode": 123,
"amount": 10000,
"amountPaid": 0,
"amountRemaining": 10000,
"status": "CANCELLED",
"createdAt": "2024-01-15T10:30:00.000Z",
"canceledAt": "2024-01-15T11:00:00.000Z",
"cancellationReason": "User requested cancellation",
"transactions": [ ]
},
"signature": "cec38349957f1a6c22ded683d06477ac5dfe047cf5f23c70dc8e048759ef9012"
}
Lấy thông tin hóa đơn
API dùng để lấy thông tin hóa đơn của link thanh toán

Authorizations:
(x-client-idx-api-key)
path Parameters
id
required
number or string
Example: 3019
Mã đơn hàng của cửa hàng hoặc mã link thanh toán của payOS

Responses
200 Thành công
401 Unauthorized
429 Too Many Request - Gọi API quá nhiều

get
/v2/payment-requests/{id}/invoices
Response samples
200401
Content type
application/json
Example

Lấy danh sách hóa đơn thành công
Lấy danh sách hóa đơn thành công

Copy
Expand allCollapse all
{
"code": "00",
"desc": "success",
"data": {
"invoices": [
{
"invoiceId": "INV123456",
"invoiceNumber": "0000001",
"issuedTimestamp": 1705312200000,
"issuedDatetime": "2024-01-15T10:30:00.000Z",
"transactionId": "TXN123",
"reservationCode": "ABC123",
"codeOfTax": "TAX001"
}
]
},
"signature": "dec38349957f1a6c22ded683d06477ac5dfe047cf5f23c70dc8e048759ef3456"
}
Tải hóa đơn
API dùng để lấy tải hóa đơn của link thanh toán

Authorizations:
(x-client-idx-api-key)
path Parameters
id
required
number or string
Example: 3019
Mã đơn hàng của cửa hàng hoặc mã link thanh toán của payOS

invoice-id
required
string
Example: 3733ea88-5131-429c-8863-6ee986133fa8
Mã hóa đơn của link thanh toán

Responses
200 Thành công
401 Unauthorized
429 Too Many Request - Gọi API quá nhiều

get
/v2/payment-requests/{id}/invoices/{invoice-id}/download
Response samples
200401
Content type

application/pdf
application/pdf

Copy
PDF file content
Webhook thanh toán
Webhook thanh toán

Webhook nhận thông tin thanh toán Webhook
Webhook của cửa hàng dùng để nhận dữ liệu thanh toán từ payOS, Dữ liệu mẫu

Request Body schema: application/json
code
required
string
Mã lỗi

desc
required
string
Thông tin lỗi

success
required
boolean
data
required
object
signature
required
string
Chữ kí để kiểm tra thông tin, chi tiết dữ liệu mẫu

Responses
200 Phản hồi trạng thái mã 2XX để xác nhận webhook gửi thành công
Request samples
Payload
Content type
application/json

Copy
Expand allCollapse all
{
"code": "00",
"desc": "success",
"success": true,
"data": {
"orderCode": 123,
"amount": 3000,
"description": "VQRIO123",
"accountNumber": "12345678",
"reference": "TF230204212323",
"transactionDateTime": "2023-02-04 18:25:00",
"currency": "VND",
"paymentLinkId": "124c33293c43417ab7879e14c8d9eb18",
"code": "00",
"desc": "Thành công",
"counterAccountBankId": "",
"counterAccountBankName": "",
"counterAccountName": "",
"counterAccountNumber": "",
"virtualAccountName": "",
"virtualAccountNumber": ""
},
"signature": "8d8640d802576397a1ce45ebda7f835055768ac7ad2e0bfb77f9b8f12cca4c7f"
}
Kiểm tra và thêm hoặc cập nhật Webhook url
API dùng để xác thực webhook url của một kênh thanh toán đồng thời thêm hoặc cập nhật webhook url cho Kênh thanh toán đó nếu thành công.

Authorizations:
(x-client-idx-api-key)
Request Body schema: application/json
webhookUrl
required
string
Đường dẫn webhook nhận dữ liệu ngân hàng từ payOS của bạn, lưu ý: payOS.vn sẽ gửi một dữ liệu mẫu kèm thông tin giao dịch ngân hàng mẫu để kiểm tra xem webhook có hoạt động hay không, dùng "signature" được mã hóa bằng HMAC_SHA256 để check xem cách tạo tại đây

Responses
200 Thành công
400 Webhook url invalid
401 Missing API Key & Client Key
5XX Lỗi từ hệ thống của bạn

post
/confirm-webhook
Request samples
Payload
Content type
application/json

Copy
{
"webhookUrl": "https://your-server.com/webhook-url"
}
Response samples
2004004015XX
Content type
application/json
Example

Xác nhận webhook thành công
Xác nhận webhook thành công

Copy
Expand allCollapse all
{
"code": "00",
"desc": "success",
"data": {
"webhookUrl": "https://example.com/webhook",
"accountNumber": "113366668888",
"accountName": "QUY VAC XIN PHONG CHONG COVID",
"name": "My Payment Channel",
"shortName": "MPC"
}
}
Lệnh chi
Lệnh chi

Tạo lệnh chi đơn
API dùng để tạo lệnh chi đơn

Authorizations:
(x-client-idx-api-key)
header Parameters
x-idempotency-key
required
string
Khóa để đảm bảo tính duy nhất của request

x-signature
required
string
Chữ ký xác thực request

Request Body schema: application/json
required
referenceId
required
string
Mã tham chiếu của lệnh chi

amount
required
integer
Số tiền thanh toán

description
required
string
Mô tả thanh toán

toBin
required
string
Mã ngân hàng đích

toAccountNumber
required
string
Số tài khoản đích

category	
Array of strings
Danh mục thanh toán

Responses
200 Thành công
401 Unauthorized
403 Forbidden
429 Too Many Request - Gọi API quá nhiều
500 Internal server error

post
/v1/payouts
Request samples
Payload
Content type
application/json

Copy
Expand allCollapse all
{
"referenceId": "payout_123",
"amount": 100000,
"description": "Thanh toán lương",
"toBin": "970415",
"toAccountNumber": "123456789",
"category": [
"salary"
]
}
Response samples
200401403500
Content type
application/json
Example

Tạo lệnh chi thành công
Tạo lệnh chi thành công

Copy
Expand allCollapse all
{
"code": "00",
"desc": "success",
"data": {
"id": "payout_123456789",
"referenceId": "ref_123456789",
"transactions": [
{
"id": "txn_123456789",
"referenceId": "ref_123456789",
"amount": 100000,
"description": "Thanh toan",
"toBin": "970422",
"toAccountNumber": "123456789",
"toAccountName": "NGUYEN VAN A",
"state": "PROCESSING"
}
],
"category": [
"salary"
],
"approvalState": "PROCESSING",
"createdAt": "2024-01-15T10:30:00.000Z"
}
}
Lấy danh sách lệnh chi
API dùng để lấy danh sách các lệnh chi

Authorizations:
(x-client-idx-api-key)
query Parameters
limit	
integer
Default: 10
Example: limit=10
Số lượng kết quả trên mỗi trang

offset	
integer
Default: 0
Vị trí bắt đầu

referenceId	
string
Example: referenceId=payout_1752139775150
Mã tham chiếu để lọc

approvalState	
string
Example: approvalState=SUCCEEDED
Trạng thái phê duyệt để lọc

category	
string
Example: category=salary,bonus
Danh mục để lọc (phân cách bằng dấu phẩy)

fromDate	
string
Example: fromDate=2025-06-12T11:24:55Z
Lọc từ ngày (ISO 8601 format)

toDate	
string
Example: toDate=2025-08-12T11:24:55Z
Lọc đến ngày (ISO 8601 format)

Responses
200 Thành công
403 Forbidden
429 Too Many Request - Gọi API quá nhiều

get
/v1/payouts
Response samples
200403
Content type
application/json
Example

Lấy danh sách lệnh chi thành công
Lấy danh sách lệnh chi thành công

Copy
Expand allCollapse all
{
"code": "00",
"desc": "success",
"data": {
"payouts": [
{
"id": "payout_123456789",
"referenceId": "ref_123456789",
"transactions": [
{
"id": "txn_123456789",
"referenceId": "ref_123456789",
"amount": 100000,
"description": "Thanh toan",
"toBin": "970422",
"toAccountNumber": "123456789",
"toAccountName": "NGUYEN VAN A",
"state": "SUCCEEDED"
}
],
"category": [
"salary"
],
"approvalState": "SUCCEEDED",
"createdAt": "2024-01-15T10:30:00.000Z"
}
],
"pagination": {
"total": 1,
"limit": 10,
"offset": 0,
"count": 1,
"hasMore": false
}
}
}
Tạo lệnh chi hàng loạt
API dùng để tạo lô lệnh chi hàng loạt

Authorizations:
(x-client-idx-api-key)
header Parameters
x-idempotency-key
required
string
Khóa để đảm bảo tính duy nhất của request

x-signature
required
string
Chữ ký xác thực request

Request Body schema: application/json
required
referenceId
required
string
Mã tham chiếu của lệnh chi

category	
Array of strings
Danh mục thanh toán

validateDestination	
boolean
Xác thực tài khoản đích

payouts
required
Array of objects (PayoutItem)
Responses
200 Thành công
401 Unauthorized
403 Forbidden
429 Too Many Request - Gọi API quá nhiều
500 Internal server error

post
/v1/payouts/batch
Request samples
Payload
Content type
application/json

Copy
Expand allCollapse all
{
"referenceId": "batch_payout_123",
"category": [
"salary",
"bonus"
],
"validateDestination": true,
"payouts": [
{
"referenceId": "payout_123",
"amount": 100000,
"description": "Thanh toán lương tháng 1",
"toBin": "970415",
"toAccountNumber": "123456789"
}
]
}
Response samples
200401403500
Content type
application/json
Example

Tạo lệnh chi thành công
Tạo lệnh chi thành công

Copy
Expand allCollapse all
{
"code": "00",
"desc": "success",
"data": {
"id": "payout_123456789",
"referenceId": "ref_123456789",
"transactions": [
{
"id": "txn_123456789",
"referenceId": "ref_123456789",
"amount": 100000,
"description": "Thanh toan",
"toBin": "970422",
"toAccountNumber": "123456789",
"toAccountName": "NGUYEN VAN A",
"state": "PROCESSING"
}
],
"category": [
"salary"
],
"approvalState": "PROCESSING",
"createdAt": "2024-01-15T10:30:00.000Z"
}
}
Lấy thông tin lệnh chi
API dùng để lấy thông tin chi tiết của một lệnh chi

Authorizations:
(x-client-idx-api-key)
path Parameters
payoutId
required
string
Example: payout_123
ID của lệnh chi

Responses
200 Thành công
401 Unauthorized
403 Forbidden
429 Too Many Request - Gọi API quá nhiều

get
/v1/payouts/{payoutId}
Response samples
200401403
Content type
application/json
Example

Tạo lệnh chi thành công
Tạo lệnh chi thành công

Copy
Expand allCollapse all
{
"code": "00",
"desc": "success",
"data": {
"id": "payout_123456789",
"referenceId": "ref_123456789",
"transactions": [
{
"id": "txn_123456789",
"referenceId": "ref_123456789",
"amount": 100000,
"description": "Thanh toan",
"toBin": "970422",
"toAccountNumber": "123456789",
"toAccountName": "NGUYEN VAN A",
"state": "PROCESSING"
}
],
"category": [
"salary"
],
"approvalState": "PROCESSING",
"createdAt": "2024-01-15T10:30:00.000Z"
}
}
Ước tính chi phí
API dùng để ước tính phí cho lệnh chi

Authorizations:
(x-client-idx-api-key)
header Parameters
x-signature
required
string
Chữ ký xác thực request

Request Body schema: application/json
required
referenceId
required
string
Mã tham chiếu của lệnh chi

category	
Array of strings
Danh mục thanh toán

validateDestination	
boolean
Xác thực tài khoản đích

payouts
required
Array of objects (PayoutItem)
Responses
200 Thành công
401 Unauthorized
403 Forbidden
429 Too Many Request - Gọi API quá nhiều

post
/v1/payouts/estimate-credit
Request samples
Payload
Content type
application/json

Copy
Expand allCollapse all
{
"referenceId": "batch_payout_123",
"category": [
"salary",
"bonus"
],
"validateDestination": true,
"payouts": [
{
"referenceId": "payout_123",
"amount": 100000,
"description": "Thanh toán lương tháng 1",
"toBin": "970415",
"toAccountNumber": "123456789"
}
]
}
Response samples
200401403
Content type
application/json
Example

Ước tính phí thành công
Ước tính phí thành công

Copy
Expand allCollapse all
{
"code": "00",
"desc": "success",
"data": {
"estimateCredit": 5000
}
}
Tài khoản chi
Tài khoản chi

Lấy thông tin số dư tài khoản chi
API dùng để lấy thông tin số dư tài khoản chi

Authorizations:
(x-client-idx-api-key)
Responses
200 Thành công
401 Unauthorized
403 Forbidden
429 Too Many Request - Gọi API quá nhiều