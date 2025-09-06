import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import {
  MUSIC_GENERATION_QUEUE,
  DEFAULT_MUSIC_GENERATION_JOB_OPTIONS,
} from './queue.constants';
import { MusicGenerationProcessor } from './processors/music-generation.processor';
import { MusicGenerationListener } from './listeners/music-generation.listener';
import { MusicGeneratorModule } from '../music-generator/music-generator.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { CreditsModule } from '../credits/credits.module';

@Module({
  imports: [
    ConfigModule,
    MusicGeneratorModule,
    PrismaModule,
    UsersModule,
    CreditsModule,
    BullModule.registerQueue({
      name: MUSIC_GENERATION_QUEUE,
      defaultJobOptions: DEFAULT_MUSIC_GENERATION_JOB_OPTIONS,
    }),
  ],
  providers: [MusicGenerationProcessor, MusicGenerationListener],
  exports: [BullModule, MusicGenerationListener], // Export listener so controller can use it
})
export class MusicGenerationQueueModule {}
