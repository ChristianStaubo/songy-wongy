import { Module } from '@nestjs/common';
import { MusicGeneratorController } from './music-generator.controller';
import { MusicGeneratorService } from './music-generator.service';
import { S3Module } from '../s3/s3.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [S3Module, PrismaModule],
  controllers: [MusicGeneratorController],
  providers: [MusicGeneratorService],
  exports: [MusicGeneratorService],
})
export class MusicGeneratorModule {}