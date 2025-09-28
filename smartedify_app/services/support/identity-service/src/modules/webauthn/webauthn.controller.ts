import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { WebauthnService } from './webauthn.service';

@Controller('webauthn')
export class WebauthnController {
  constructor(private readonly webauthnService: WebauthnService) {}

  @Post('attestation/options')
  @HttpCode(HttpStatus.OK)
  async registrationOptions(@Body('username') username: string) {
    return this.webauthnService.generateRegistrationOptions(username);
  }

  @Post('attestation/result')
  async registrationVerification(
    @Body() body: any,
    @Body('userId') userId: string
  ) {
    // Note: The spec uses 'result' but the underlying library uses 'verification'.
    // The logic remains the same.
    return this.webauthnService.verifyRegistration(body, userId);
  }

  @Post('assertion/options')
  @HttpCode(HttpStatus.OK)
  async authenticationOptions(@Body('username') username: string) {
    return this.webauthnService.generateAuthenticationOptions(username);
  }

  @Post('assertion/result')
  async authenticationVerification(
    @Body() body: any,
    @Body('username') username: string
  ) {
    // Note: The spec uses 'result' but the underlying library uses 'verification'.
    // The logic remains the same.
    return this.webauthnService.verifyAuthentication(body, username);
  }
}