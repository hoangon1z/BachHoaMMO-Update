import { IsString, IsOptional, IsNumber, IsEnum, IsArray, Min, Max } from 'class-validator';

export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  DISPUTED = 'DISPUTED',
}

export class GetOrdersQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  fromDate?: string; // ISO date string

  @IsOptional()
  @IsString()
  toDate?: string; // ISO date string

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

export class ManualDeliverDto {
  @IsString()
  orderItemId: string;

  @IsArray()
  @IsString({ each: true })
  accountData: string[]; // Array of account data to deliver
}

// Response DTOs
export class OrderResponse {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  commission: number;
  total: number;
  buyerName: string;
  items: OrderItemResponse[];
  createdAt: Date;
  deliveredAt?: Date;
}

export class OrderItemResponse {
  id: string;
  productId: string;
  productTitle: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  price: number;
  total: number;
  deliveredQuantity: number;
  productType?: string;
  buyerProvidedData?: any;
}

export class OrderDetailResponse extends OrderResponse {
  deliveries: DeliveryResponse[];
}

export class DeliveryResponse {
  id: string;
  orderItemId: string;
  accountData: string;
  deliveredAt: Date;
}
