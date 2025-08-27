import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export const GetClerkId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    try {
      const request = ctx.switchToHttp().getRequest();

      if (!request.auth || !request.auth.userId) {
        throw new UnauthorizedException('No authentication data found');
      }
      return request.auth.userId;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Failed to extract user ID from token');
    }
  },
);
