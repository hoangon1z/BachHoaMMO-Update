import { IsString, IsOptional, IsNumber, Min, IsEnum, IsBoolean, IsArray, ValidateNested } from 'class-validator';
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
}

// Product Variant DTO
export class ProductVariantDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  salePrice?: number;

  @IsNumber()
  @Min(0)
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

// Product/Inventory DTOs
export class CreateProductDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  salePrice?: number;

  @IsNumber()
  @Min(0)
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
  price?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  salePrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
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
  bankName: string;

  @IsString()
  bankAccount: string;

  @IsString()
  bankHolder: string;
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
}

// Inventory DTOs
export class UploadInventoryDto {
  @IsString()
  accountData: string; // Raw text data (multiple lines)

  @IsString()
  @IsOptional()
  accountTemplateId?: string; // Optional template ID
}

export class AddSingleInventoryDto {
  @IsString()
  accountData: string; // Single account data line
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
