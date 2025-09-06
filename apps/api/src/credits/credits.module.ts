import { Module } from '@nestjs/common';
import { CreditsService } from './credits.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CreditsService],
  exports: [CreditsService],
})
export class CreditsModule {}
