import { Module } from '@nestjs/common';
import { MusicGeneratorController } from './music-generator.controller';
import { MusicGeneratorService } from './music-generator.service';
import { S3Module } from '../s3/s3.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [S3Module, PrismaModule, UsersModule],
  controllers: [MusicGeneratorController],
  providers: [MusicGeneratorService],
  exports: [MusicGeneratorService],
})
export class MusicGeneratorModule {}
