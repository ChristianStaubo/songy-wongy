import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthWebhooksController } from './auth.webhook.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  controllers: [AuthController, AuthWebhooksController],
  providers: [AuthService],
  imports: [ConfigModule, PrismaModule, UsersModule],
})
export class AuthModule {}
