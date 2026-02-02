import { Module, Global } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController, PublicSettingsController } from './settings.controller';

@Global()
@Module({
  controllers: [SettingsController, PublicSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
