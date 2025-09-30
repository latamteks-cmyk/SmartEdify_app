import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  NotImplementedException,
  Body,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller()
export class LogoutController {
  constructor(private readonly authService: AuthService) {}

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout() {
    // TODO: Implement session termination and redirect logic as per OIDC spec.
    throw new NotImplementedException(
      'OIDC Front-Channel Logout not implemented.',
    );
  }

  @Post('backchannel-logout')
  @HttpCode(HttpStatus.OK)
  async backchannelLogout(@Body('logout_token') logoutToken: string) {
    await this.authService.handleBackchannelLogout(logoutToken);
    return {};
  }
}
