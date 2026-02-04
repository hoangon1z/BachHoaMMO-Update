import { IsString, IsOptional, IsArray, IsEnum, IsNumber, Min, Max } from 'class-validator';

export enum InventoryStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SOLD = 'SOLD',
  DISABLED = 'DISABLED',
}

export class GetInventoryQueryDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsOptional()
  @IsEnum(InventoryStatus)
  status?: InventoryStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

export class AddInventoryDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsArray()
  @IsString({ each: true })
  items: string[]; // Array of account data strings
}

export class AddSingleInventoryDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsString()
  accountData: string;
}

export class DeleteMultipleInventoryDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

// Response DTOs
export class InventoryItemResponse {
  id: string;
  productId: string;
  variantId?: string;
  status: string;
  createdAt: Date;
  // Note: accountData is NOT returned for security
}

export class InventoryStatsResponse {
  total: number;
  available: number;
  reserved: number;
  sold: number;
  disabled: number;
}
