import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  AuthenticatorTransportFuture, // Import AuthenticatorTransportFuture
} from '@simplewebauthn/server';
import { RpService } from './rp.service';
import { UsersService } from '../users/users.service';
import { InjectRepository } from '@nestjs/typeorm';
import { WebAuthnCredential } from './entities/webauthn-credential.entity';
import { Repository } from 'typeorm';

@Injectable()
type ChallengeType = 'registration' | 'authentication';

interface StoredChallenge {
  challenge: string;
  expiresAt: number;
}

export class WebauthnService {
  private readonly challengeTtlMs = 1000 * 60 * 5; // 5 minutes
  private readonly challengeStore = new Map<string, StoredChallenge>();

  constructor(
    private readonly rpService: RpService,
    private readonly usersService: UsersService,
    @InjectRepository(WebAuthnCredential)
    private webAuthnCredentialRepository: Repository<WebAuthnCredential>,
  ) {}

  private getChallengeKey(type: ChallengeType, subjectId: string): string {
    return `${type}:${subjectId}`;
  }

  private setChallenge(type: ChallengeType, subjectId: string, challenge: string): void {
    const key = this.getChallengeKey(type, subjectId);
    this.challengeStore.set(key, {
      challenge,
      expiresAt: Date.now() + this.challengeTtlMs,
    });
  }

  private getChallenge(type: ChallengeType, subjectId: string): string | null {
    const key = this.getChallengeKey(type, subjectId);
    const stored = this.challengeStore.get(key);

    if (!stored) {
      return null;
    }

    if (stored.expiresAt <= Date.now()) {
      this.challengeStore.delete(key);
      return null;
    }

    return stored.challenge;
  }

  private deleteChallenge(type: ChallengeType, subjectId: string): void {
    const key = this.getChallengeKey(type, subjectId);
    this.challengeStore.delete(key);
  }

  private toBuffer(value: Buffer | Uint8Array | string, encoding: BufferEncoding | 'base64url' = 'base64url'): Buffer {
    if (Buffer.isBuffer(value)) {
      return Buffer.from(value);
    }

    if (value instanceof Uint8Array) {
      return Buffer.from(value);
    }

    if (encoding === 'base64url') {
      return Buffer.from(value, 'base64url');
    }

    return Buffer.from(value, encoding);
  }

  async generateRegistrationOptions(username: string) {
    const user = await this.usersService.findByEmail(username);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userCredentials = await this.webAuthnCredentialRepository.find({ where: { user: { id: user.id } } });

    const options = await generateRegistrationOptions({
      rpName: this.rpService.getRpName(),
      rpID: this.rpService.getRpId(),
      userID: Buffer.from(user.id),
      userName: user.email,
      attestationType: 'none',
      excludeCredentials: userCredentials.map(cred => ({
        id: Buffer.from(cred.credential_id).toString('base64url'), // Convert Buffer to base64url string
        type: 'public-key',
        transports: cred.transports as AuthenticatorTransportFuture[], // Cast to AuthenticatorTransportFuture[]
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    if (options.challenge) {
      this.setChallenge('registration', user.id, options.challenge);
    }

    return options;
  }

  async verifyRegistration(response: any, userId: string, providedChallenge: string) {
    if (!userId) {
      throw new BadRequestException('User identifier is required');
    }

    if (!providedChallenge) {
      throw new BadRequestException('Registration challenge is required');
    }

    const storedChallenge = this.getChallenge('registration', userId);
    if (!storedChallenge || storedChallenge !== providedChallenge) {
      throw new BadRequestException('Invalid or expired registration challenge');
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: storedChallenge,
      expectedOrigin: this.rpService.getExpectedOrigin(),
      expectedRPID: this.rpService.getRpId(),
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialPublicKey, credentialID, counter } = verification.registrationInfo as {
        credentialPublicKey: Uint8Array | Buffer;
        credentialID: Uint8Array | Buffer;
        counter: number;
      };

      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const newCredential = this.webAuthnCredentialRepository.create({
        user,
        credential_id: this.toBuffer(credentialID, 'base64url'),
        public_key: this.toBuffer(credentialPublicKey, 'base64url'),
        sign_count: counter,
        rp_id: this.rpService.getRpId(),
        origin: this.rpService.getExpectedOrigin(),
        // transports: response.response.transports, // This needs to be handled correctly
      });
      await this.webAuthnCredentialRepository.save(newCredential);
      this.deleteChallenge('registration', userId);
    }

    return verification;
  }

  async generateAuthenticationOptions(username?: string) {
    let allowCredentials;
    let user;
    if (username) {
        user = await this.usersService.findByEmail(username);
        if (user) {
            const userCredentials = await this.webAuthnCredentialRepository.find({ where: { user: { id: user.id } } });
            allowCredentials = userCredentials.map(cred => ({
                id: Buffer.from(cred.credential_id).toString('base64url'), // Convert Buffer to base64url string
                type: 'public-key',
                transports: cred.transports as AuthenticatorTransportFuture[], // Cast to AuthenticatorTransportFuture[]
            }));
        }
    }

    const options = await generateAuthenticationOptions({
      rpID: this.rpService.getRpId(),
      userVerification: 'preferred',
      allowCredentials,
    });

    if (user && options.challenge) {
      this.setChallenge('authentication', user.id, options.challenge);
    }

    return options;
  }

  async verifyAuthentication(response: any, providedChallenge: string) {
    if (!providedChallenge) {
      throw new BadRequestException('Authentication challenge is required');
    }

    const credentialIdSource = response.credentialID || response.id || response.rawId;
    if (!credentialIdSource) {
      throw new BadRequestException('Credential ID is required');
    }

    const credentialIdBuffer = this.toBuffer(credentialIdSource, 'base64url');
    const credential = await this.webAuthnCredentialRepository.findOne({
      where: { credential_id: credentialIdBuffer },
      relations: ['user'],
    });

    if (!credential) {
        throw new NotFoundException('Credential not found');
    }

    const storedChallenge = this.getChallenge('authentication', credential.user.id);
    if (!storedChallenge || storedChallenge !== providedChallenge) {
      throw new BadRequestException('Invalid or expired authentication challenge');
    }

    // @ts-ignore: The library's type definition for verifyAuthenticationResponse might be outdated or strict.
    const verification = await verifyAuthenticationResponse(
      {
        response,
        expectedChallenge: storedChallenge,
        expectedOrigin: this.rpService.getExpectedOrigin(),
        expectedRPID: this.rpService.getRpId(),
        credential: {
          id: Buffer.from(credential.credential_id).toString('base64url'),
          publicKey: new Uint8Array(credential.public_key),
          counter: credential.sign_count,
          transports: credential.transports as AuthenticatorTransportFuture[],
        },
      }
    );

    if (verification.verified) {
        credential.sign_count = verification.authenticationInfo.newCounter;
        credential.last_used_at = new Date();
        await this.webAuthnCredentialRepository.save(credential);
        this.deleteChallenge('authentication', credential.user.id);
    }

    return verification;
  }
}