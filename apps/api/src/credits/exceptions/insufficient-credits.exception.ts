import { BadRequestException } from '@nestjs/common';

export class InsufficientCreditsException extends BadRequestException {
  constructor(required: number, available: number) {
    super({
      message: 'Insufficient credits to complete this operation',
      error: 'INSUFFICIENT_CREDITS',
      details: {
        required,
        available,
        shortfall: required - available,
      },
    });
  }
}
