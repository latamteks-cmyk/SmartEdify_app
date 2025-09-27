import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { WebauthnService } from './webauthn.service';

@Controller('webauthn')
export class WebauthnController {
  constructor(private readonly webauthnService: WebauthnService) {}

  @Get('registration/options')
  async registrationOptions(@Query('username') username: string) {
    return this.webauthnService.generateRegistrationOptions(username);
  }

  @Post('registration/verification')
  async registrationVerification(
    @Body() body: any,
    @Body('userId') userId: string
  ) {
    return this.webauthnService.verifyRegistration(body, userId);
  }

  @Get('authentication/options')
  async authenticationOptions(@Query('username') username: string) {
    return this.webauthnService.generateAuthenticationOptions(username);
  }

  @Post('authentication/verification')
  async authenticationVerification(
    @Body() body: any,
    @Body('username') username: string
  ) {
    return this.webauthnService.verifyAuthentication(body, username);
  }
}