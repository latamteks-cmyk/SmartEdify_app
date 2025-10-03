import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { WebauthnService } from './webauthn.service';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';

@Controller('webauthn')
export class WebauthnController {
  constructor(private readonly webauthnService: WebauthnService) {}

  @Get('registration/options')
  @HttpCode(HttpStatus.OK)
  async registrationOptions(@Query('username') username: string) {
    return this.webauthnService.generateRegistrationOptions(username);
  }

  @Post('registration/verification')
  async registrationVerification(
    @Body() body: RegistrationResponseJSON,
    @Body('userId') userId: string,
    @Headers('webauthn-challenge') challenge?: string,
  ) {
    if (!challenge) {
      throw new BadRequestException('webauthn-challenge header is required');
    }
    return this.webauthnService.verifyRegistration(body, userId, challenge);
  }

  @Post('assertion/options')
  @HttpCode(HttpStatus.OK)
  async authenticationOptions(@Body('username') username: string) {
    return this.webauthnService.generateAuthenticationOptions(username);
  }

  @Post('assertion/result')
  async authenticationVerification(
    @Body() body: AuthenticationResponseJSON,
    @Headers('webauthn-challenge') challenge?: string,
  ) {
    if (!challenge) {
      throw new BadRequestException('webauthn-challenge header is required');
    }
    return this.webauthnService.verifyAuthentication(body, challenge);
  }
}
