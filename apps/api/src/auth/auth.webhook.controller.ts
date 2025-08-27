import {
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';
import { Request, Response } from 'express';
import { Webhook } from 'svix';

@Controller('webhooks/auth')
export class AuthWebhooksController {
  private readonly logger = new Logger(AuthWebhooksController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  @Post('clerk')
  async handleClerkWebhook(@Req() req: Request, @Res() res: Response) {
    // Log incoming request details
    this.logger.log('--- Incoming Webhook Request ---');
    this.logger.log(`Method: ${req.method}`);
    this.logger.log(`URL: ${req.url}`);
    this.logger.log(`Headers: ${JSON.stringify(req.headers)}`);
    this.logger.log(`Content-Type: ${req.headers['content-type']}`);
    this.logger.log(
      `Raw request body type: ${Buffer.isBuffer(req.body) ? 'Buffer' : typeof req.body}`,
    );
    if (Buffer.isBuffer(req.body)) {
      this.logger.log(`Buffer length: ${req.body.length}`);
      // Log first 500 characters to avoid flooding logs
      this.logger.log(
        `Buffer content (utf8): ${req.body.toString('utf8').substring(0, 500)}`,
      );
    } else {
      this.logger.log(`Request body: ${JSON.stringify(req.body)}`);
    }

    // Retrieve signing secret from env
    const signingSecret = this.configService.get<string>(
      'CLERK_WEBHOOK_SIGNING_SECRET',
    );
    if (!signingSecret) {
      this.logger.error('CLERK_WEBHOOK_SIGNING_SECRET is not set');
      throw new UnauthorizedException('Missing Clerk webhook signing secret');
    }

    // Ensure the raw payload is used for verification
    let rawPayload: Buffer;
    if (Buffer.isBuffer(req.body)) {
      rawPayload = req.body;
    } else {
      this.logger.warn('Request body is not a Buffer. Attempting conversion.');
      rawPayload = Buffer.from(JSON.stringify(req.body), 'utf8');
      this.logger.log(`Converted payload length: ${rawPayload.length}`);
      this.logger.log(
        `Converted payload content (utf8): ${rawPayload.toString('utf8').substring(0, 500)}`,
      );
    }

    // Create a new Svix instance with your secret
    const wh = new Webhook(signingSecret);

    // Get the necessary svix headers
    const svixId = req.headers['svix-id'] as string;
    const svixTimestamp = req.headers['svix-timestamp'] as string;
    const svixSignature = req.headers['svix-signature'] as string;

    this.logger.log(`svix-id: ${svixId}`);
    this.logger.log(`svix-timestamp: ${svixTimestamp}`);
    this.logger.log(`svix-signature: ${svixSignature}`);

    if (!svixId || !svixTimestamp || !svixSignature) {
      this.logger.error('Missing required svix headers');
      return res.status(400).json({
        success: false,
        message: 'Error: Missing svix headers',
      });
    }

    let evt;
    try {
      evt = wh.verify(rawPayload, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
      this.logger.log('Webhook verification succeeded.');
      this.logger.log(`Verified event: ${JSON.stringify(evt)}`);
    } catch (err: any) {
      this.logger.error('Webhook verification failed', err);
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    // Process the event after successful verification
    const { type, data } = evt;
    this.logger.log(`Event type: ${type}`);
    this.logger.log(`Event data: ${JSON.stringify(data)}`);

    if (type === 'user.created') {
      const { id: clerkId } = data;
      try {
        await this.usersService.createUser({ clerkId });
        this.logger.log(
          `Processed user.created event for Clerk user: ${clerkId}`,
        );
      } catch (createErr) {
        this.logger.error('Error creating user', createErr);
      }
    } else {
      this.logger.log(`Unhandled event type: ${type}`);
    }

    this.logger.log('--- Webhook Request Completed ---');
    return res.status(200).json({
      success: true,
      message: 'Webhook received',
    });
  }
}
