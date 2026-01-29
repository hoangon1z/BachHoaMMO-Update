import { Module } from '@nestjs/common';
import { PayOSController } from './payos.controller';
import { PayOSService } from './payos.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PayOSController],
  providers: [PayOSService],
  exports: [PayOSService],
})
export class PayOSModule {}
