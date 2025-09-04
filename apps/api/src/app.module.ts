import { ExecutionContext, Module } from '@nestjs/common';
import { APP_PIPE, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MusicGeneratorModule } from './music-generator/music-generator.module';
import { MusicGenerationQueueModule } from './workers/music-generation-queue.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import * as Joi from 'joi';
import { LoggerModule } from 'nestjs-pino';
import { ZodValidationPipe, ZodSerializerInterceptor } from 'nestjs-zod';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { minutes, ThrottlerModule } from '@nestjs/throttler';
import { Keyv } from 'keyv';
import KeyvRedis from '@keyv/redis';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(8000),
        CLERK_SECRET_KEY: Joi.string().required(),
        CLERK_PUBLISHABLE_KEY: Joi.string().required(),
        CLERK_WEBHOOK_SIGNING_SECRET: Joi.string().required(),
        DATABASE_URL: Joi.string().required(),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        ELEVENLABS_API_KEY: Joi.string().required(),
        // AWS S3 Configuration
        AWS_S3_REGION: Joi.string().required(),
        AWS_ACCESS_KEY_ID: Joi.string().required(),
        AWS_SECRET_ACCESS_KEY: Joi.string().required(),
        AWS_S3_MUSIC_BUCKET: Joi.string().required(),
        // Redis Configuration
        REDIS_URI: Joi.string().optional(),
        REDIS_HOST: Joi.string().optional(),
        REDIS_PORT: Joi.number().optional(),
        REDIS_PASSWORD: Joi.string().optional(),
      }),
    }),
    CacheModule.registerAsync({
      useFactory: async (configService: ConfigService) => {
        try {
          // Prefer REDIS_URI if available, otherwise build from individual components
          let redisUrl = configService.get<string>('REDIS_URI');

          if (!redisUrl) {
            const redisHost = configService.get('REDIS_HOST', 'localhost');
            const redisPort = configService.get('REDIS_PORT', 6379);
            const redisPassword = configService.get('REDIS_PASSWORD');

            console.log('🔧 Redis Cache Configuration (Keyv):', {
              host: redisHost,
              port: redisPort,
              database: 0,
              auth: redisPassword ? 'ENABLED' : 'DISABLED',
            });

            // Build Redis URL with optional password support
            redisUrl = redisPassword
              ? `redis://default:${redisPassword}@${redisHost}:${redisPort}/0`
              : `redis://${redisHost}:${redisPort}/0`;
          }

          const keyvStore = new Keyv({
            store: new KeyvRedis(redisUrl),
            namespace: 'cache',
          });

          // Test the connection
          await keyvStore.set('test-connection', 'success', 10000); // Longer TTL for connection test
          const testResult = await keyvStore.get('test-connection');

          if (testResult === 'success') {
            console.log('✅ Keyv Redis store connected successfully');
            await keyvStore.delete('test-connection');
          } else {
            throw new Error('Connection test failed');
          }

          return {
            stores: [keyvStore],
            ttl: 3600000, // 1 hour in milliseconds
          };
        } catch (error) {
          console.error('❌ Keyv Redis store initialization failed:', error);
          console.log('⚠️ Falling back to memory store');
          return {
            ttl: 3600000, // 1 hour in milliseconds
          };
        }
      },
      isGlobal: true,
      inject: [ConfigService],
    }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // Use REDIS_URI if available, otherwise build from components
        const redisUri = configService.get<string>('REDIS_URI');

        let redisConfig;
        if (redisUri) {
          // Parse REDIS_URI for ThrottlerStorageRedisService
          const url = new URL(redisUri);
          redisConfig = {
            host: url.hostname,
            port: parseInt(url.port, 10) || 6379,
            password: url.password || undefined,
          };
        } else {
          // Fallback to individual components
          redisConfig = {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
            password: configService.get('REDIS_PASSWORD') || undefined,
          };
        }

        return {
          throttlers: [
            {
              ttl: minutes(1),
              limit: 100,
            },
          ],
          errorMessage: 'Too many requests. Please try again later.',
          storage: new ThrottlerStorageRedisService(redisConfig),
          generateKey: (ctx: ExecutionContext, tracker: string) => tracker,
        };
      },
      inject: [ConfigService],
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => {
        const redisUri = config.get<string>('REDIS_URI');
        const connection = redisUri
          ? { url: redisUri }
          : {
              host: config.get<string>('REDIS_HOST', 'localhost'),
              port: config.get<number>('REDIS_PORT', 6379),
            };

        return {
          connection,
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: { count: 100, age: 24 * 3_600_000 },
            removeOnFail: { count: 100, age: 24 * 3_600_000 },
          },
        };
      },
      inject: [ConfigService],
    }),

    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        return {
          pinoHttp: {
            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss',
                    ignore: 'pid,hostname,req,res,responseTime',
                    messageFormat: '{context} {msg}',
                    singleLine: false,
                  },
                },
            level: isProduction ? 'info' : 'debug',
          },
        };
      },
      inject: [ConfigService],
    }),
    PrismaModule,
    ProductsModule,
    AuthModule,
    UsersModule,
    MusicGeneratorModule,

    // Worker Queues
    MusicGenerationQueueModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
