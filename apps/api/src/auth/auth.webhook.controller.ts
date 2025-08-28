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
      const {
        id: clerkId,
        email_addresses,
        unsafe_metadata,
        primary_email_address_id,
        first_name,
        last_name,
      } = data;

      this.logger.log(`Extracting data for user creation:`);
      this.logger.log(`- Clerk ID: ${clerkId}`);
      this.logger.log(`- Email addresses: ${JSON.stringify(email_addresses)}`);
      this.logger.log(
        `- Primary email address ID: ${primary_email_address_id}`,
      );
      this.logger.log(`- Unsafe metadata: ${JSON.stringify(unsafe_metadata)}`);
      this.logger.log(`- First name: ${first_name}`);
      this.logger.log(`- Last name: ${last_name}`);

      // Extract email from primary email address
      const primaryEmail =
        email_addresses?.find(
          (email: any) => email.id === primary_email_address_id,
        )?.email_address || email_addresses?.[0]?.email_address;

      this.logger.log(`- Extracted primary email: ${primaryEmail}`);

      // Extract name from unsafe_metadata (firstName + lastName) or use individual fields
      let fullName = null;
      if (unsafe_metadata?.firstName || unsafe_metadata?.lastName) {
        const firstName = unsafe_metadata.firstName || '';
        const lastName = unsafe_metadata.lastName || '';
        fullName = `${firstName} ${lastName}`.trim() || null;
        this.logger.log(`- Extracted name from unsafe_metadata: "${fullName}"`);
      } else if (first_name || last_name) {
        const firstName = first_name || '';
        const lastName = last_name || '';
        fullName = `${firstName} ${lastName}`.trim() || null;
        this.logger.log(`- Extracted name from direct fields: "${fullName}"`);
      } else {
        this.logger.log(`- No name data found`);
      }

      this.logger.log(
        `Final data to create user: clerkId="${clerkId}", email="${primaryEmail}", name="${fullName}"`,
      );

      try {
        // Check if user already exists first
        const existingUser = await this.usersService.findUserByClerkId(clerkId);
        if (existingUser) {
          this.logger.log(
            `User with Clerk ID ${clerkId} already exists, skipping creation`,
          );
          return;
        }

        // Validate required data
        if (!clerkId) {
          throw new Error('Clerk ID is required but not provided');
        }

        await this.usersService.createUser({
          clerkId,
          email: primaryEmail,
          name: fullName,
        });
        this.logger.log(
          `Processed user.created event for Clerk user: ${clerkId} with email: ${primaryEmail} and name: ${fullName}`,
        );
      } catch (createErr: any) {
        this.logger.error('Error creating user', {
          error: createErr.message,
          code: createErr.code,
          meta: createErr.meta,
          clerkId,
          email: primaryEmail,
          name: fullName,
        });
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
