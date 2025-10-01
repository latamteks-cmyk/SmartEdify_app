import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import { UsersService } from '../users/users.service';

@Injectable()
export class MfaService {
  constructor(private readonly usersService: UsersService) {}

  generateSecret(userId: string): string {
    const secret = authenticator.generateSecret();
    // In a real implementation, we would encrypt and store this secret in the user's record
    // For now, we will just log it.
    console.log(`MFA Secret for user ${userId}: ${secret}`);
    return secret;
  }

  generateOtpAuthUrl(userId: string, email: string, secret: string): string {
    return authenticator.keyuri(email, 'SmartEdify', secret);
  }

  async verify(userId: string, code: string): Promise<boolean> {
    // In a real implementation, we would retrieve the user's secret from the database
    const user = await this.usersService.findById(userId);
    if (!user || !user.mfa_secret) {
      return false;
    }
    return authenticator.verify({ token: code, secret: user.mfa_secret });
  }
}
