import { Module } from '@nestjs/common';
import { ServiceOrdersController } from './service-orders.controller';
import { ServiceOrdersService } from './service-orders.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [PrismaModule, WalletModule, NotificationsModule],
    controllers: [ServiceOrdersController],
    providers: [ServiceOrdersService],
    exports: [ServiceOrdersService],
})
export class ServiceOrdersModule { }
