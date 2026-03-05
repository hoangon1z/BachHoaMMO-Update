import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean, IsDateString, Min, Max, MinLength, MaxLength } from 'class-validator';

export enum DiscountType {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

export class CreateDiscountCodeDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  code: string;

  @IsEnum(DiscountType)
  type: DiscountType;

  @IsNumber()
  @Min(0)
  value: number; // % hoặc số tiền cố định

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number; // Giới hạn số tiền giảm tối đa (chỉ dùng với PERCENT)

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderValue?: number; // Đơn hàng tối thiểu

  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number; // Tổng số lần dùng (null = không giới hạn)

  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimitPerUser?: number; // Mỗi user tối đa bao nhiêu lần

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string; // Mục đích: bồi thường / khuyến mãi

  @IsOptional()
  @IsString()
  productIds?: string; // JSON array of productId strings, null = toàn gian hàng

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class UpdateDiscountCodeDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class ValidateDiscountCodeDto {
  @IsString()
  code: string;

  @IsNumber()
  @Min(0)
  orderTotal: number; // Tổng đơn hàng để tính giảm giá

  @IsString()
  sellerId: string; // Phải kiểm tra mã thuộc seller này

  @IsOptional()
  @IsString()
  productId?: string; // Sản phẩm cụ thể để kiểm tra giới hạn productIds
}
