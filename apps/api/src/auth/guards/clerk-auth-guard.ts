import { verifyToken } from '@clerk/backend';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  constructor(private configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Extract token from cookie or Authorization header
    const token =
      request.cookies?.__session ||
      request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      this.logger.error('No token provided');
      throw new UnauthorizedException('Authentication token is required');
    }

    try {
      // Log the secret key format (without revealing the full key)
      const secretKey = this.configService.get<string>('CLERK_SECRET_KEY');

      // Verify the token using the verifyToken function
      const sessionClaims = await verifyToken(token, {
        secretKey: secretKey,
      });
      // Log successful verification

      // Attach the session information to the request
      request.auth = {
        sessionId: sessionClaims.sid,
        userId: sessionClaims.sub,
        session: sessionClaims,
      };

      return true;
    } catch (error) {
      this.logger.error(`Token verification failed: ${error.message}`);
      this.logger.error(`Error details: ${JSON.stringify(error)}`);
      throw new UnauthorizedException('Invalid authentication token');
    }
  }
}
