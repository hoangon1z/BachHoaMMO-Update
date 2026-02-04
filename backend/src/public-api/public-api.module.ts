import { Module } from '@nestjs/common';
import { PublicApiController } from './public-api.controller';
import { PublicApiService } from './public-api.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { WebhookModule } from '../webhook/webhook.module';

@Module({
  imports: [PrismaModule, WebhookModule],
  controllers: [PublicApiController],
  providers: [PublicApiService, ApiKeyGuard],
  exports: [PublicApiService],
})
export class PublicApiModule {}
