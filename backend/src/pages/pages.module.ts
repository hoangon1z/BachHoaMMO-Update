import { Module } from '@nestjs/common';
import { PagesService } from './pages.service';
import { PublicPagesController, AdminPagesController } from './pages.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [PublicPagesController, AdminPagesController],
    providers: [PagesService],
    exports: [PagesService],
})
export class PagesModule { }
