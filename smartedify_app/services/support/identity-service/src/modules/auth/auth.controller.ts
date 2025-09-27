import { Controller, Get, Post, Query, Body, BadRequestException, Headers, UseGuards, Req, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ClientAuthGuard } from './guards/client-auth.guard'; // Corrected import path
import type { Request } from 'express';
import type { ParPayload } from './store/par-store.service';
import type { Response } from 'express'; // Import Response as type

@Controller('oauth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('par')
  @HttpCode(HttpStatus.CREATED)
  async pushedAuthorizationRequest(@Body() payload: ParPayload) {
    if (!payload.code_challenge || !payload.code_challenge_method) {
      throw new BadRequestException('PKCE parameters are required in PAR payload');
    }
    return this.authService.pushedAuthorizationRequest(payload);
  }

  @Post('device_authorization')
  @HttpCode(HttpStatus.OK)
  async deviceAuthorization() {
    // In a real implementation, the client would be authenticated here
    return this.authService.deviceAuthorizationRequest();
  }

  @Get('authorize')
  async authorize(
    @Res() res: Response,
    @Query('redirect_uri') redirect_uri: string,
    @Query('scope') scope: string,
    @Query('request_uri') request_uri?: string,
    @Query('code_challenge') code_challenge?: string,
    @Query('code_challenge_method') code_challenge_method?: string,
  ) {
    if (!redirect_uri) {
      throw new BadRequestException('redirect_uri is required');
    }
    if (!scope) {
      throw new BadRequestException('scope is required');
    }

    const mockUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    const code = await this.authService.generateAuthorizationCode({
      request_uri,
      code_challenge,
      code_challenge_method,
      userId: mockUserId,
      scope,
    });

    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.append('code', code);
    // redirectUrl.searchParams.append('state', state); // If state was implemented

    res.redirect(redirectUrl.toString());
  }

  @Post('token')
  @HttpCode(HttpStatus.OK)
  async token(
    @Body('grant_type') grant_type: string,
    @Body() body: any,
    @Headers('DPoP') dpopProof: string,
    @Req() req: Request,
  ) {
    const httpMethod = req.method;
    const httpUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    if (grant_type === 'authorization_code') {
      if (!body.code || !body.code_verifier) {
        throw new BadRequestException('Code and code_verifier are required');
      }
      const [access_token, refresh_token] = await this.authService.exchangeCodeForTokens(
        body.code,
        body.code_verifier,
        dpopProof,
        httpMethod,
        httpUrl,
      );
      return { access_token, refresh_token, token_type: 'DPoP' };
    } else if (grant_type === 'refresh_token') {
      if (!body.refresh_token) {
        throw new BadRequestException('refresh_token is required');
      }
      if (!dpopProof) {
        throw new BadRequestException('DPoP proof is required for refresh token flow');
      }
      const [access_token, new_refresh_token] = await this.authService.refreshTokens(
        body.refresh_token,
        dpopProof,
        httpMethod,
        httpUrl,
      );
      return { access_token, refresh_token: new_refresh_token, token_type: 'DPoP' };
    } else if (grant_type === 'urn:ietf:params:oauth:grant-type:device_code') {
      if (!body.device_code) {
        throw new BadRequestException('device_code is required');
      }
      // This will be implemented next
      // return this.authService.exchangeDeviceCodeForTokens(body.device_code);
      throw new BadRequestException('device_code grant type not yet implemented');
    } else {
      throw new BadRequestException('Invalid grant_type');
    }
  }

  @Post('revoke')
  @HttpCode(HttpStatus.OK)
  async revoke(
    @Body('token') token: string,
    @Body('token_type_hint') token_type_hint?: string,
  ) {
    if (!token) {
      throw new BadRequestException('token is required');
    }
    await this.authService.revokeToken(token, token_type_hint);
    return {};
  }

  @Post('introspect')
  @UseGuards(ClientAuthGuard)
  async introspect(@Body('token') token: string) {
    return this.authService.introspect(token);
  }
}