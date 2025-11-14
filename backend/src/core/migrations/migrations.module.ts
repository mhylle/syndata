import { Module } from '@nestjs/common';
import { DatabaseMigrationsService } from './database-migrations.service';

@Module({
  providers: [DatabaseMigrationsService],
  exports: [DatabaseMigrationsService],
})
export class MigrationsModule {}
