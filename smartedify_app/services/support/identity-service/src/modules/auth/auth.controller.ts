import { Controller, Get, Post, Query, Body, BadRequestException, UnauthorizedException, Headers, UseGuards, Req, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ClientAuthGuard } from './guards/client-auth.guard'; // Corrected import path
import type { Request } from 'express';
import type { ParPayload } from './store/par-store.service';
import type { Response } from 'express'; // Import Response as type

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('oauth/par')
  @HttpCode(HttpStatus.CREATED)
  async pushedAuthorizationRequest(@Body() payload: ParPayload) {
    if (!payload.code_challenge || !payload.code_challenge_method) {
      throw new BadRequestException('PKCE parameters are required in PAR payload');
    }
    return this.authService.pushedAuthorizationRequest(payload);
  }

  @Post('oauth/device_authorization')
  @HttpCode(HttpStatus.OK)
  async deviceAuthorization() {
    // In a real implementation, the client would be authenticated here
    return this.authService.deviceAuthorizationRequest();
  }

  @Get('authorize')
  async authorize(
    @Res() res: Response,
    @Query('redirect_uri') redirect_uri?: string,
    @Query('scope') scope?: string,
    @Query('request_uri') request_uri?: string,
    @Query('code_challenge') code_challenge?: string,
    @Query('code_challenge_method') code_challenge_method?: string,
  ) {
    console.log('🚀 Authorize Debug:', {
      redirect_uri: redirect_uri || 'MISSING',
      scope: scope || 'MISSING',
      request_uri: request_uri || 'not provided',
      code_challenge: code_challenge?.substring(0, 10) + '...' || 'MISSING',
      code_challenge_method: code_challenge_method || 'MISSING',
    });

    // Handle PAR flow: if request_uri is provided, get params from storage
    if (request_uri) {
      console.log('🔍 PAR Debug: Looking up request_uri:', request_uri);
      const parData = await this.authService.getStoredPARRequest(request_uri);
      console.log('📦 PAR Debug: Retrieved data:', parData);
      if (!parData) {
        throw new BadRequestException('Invalid or expired request_uri');
      }
      // Use PAR parameters
      redirect_uri = parData.redirect_uri;
      scope = parData.scope;
      code_challenge = parData.code_challenge;
      code_challenge_method = parData.code_challenge_method;
      console.log('✅ PAR Debug: Updated params:', { redirect_uri, scope, code_challenge, code_challenge_method });
    }

    // Enforce PKCE for all non-PAR requests
    if (!request_uri && (!code_challenge || !code_challenge_method)) {
      throw new BadRequestException('PKCE parameters (code_challenge, code_challenge_method) are required');
    }

    if (!redirect_uri) {
      console.log('❌ Missing redirect_uri after PAR processing');
      throw new BadRequestException('redirect_uri is required');
    }
    if (!scope) {
      console.log('❌ Missing scope after PAR processing');
      throw new BadRequestException('scope is required');
    }

    console.log('✅ Final validation passed:', { redirect_uri, scope });

    const mockUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    const code = await this.authService.generateAuthorizationCode({
      code_challenge,
      code_challenge_method,
      userId: mockUserId,
      scope,
    });

    console.log('🔐 Generated auth code:', { code: code.substring(0, 10) + '...' });

    // For PAR requests (testing mode), return JSON instead of redirect
    if (request_uri) {
      return res.json({ code });
    }

    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.append('code', code);
    // redirectUrl.searchParams.append('state', state); // If state was implemented

    console.log('🔄 Redirecting to:', redirectUrl.toString().substring(0, 100) + '...');

    res.redirect(redirectUrl.toString());
  }

  @Post('oauth/token')
  @HttpCode(HttpStatus.OK)
  async token(
    @Body('grant_type') grant_type: string,
    @Body() body: any,
    @Headers('DPoP') dpopProof: string,
    @Req() req: Request,
  ) {
    const httpMethod = req.method;
    const httpUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    console.log('🚀 Token Debug - Request received:', {
      grant_type,
      has_dpop: !!dpopProof,
      has_code: !!body.code,
      has_code_verifier: !!body.code_verifier,
      has_refresh_token: !!body.refresh_token,
    });

    // Validar DPoP primero para todos los grant types - esta verificación básica
    if (!dpopProof) {
      throw new UnauthorizedException('DPoP proof is required');
    }

    if (grant_type === 'authorization_code') {
      console.log('🔍 Processing authorization_code grant...');
      
      // La validación detallada de DPoP y parámetros ocurre en exchangeCodeForTokens
      // para asegurar el orden correcto: DPoP primero (401), luego parámetros (400)
      const [access_token, refresh_token] = await this.authService.exchangeCodeForTokens(
        body.code,
        body.code_verifier,
        dpopProof,
        httpMethod,
        httpUrl,
      );

      console.log('✅ Token Exchange Success:', {
        access_token: access_token ? 'present' : 'missing',
        refresh_token: refresh_token ? 'present' : 'missing',
      });

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

  @Post('oauth/revoke')
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

  @Post('oauth/introspect')
  @UseGuards(ClientAuthGuard)
  async introspect(@Body('token') token: string) {
    return this.authService.introspect(token);
  }
}