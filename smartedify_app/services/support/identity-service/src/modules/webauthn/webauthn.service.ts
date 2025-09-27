import { Injectable, NotFoundException } from '@nestjs/common';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { RpService } from './rp.service';
import { UsersService } from '../users/users.service';
import { InjectRepository } from '@nestjs/typeorm';
import { WebAuthnCredential } from './entities/webauthn-credential.entity';
import { Repository } from 'typeorm';

@Injectable()
export class WebauthnService {
  constructor(
    private readonly rpService: RpService,
    private readonly usersService: UsersService,
    @InjectRepository(WebAuthnCredential)
    private webAuthnCredentialRepository: Repository<WebAuthnCredential>,
  ) {}

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
        id: cred.credential_id,
        type: 'public-key',
        transports: cred.transports,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // In a real implementation, we would store the challenge
    // await this.challengeStore.set(user.id, options.challenge);

    return options;
  }

  async verifyRegistration(response: any, expectedChallenge: string) {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.rpService.getExpectedOrigin(),
      expectedRPID: this.rpService.getRpId(),
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;
      
      // In a real implementation, we would get the user from the session
      const user = await this.usersService.findByEmail('test@test.com'); // placeholder
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const newCredential = this.webAuthnCredentialRepository.create({
        user,
        credential_id: credentialID,
        public_key: credentialPublicKey,
        sign_count: counter,
        rp_id: this.rpService.getRpId(),
        origin: this.rpService.getExpectedOrigin(),
        // transports: response.response.transports, // This needs to be handled correctly
      });
      await this.webAuthnCredentialRepository.save(newCredential);
    }

    return verification;
  }

  async generateAuthenticationOptions(username?: string) {
    let allowCredentials;
    if (username) {
        const user = await this.usersService.findByEmail(username);
        if (user) {
            const userCredentials = await this.webAuthnCredentialRepository.find({ where: { user: { id: user.id } } });
            allowCredentials = userCredentials.map(cred => ({
                id: cred.credential_id,
                type: 'public-key',
                transports: cred.transports,
            }));
        }
    }

    const options = await generateAuthenticationOptions({
      rpID: this.rpService.getRpId(),
      userVerification: 'preferred',
      allowCredentials,
    });

    // In a real implementation, we would store the challenge
    // await this.challengeStore.set('current-challenge', options.challenge);

    return options;
  }

  async verifyAuthentication(response: any, expectedChallenge: string) {
    const { credentialID } = response;
    const credential = await this.webAuthnCredentialRepository.findOne({ where: { credential_id: credentialID } });

    if (!credential) {
        throw new NotFoundException('Credential not found');
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.rpService.getExpectedOrigin(),
      expectedRPID: this.rpService.getRpId(),
      authenticator: {
        credentialID: credential.credential_id,
        credentialPublicKey: credential.public_key,
        counter: credential.sign_count,
      },
    });

    if (verification.verified) {
        credential.sign_count = verification.authenticationInfo.newCounter;
        await this.webAuthnCredentialRepository.save(credential);
    }

    return verification;
  }
}