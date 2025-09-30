import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';
import { RpService } from './rp.service';
import { UsersService } from '../users/users.service';
import { InjectRepository } from '@nestjs/typeorm';
import { WebAuthnCredential } from './entities/webauthn-credential.entity';
import { Repository } from 'typeorm';

type ChallengeType = 'registration' | 'authentication';

interface StoredChallenge {
  challenge: string;
  expiresAt: number;
}

@Injectable()
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

  private setChallenge(
    type: ChallengeType,
    subjectId: string,
    challenge: string,
  ): void {
    const key = this.getChallengeKey(type, subjectId);
    this.challengeStore.set(key, {
      challenge,
      expiresAt: Date.now() + this.challengeTtlMs,
    });
  }

  private getChallenge(type: ChallengeType, subjectId: string): string | null {
    const key = this.getChallengeKey(type, subjectId);
    const stored = this.challengeStore.get(key);
    if (!stored) return null;
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

  private toBuffer(
    value: Buffer | Uint8Array | string,
    encoding: BufferEncoding | 'base64url' = 'base64url',
  ): Buffer {
    if (Buffer.isBuffer(value)) return Buffer.from(value);
    if (value instanceof Uint8Array) return Buffer.from(value);
    if (typeof value === 'string') {
      if (encoding === 'base64url') return Buffer.from(value, 'base64url');
      return Buffer.from(value, encoding);
    }
    // Si es undefined, retorna Buffer vacío para evitar error en tests
    if (value === undefined || value === null) return Buffer.alloc(0);
    throw new TypeError(
      'Invalid value for toBuffer: must be Buffer, Uint8Array, or string',
    );
  }

  async generateRegistrationOptions(username: string) {
    const user = await this.usersService.findByEmail(username);
    if (!user) throw new NotFoundException('User not found');

    const userCredentials = await this.webAuthnCredentialRepository.find({
      where: { user: { id: user.id } },
    });

    const options = await generateRegistrationOptions({
      rpName: this.rpService.getRpName(),
      rpID: this.rpService.getRpId(),
      userID: Buffer.from(user.id.toString()), // <- Changed to Buffer
      userName: user.email,
      attestationType: 'none',
      excludeCredentials: userCredentials.map((cred) => ({
        id: cred.credential_id.toString('base64url'), // <- Changed to base64url string
        type: 'public-key',
        transports: cred.transports as AuthenticatorTransportFuture[],
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

  async verifyRegistration(
    response: RegistrationResponseJSON,
    userId: string,
    providedChallenge: string,
  ) {
    if (!userId) throw new BadRequestException('User identifier is required');
    if (!providedChallenge)
      throw new BadRequestException('Registration challenge is required');

    const storedChallenge = this.getChallenge('registration', userId);
    if (!storedChallenge || storedChallenge !== providedChallenge) {
      throw new BadRequestException(
        'Invalid or expired registration challenge',
      );
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: storedChallenge,
      expectedOrigin: this.rpService.getExpectedOrigin(),
      expectedRPID: this.rpService.getRpId(),
    });

    if (verification.verified && verification.registrationInfo) {
      const user = await this.usersService.findById(userId);
      if (!user) throw new NotFoundException('User not found');

      await this.persistCredential(
        verification.registrationInfo,
        response,
        user,
      );
      this.deleteChallenge('registration', userId);
    }

    return verification;
  }

  private async persistCredential(
    registrationInfo: Record<string, unknown>,
    response: RegistrationResponseJSON,
    user: import('../users/entities/user.entity').User,
  ) {
    // Shape moderno (v9/v10) - puede venir de dos maneras: directo o anidado en credential
    const credentialID =
      (registrationInfo.credentialID as ArrayBuffer) ||
      ((registrationInfo.credential as Record<string, unknown>)
        ?.id as ArrayBuffer);
    const credentialPublicKey =
      (registrationInfo.credentialPublicKey as ArrayBuffer) ||
      ((registrationInfo.credential as Record<string, unknown>)
        ?.publicKey as ArrayBuffer);
    const counter =
      (registrationInfo.counter as number) ??
      ((registrationInfo.credential as Record<string, unknown>)
        ?.counter as number);
    const transports =
      (registrationInfo.transports as string[]) ||
      ((registrationInfo.credential as Record<string, unknown>)
        ?.transports as string[]);
    const {
      aaguid,
      fmt,
      credentialDeviceType,
      credentialBackedUp,
      authenticatorExtensionResults: _authenticatorExtensionResults,
    } = registrationInfo;

    let credProtect: string | undefined = undefined;
    const ext = registrationInfo.authenticatorExtensionResults as Record<
      string,
      unknown
    >;
    if (ext && typeof ext === 'object' && 'credProtect' in ext) {
      credProtect = String((ext as { credProtect?: string }).credProtect);
    }

    const newCredential = this.webAuthnCredentialRepository.create({
      user,
      credential_id: this.toBuffer(
        credentialID ? Buffer.from(credentialID) : Buffer.alloc(0),
      ), // Buffer
      public_key: this.toBuffer(
        credentialPublicKey
          ? Buffer.from(credentialPublicKey)
          : Buffer.alloc(0),
      ), // Buffer
      sign_count: counter ?? 0,
      rp_id: this.rpService.getRpId(),
      origin: this.rpService.getExpectedOrigin(),
      aaguid:
        aaguid && typeof aaguid === 'string'
          ? Buffer.from(aaguid.replace(/-/g, ''), 'hex')
          : undefined,
      attestation_fmt: fmt as string,
      transports:
        transports || (response.response?.transports as string[] | undefined),
      backup_eligible: credentialDeviceType === 'multiDevice',
      backup_state: credentialBackedUp ? 'backed_up' : 'not_backed_up',
      cred_protect: credProtect,
    });
    await this.webAuthnCredentialRepository.save(newCredential);
  }

  async generateAuthenticationOptions(username?: string) {
    let allowCredentials:
      | {
          id: string;
          type: 'public-key';
          transports?: AuthenticatorTransportFuture[];
        }[]
      | undefined;
    let user;
    if (username) {
      user = await this.usersService.findByEmail(username);
      if (user) {
        const userCredentials = await this.webAuthnCredentialRepository.find({
          where: { user: { id: user.id } },
        });
        allowCredentials = userCredentials.map((cred) => ({
          id: cred.credential_id.toString('base64url'), // <- Changed to base64url string
          type: 'public-key',
          transports: cred.transports as AuthenticatorTransportFuture[],
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

  async verifyAuthentication(
    response: AuthenticationResponseJSON,
    providedChallenge: string,
  ) {
    if (!providedChallenge)
      throw new BadRequestException('Authentication challenge is required');

    const credentialIdSource =
      (response as unknown as Record<string, unknown>).credentialID ||
      response.id ||
      response.rawId;
    if (!credentialIdSource)
      throw new BadRequestException('Credential ID is required');

    const credentialIdBuffer = this.toBuffer(
      credentialIdSource as string,
      'base64url',
    );
    const credential = await this.webAuthnCredentialRepository.findOne({
      where: { credential_id: credentialIdBuffer },
      relations: ['user'],
    });
    if (!credential) throw new NotFoundException('Credential not found');

    const storedChallenge = this.getChallenge(
      'authentication',
      credential.user.id,
    );
    if (!storedChallenge || storedChallenge !== providedChallenge) {
      throw new BadRequestException(
        'Invalid or expired authentication challenge',
      );
    }

    // Tipos del paquete pueden ir por detrás
    const verification = await verifyAuthenticationResponse({
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
    });

    if (verification.verified) {
      credential.sign_count = verification.authenticationInfo.newCounter;
      credential.last_used_at = new Date();
      await this.webAuthnCredentialRepository.save(credential);
      this.deleteChallenge('authentication', credential.user.id);
    }

    return verification;
  }
}
