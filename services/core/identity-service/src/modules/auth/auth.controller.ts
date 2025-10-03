import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Headers,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Res,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { TokenIntrospectionResponse } from './auth.service';
import { ClientAuthGuard } from './guards/client-auth.guard'; // Corrected import path
import type { Request } from 'express';
import type { ParPayload } from './store/par-store.service';
import type { Response } from 'express'; // Import Response as type
import { Rfc7807Exception } from '../../exceptions/rfc7807.exception';
import { UseGuards as UseInterceptors } from '@nestjs/common';
import { RateLimitingGuard } from '../rate-limiting/guards/rate-limiting.guard';
import { 
  AuthenticationRateLimit, 
  TokenEndpointRateLimit, 
  IntrospectionRateLimit,
  StandardRateLimit
} from '../rate-limiting/decorators/rate-limit.decorator';

// OAuth2 Token Request Body interface according to RFC 6749 and RFC 7636 (PKCE)
interface TokenRequestBody {
  grant_type: string;
  code?: string;
  code_verifier?: string;
  refresh_token?: string;
  device_code?: string;
  // Add other optional properties as needed
  [key: string]: string | undefined;
}

@Controller()
@UseGuards(RateLimitingGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('oauth/par')
  @HttpCode(HttpStatus.CREATED)
  @AuthenticationRateLimit()
  pushedAuthorizationRequest(@Body() payload: ParPayload) {
    if (!payload.code_challenge || !payload.code_challenge_method) {
      throw Rfc7807Exception.badRequest(
        'PKCE parameters are required in PAR payload',
        '/oauth/par'
      );
    }
    return this.authService.pushedAuthorizationRequest(payload);
  }

  @Post('oauth/device_authorization')
  @HttpCode(HttpStatus.OK)
  @StandardRateLimit()
  deviceAuthorization() {
    // In a real implementation, the client would be authenticated here
    return this.authService.deviceAuthorizationRequest();
  }

  @Get('authorize')
  @StandardRateLimit()
  authorize(
    @Res() res: Response,
    @Query('redirect_uri') redirect_uri?: string,
    @Query('scope') scope?: string,
    @Query('request_uri') request_uri?: string,
    @Query('code_challenge') code_challenge?: string,
    @Query('code_challenge_method') code_challenge_method?: string,
  ) {
    // Handle PAR flow: if request_uri is provided, get params from storage
    if (request_uri) {
      const parData = this.authService.getStoredPARRequest(request_uri);
      if (!parData) {
        throw Rfc7807Exception.badRequest('Invalid or expired request_uri', '/authorize');
      }
      // Use PAR parameters
      redirect_uri = parData.redirect_uri;
      scope = parData.scope;
      code_challenge = parData.code_challenge;
      code_challenge_method = parData.code_challenge_method;
    }

    // Enforce PKCE for all non-PAR requests
    if (!request_uri && (!code_challenge || !code_challenge_method)) {
      throw Rfc7807Exception.badRequest(
        'PKCE parameters (code_challenge, code_challenge_method) are required',
        '/authorize'
      );
    }

    if (!redirect_uri) {
      throw Rfc7807Exception.badRequest('redirect_uri is required', '/authorize');
    }
    if (!scope) {
      throw Rfc7807Exception.badRequest('scope is required', '/authorize');
    }

    const mockUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    const code = this.authService.generateAuthorizationCode({
      code_challenge: code_challenge!,
      code_challenge_method: code_challenge_method!,
      userId: mockUserId,
      scope: scope,
    });

    // For PAR requests (testing mode), return JSON instead of redirect
    if (request_uri) {
      return res.json({ code });
    }

    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.append('code', code);
    // redirectUrl.searchParams.append('state', state); // If state was implemented

    res.redirect(redirectUrl.toString());
  }

  @Post('oauth/token')
  @HttpCode(HttpStatus.OK)
  @TokenEndpointRateLimit()
  async token(
    @Body('grant_type') grant_type: string,
    @Body() body: TokenRequestBody,
    @Headers('DPoP') dpopProof: string,
    @Req() req: Request,
  ) {
    const httpMethod = req.method;
    const httpUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    // Validar DPoP primero para todos los grant types - esta verificación básica
    if (!dpopProof) {
      throw Rfc7807Exception.unauthorized('DPoP proof is required', '/oauth/token');
    }

    if (grant_type === 'authorization_code') {
      // Validar parámetros requeridos
      if (!body.code || !body.code_verifier) {
        throw Rfc7807Exception.badRequest(
          'code and code_verifier are required for authorization_code grant',
          '/oauth/token'
        );
      }

      // La validación detallada de DPoP y parámetros ocurre en exchangeCodeForTokens
      // para asegurar el orden correcto: DPoP primero (401), luego parámetros (400)
      const [access_token, refresh_token] =
        await this.authService.exchangeCodeForTokens(
          body.code,
          body.code_verifier,
          dpopProof,
          httpMethod,
          httpUrl,
        );

      return { access_token, refresh_token, token_type: 'DPoP' };
    } else if (grant_type === 'refresh_token') {
      if (!body.refresh_token) {
        throw Rfc7807Exception.badRequest('refresh_token is required', '/oauth/token');
      }
      if (!dpopProof) {
        throw Rfc7807Exception.badRequest(
          'DPoP proof is required for refresh token flow',
          '/oauth/token'
        );
      }
      const [access_token, new_refresh_token] =
        await this.authService.refreshTokens(
          body.refresh_token,
          dpopProof,
          httpMethod,
          httpUrl,
        );
      return {
        access_token,
        refresh_token: new_refresh_token,
        token_type: 'DPoP',
      };
    } else if (grant_type === 'urn:ietf:params:oauth:grant-type:device_code') {
      if (!body.device_code) {
        throw Rfc7807Exception.badRequest('device_code is required', '/oauth/token');
      }
      const [access_token, refresh_token] = 
        await this.authService.exchangeDeviceCodeForTokens(body.device_code as string);
      return {
        access_token,
        refresh_token,
        token_type: 'DPoP', // Device flow should typically return DPoP tokens as well
      };
    } else {
      throw Rfc7807Exception.badRequest('Invalid grant_type', '/oauth/token');
    }
  }

  @Post('oauth/revoke')
  @HttpCode(HttpStatus.OK)
  @StandardRateLimit()
  async revoke(
    @Body('token') token: string,
    @Body('token_type_hint') token_type_hint?: string,
  ) {
    if (!token) {
      throw Rfc7807Exception.badRequest('token is required', '/oauth/revoke');
    }
    await this.authService.revokeToken(token, token_type_hint);
    return {};
  }

  @Post('oauth/introspect')
  @UseGuards(ClientAuthGuard)
  @IntrospectionRateLimit()
  async introspect(@Body('token') token: string): Promise<TokenIntrospectionResponse> {
    return this.authService.introspect(token);
  }

  @Post('oauth/device_authorization')
  @HttpCode(HttpStatus.OK)
  @StandardRateLimit()
  deviceAuthorizationRequest() {
    // In a real implementation, the client would be authenticated here
    return this.authService.deviceAuthorizationRequest();
  }
}