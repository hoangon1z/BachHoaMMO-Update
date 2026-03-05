import { IsString, IsOptional, IsNumber, Min, Max, IsEnum, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Store/Shop DTOs
export class CreateStoreDto {
  @IsString()
  shopName: string;

  @IsString()
  @IsOptional()
  shopDescription?: string;

  @IsString()
  @IsOptional()
  shopLogo?: string;
}

export class UpdateStoreDto {
  @IsString()
  @IsOptional()
  shopName?: string;

  @IsString()
  @IsOptional()
  shopDescription?: string;

  @IsString()
  @IsOptional()
  shopLogo?: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsString()
  @IsOptional()
  contactTelegram?: string;

  @IsString()
  @IsOptional()
  storeStatus?: string; // ONLINE, OFFLINE, AWAY

  @IsString()
  @IsOptional()
  statusMessage?: string;

  // Auto-reply settings
  @IsBoolean()
  @IsOptional()
  autoReplyEnabled?: boolean;

  @IsString()
  @IsOptional()
  autoReplyMessage?: string;

  @IsNumber()
  @IsOptional()
  autoReplyStartHour?: number; // 0-23

  @IsNumber()
  @IsOptional()
  autoReplyEndHour?: number; // 0-23

  @IsNumber()
  @IsOptional()
  autoReplyCooldown?: number; // minutes
}

// Product Variant DTO
export class ProductVariantDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  @Max(999999999) // Max ~1 tỷ VND
  price: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(999999999)
  originalPrice?: number;

  @IsNumber()
  @Min(0)
  @Max(999999) // Max 999,999 sản phẩm
  stock: number;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  attributes?: string;

  @IsNumber()
  @IsOptional()
  position?: number;
}

// Product Variant DTO for update (optional id for existing variants)
export class UpdateProductVariantDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  @Max(999999999)
  price: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(999999999)
  originalPrice?: number;

  @IsNumber()
  @Min(0)
  @Max(999999)
  stock: number;

  @IsNumber()
  @IsOptional()
  position?: number;
}

// Product Type Enum
export enum ProductType {
  STANDARD = 'STANDARD',  // Bán tài khoản - buyer nhận account
  UPGRADE = 'UPGRADE',    // Nâng cấp tài khoản - buyer cung cấp email, seller upgrade
  SERVICE = 'SERVICE',    // Dịch vụ buff like/sub MXH
}

// Product/Inventory DTOs
export class CreateProductDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  @Max(999999999) // Max ~1 tỷ VND
  price: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(999999999)
  originalPrice?: number;

  @IsNumber()
  @Min(0)
  @Max(999999) // Max 999,999 sản phẩm
  stock: number;

  @IsString()
  categoryId: string;

  @IsString()
  images: string; // JSON array

  @IsString()
  @IsOptional()
  tags?: string;

  @IsString()
  @IsOptional()
  attributes?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  commission?: number; // Phần trăm hoa hồng sàn (0-100%)

  @IsBoolean()
  @IsOptional()
  hasVariants?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  @IsOptional()
  variants?: ProductVariantDto[];

  @IsBoolean()
  @IsOptional()
  autoDelivery?: boolean; // Chế độ giao hàng: true = tự động, false = thủ công

  @IsEnum(ProductType)
  @IsOptional()
  productType?: ProductType; // Loại sản phẩm: STANDARD, UPGRADE, hoặc SERVICE

  @IsString()
  @IsOptional()
  requiredBuyerFields?: string; // JSON array các trường buyer cần cung cấp (VD: ["email"])

  // ====== SERVICE-specific fields ======
  @IsString()
  @IsOptional()
  servicePlatform?: string; // FACEBOOK, INSTAGRAM, TIKTOK, YOUTUBE...

  @IsString()
  @IsOptional()
  serviceType?: string; // LIKE, FOLLOW, VIEW, COMMENT...

  @IsNumber()
  @IsOptional()
  @Min(0)
  pricePerUnit?: number; // Giá mỗi đơn vị (VD: 50đ/like)

  @IsNumber()
  @IsOptional()
  @Min(1)
  minQuantity?: number; // Số lượng tối thiểu

  @IsNumber()
  @IsOptional()
  maxQuantity?: number; // Số lượng tối đa

  @IsString()
  @IsOptional()
  estimatedTime?: string; // "1-6 giờ", "12-24 giờ"

  @IsNumber()
  @IsOptional()
  @Min(0)
  warrantyDays?: number; // Số ngày bảo hành

  @IsString()
  @IsOptional()
  serviceSpeed?: string; // SLOW, MEDIUM, FAST

  @IsString()
  @IsOptional()
  serviceNote?: string; // Ghi chú cho buyer
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(999999999) // Max ~1 tỷ VND
  price?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(999999999)
  originalPrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(999999) // Max 999,999 sản phẩm
  stock?: number;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  images?: string;

  @IsString()
  @IsOptional()
  tags?: string;

  @IsString()
  @IsOptional()
  attributes?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  commission?: number; // Phần trăm hoa hồng sàn (0-100%)

  @IsOptional()
  autoDelivery?: boolean; // Chế độ giao hàng: true = tự động, false = thủ công

  @IsEnum(ProductType)
  @IsOptional()
  productType?: ProductType; // Loại sản phẩm: STANDARD, UPGRADE, hoặc SERVICE

  @IsString()
  @IsOptional()
  requiredBuyerFields?: string; // JSON array các trường buyer cần cung cấp

  // ====== SERVICE-specific fields ======
  @IsString()
  @IsOptional()
  servicePlatform?: string;

  @IsString()
  @IsOptional()
  serviceType?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  pricePerUnit?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  minQuantity?: number;

  @IsNumber()
  @IsOptional()
  maxQuantity?: number;

  @IsString()
  @IsOptional()
  estimatedTime?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  warrantyDays?: number;

  @IsString()
  @IsOptional()
  serviceSpeed?: string;

  @IsString()
  @IsOptional()
  serviceNote?: string;

  @IsBoolean()
  @IsOptional()
  hasVariants?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProductVariantDto)
  @IsOptional()
  variants?: UpdateProductVariantDto[];
}

export class UpdateStockDto {
  @IsNumber()
  @Min(0)
  stock: number;
}

// Withdrawal DTOs
export class CreateWithdrawalDto {
  @IsNumber()
  @Min(10000) // Minimum 10,000 VND
  amount: number;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankAccount?: string;

  @IsString()
  @IsOptional()
  bankHolder?: string;

  @IsString()
  pin: string; // 6-digit withdrawal PIN
}

// Withdrawal PIN DTOs
export class SetWithdrawalPinDto {
  @IsString()
  pin: string; // 6-digit PIN
}

export class ChangeWithdrawalPinDto {
  @IsString()
  oldPin: string;

  @IsString()
  newPin: string;
}

// Complaint DTOs
export enum ComplaintStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export class UpdateComplaintDto {
  @IsEnum(ComplaintStatus)
  @IsOptional()
  status?: ComplaintStatus;

  @IsString()
  @IsOptional()
  resolution?: string;
}

export class SendComplaintMessageDto {
  @IsString()
  message: string;

  @IsString()
  @IsOptional()
  attachments?: string;
}

// Order DTOs
export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  cancelReason?: string; // Lý do hủy đơn (bắt buộc khi status = CANCELLED)
}

// Inventory DTOs
export class InventoryFormatDto {
  @IsString()
  delimiter: string;

  @IsArray()
  @IsString({ each: true })
  fields: string[];
}

export class UploadInventoryDto {
  @IsString()
  accountData: string; // Raw text data (multiple lines)

  @IsString()
  @IsOptional()
  accountTemplateId?: string; // Optional template ID

  @IsString()
  @IsOptional()
  variantId?: string; // Optional variant ID for products with variants

  @IsOptional()
  @ValidateNested()
  @Type(() => InventoryFormatDto)
  format?: InventoryFormatDto;
}

export class AddSingleInventoryDto {
  @IsString()
  accountData: string; // Single account data line

  @IsString()
  @IsOptional()
  variantId?: string; // Optional variant ID for products with variants
}

export class UpdateInventoryDto {
  @IsString()
  @IsOptional()
  accountData?: string;

  @IsString()
  @IsOptional()
  status?: string; // AVAILABLE, DISABLED
}

// Product with digital fields
export class CreateDigitalProductDto extends CreateProductDto {
  @IsString()
  @IsOptional()
  accountTemplateId?: string;

  @IsOptional()
  isDigital?: boolean;

  @IsOptional()
  autoDelivery?: boolean;
}

// Manual Delivery DTO
export class ManualDeliveryDto {
  @IsString()
  orderItemId: string;

  @IsString()
  accountData: string; // Dữ liệu tài khoản để giao cho buyer
}

export class ManualDeliveryBulkDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualDeliveryDto)
  deliveries: ManualDeliveryDto[];
}

// Warranty / Account Replacement DTO
export class WarrantyReplacementDto {
  @IsString()
  deliveryId: string; // ID of the delivery to replace

  @IsString()
  newAccountData: string; // New account data to replace the faulty one

  @IsString()
  @IsOptional()
  reason?: string; // Reason for replacement
}
