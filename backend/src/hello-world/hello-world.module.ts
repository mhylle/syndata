import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HelloWorldController } from './hello-world.controller';
import { HelloWorldService } from './hello-world.service';
import { HelloWorld } from '../shared/entities';

@Module({
  imports: [TypeOrmModule.forFeature([HelloWorld])],
  controllers: [HelloWorldController],
  providers: [HelloWorldService],
})
export class HelloWorldModule {}
