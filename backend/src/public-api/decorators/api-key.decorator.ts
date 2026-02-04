import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

// Decorator to get seller info from request (set by API Key Guard)
export const ApiSeller = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.apiSeller;
  },
);

// Interface for seller info attached to request
export interface ApiSellerInfo {
  id: string;
  email: string;
  name: string;
  isSeller: boolean;
  sellerProfile?: {
    id: string;
    shopName: string;
    shopDescription?: string;
    shopLogo?: string;
    rating: number;
    totalSales: number;
    isVerified: boolean;
  };
  apiKey: {
    id: string;
    name: string;
    rateLimit: number;
  };
}

// Metadata key for skipping API key check (for health endpoints)
export const SKIP_API_KEY = 'skipApiKey';
export const SkipApiKey = () => SetMetadata(SKIP_API_KEY, true);
