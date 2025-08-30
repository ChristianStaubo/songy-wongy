/* eslint-disable no-var */
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';

declare global {
  var testApp: INestApplication;
  var testPrisma: PrismaService;
}

// Ensure Jest types are available
/// <reference types="jest" />
