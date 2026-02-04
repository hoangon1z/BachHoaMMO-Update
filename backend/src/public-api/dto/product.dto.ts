import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsEnum, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

export enum ProductType {
  STANDARD = 'STANDARD',
  UPGRADE = 'UPGRADE',
}

export class GetProductsQueryDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

export class ProductVariantDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;
}

export class CreateProductDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  @Max(999999999)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999999999)
  originalPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999999)
  stock?: number;

  @IsString()
  categoryId: string;

  @IsArray()
  @IsString({ each: true })
  images: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  autoDelivery?: boolean;

  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredBuyerFields?: string[];

  @IsOptional()
  @IsBoolean()
  hasVariants?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999999999)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999999999)
  originalPrice?: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  autoDelivery?: boolean;
}

export class UpdateStockDto {
  @IsNumber()
  @Min(0)
  @Max(999999)
  stock: number;
}

// Response DTOs
export class ProductResponse {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  stock: number;
  status: string;
  images: string[];
  categoryId: string;
  categoryName?: string;
  views: number;
  sales: number;
  rating: number;
  autoDelivery: boolean;
  productType: string;
  hasVariants: boolean;
  variants?: ProductVariantResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export class ProductVariantResponse {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  stock: number;
  isActive: boolean;
}
