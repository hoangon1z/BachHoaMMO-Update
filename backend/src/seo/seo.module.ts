import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SeoService } from './seo.service';
import { SeoController } from './seo.controller';
import { SeoCronService } from './seo-cron.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule, ScheduleModule.forRoot()],
    controllers: [SeoController],
    providers: [SeoService, SeoCronService],
    exports: [SeoService],
})
export class SeoModule { }

