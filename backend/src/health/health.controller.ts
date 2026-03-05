import { Controller, Get } from '@nestjs/common';
import {
    HealthCheck,
    HealthCheckService,
    PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private prisma: PrismaHealthIndicator,
        private prismaService: PrismaService,
    ) { }

    @Get()
    @HealthCheck()
    check() {
        return this.health.check([
            // Check Prisma database connection
            () => this.prisma.pingCheck('database', this.prismaService),
        ]);
    }

    /**
     * Simple ping endpoint
     */
    @Get('ping')
    ping() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        };
    }
}
