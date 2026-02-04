import { Module, Global } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
