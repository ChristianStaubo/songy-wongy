import { Module } from '@nestjs/common';
import { MusicGeneratorController } from './music-generator.controller';
import { MusicGeneratorService } from './music-generator.service';

@Module({
  controllers: [MusicGeneratorController],
  providers: [MusicGeneratorService],
  exports: [MusicGeneratorService],
})
export class MusicGeneratorModule {}