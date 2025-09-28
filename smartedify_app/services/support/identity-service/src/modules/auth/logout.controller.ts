import { Controller, Post, HttpCode, HttpStatus, NotImplementedException } from '@nestjs/common';

@Controller()
export class LogoutController {
  constructor() {}

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    // TODO: Implement session termination and redirect logic as per OIDC spec.
    throw new NotImplementedException('OIDC Front-Channel Logout not implemented.');
  }

  @Post('backchannel-logout')
  @HttpCode(HttpStatus.OK)
  async backchannelLogout() {
    // TODO: Implement back-channel logout logic as per OIDC spec.
    throw new NotImplementedException('OIDC Back-Channel Logout not implemented.');
  }
}
