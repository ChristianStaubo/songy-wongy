// import { clerkClient } from '@clerk/clerk-sdk-node';
// import {
//   CanActivate,
//   ExecutionContext,
//   Injectable,
//   Logger,
// } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { WsException } from '@nestjs/websockets';
// import { Socket } from 'socket.io';

// @Injectable()
// export class ClerkWsAuthGuard implements CanActivate {
//   constructor(private configService: ConfigService) {}
//   private readonly logger = new Logger(ClerkWsAuthGuard.name);

//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     try {
//       const client: Socket = context.switchToWs().getClient();
//       const token = this.extractToken(client);

//       if (!token) {
//         this.logger.error('No token provided in WebSocket connection');
//         throw new WsException('Unauthorized');
//       }

//       const verifiedToken = await clerkClient.verifyToken(token, {
//         secretKey: this.configService.get('CLERK_SECRET_KEY'),
//       });

//       // Attach the verified token data to the client for later use
//       client.data.auth = verifiedToken;

//       return true;
//     } catch (err) {
//       this.logger.error('WebSocket authentication failed:', err);
//       throw new WsException('Unauthorized');
//     }
//   }

//   private extractToken(client: Socket): string | undefined {
//     // Try to get token from handshake auth header
//     const authHeader = client.handshake.headers.authorization;
//     if (authHeader) {
//       return authHeader.replace('Bearer ', '');
//     }

//     // Fallback to query parameter
//     return client.handshake.query.token as string | undefined;
//   }
// }
