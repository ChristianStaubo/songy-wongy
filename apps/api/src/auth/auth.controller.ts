import { Controller, Get, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from './guards/clerk-auth-guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Get('me')
  @UseGuards(ClerkAuthGuard)
  me() {
    return 'Hello World';
  }

  @Get()
  getUsers() {
    return this.authService.getUsers();
  }

  @Get('first')
  getFirstUser() {
    return this.authService.getFirstUser();
  }
}
