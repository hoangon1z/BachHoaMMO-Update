import { Module } from '@nestjs/common';
import { CheckUidController } from './checkuid.controller';
import { CheckUidService } from './checkuid.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [CheckUidController],
    providers: [CheckUidService],
    exports: [CheckUidService],
})
export class CheckUidModule { }
