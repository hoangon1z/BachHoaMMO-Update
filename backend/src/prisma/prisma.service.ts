import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private connectionAttempts = 0;
  private readonly maxRetries = 3;
  private readonly retryDelay = 3000; // 3 seconds

  constructor() {
    super({
      log: [
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
    });

    // Log database errors
    this.$on('error' as never, (e: any) => {
      this.logger.error('Database error:', e);
    });

    this.$on('warn' as never, (e: any) => {
      this.logger.warn('Database warning:', e);
    });
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Connect to database with retry logic
   */
  private async connectWithRetry(): Promise<void> {
    while (this.connectionAttempts < this.maxRetries) {
      try {
        await this.$connect();
        console.log('✅ Database connected');
        this.connectionAttempts = 0; // Reset on success
        return;
      } catch (error) {
        this.connectionAttempts++;
        this.logger.error(
          `Database connection failed (attempt ${this.connectionAttempts}/${this.maxRetries}):`,
          error instanceof Error ? error.message : error,
        );

        if (this.connectionAttempts >= this.maxRetries) {
          this.logger.error('Max database connection retries reached. Giving up.');
          throw new Error('Failed to connect to database after multiple attempts');
        }

        // Wait before retry
        this.logger.log(`Retrying in ${this.retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
  }
}

