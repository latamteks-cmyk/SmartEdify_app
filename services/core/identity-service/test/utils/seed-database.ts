#!/usr/bin/env node

/**
 * Seed Script for Identity Service Test Database
 * 
 * This script populates the test database with sample data for testing purposes.
 * It creates 5 users with associated sessions, refresh tokens, WebAuthn credentials,
 * and revocation events as specified in the task requirements.
 */

import { createConnection } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { RefreshToken } from '../src/modules/tokens/entities/refresh-token.entity';
import { Session } from '../src/modules/sessions/entities/session.entity';
import { WebAuthnCredential } from '../src/modules/webauthn/entities/webauthn-credential.entity';
import { RevocationEvent } from '../src/modules/sessions/entities/revocation-event.entity';
import { seedUsers, seedRefreshTokens, seedSessions, seedWebAuthnCredentials, seedRevocationEvents } from './seed-data';

async function seedDatabase() {
  try {
    // Create database connection
    const connection = await createConnection({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'user',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_TEST_DATABASE || 'identity_test_db',
      entities: [User, RefreshToken, Session, WebAuthnCredential, RevocationEvent],
      synchronize: true, // For testing only - drops and recreates tables
      logging: false,
    });

    console.log('Connected to database');

    // Clear existing data
    await connection.getRepository(RevocationEvent).clear();
    await connection.getRepository(RefreshToken).clear();
    await connection.getRepository(Session).clear();
    await connection.getRepository(WebAuthnCredential).clear();
    await connection.getRepository(User).clear();

    console.log('Cleared existing data');

    // Insert users
    const userRepository = connection.getRepository(User);
    const createdUsers = [];
    for (const userData of seedUsers) {
      const user = userRepository.create(userData);
      const savedUser = await userRepository.save(user);
      createdUsers.push(savedUser);
      console.log(`Created user: ${savedUser.username}`);
    }

    // Insert sessions
    const sessionRepository = connection.getRepository(Session);
    for (const sessionData of seedSessions) {
      const session = sessionRepository.create({
        ...sessionData,
        user: createdUsers.find(u => u.id === sessionData.user?.id),
      });
      await sessionRepository.save(session);
      console.log(`Created session for user: ${sessionData.user?.id}`);
    }

    // Insert WebAuthn credentials
    const webAuthnCredentialRepository = connection.getRepository(WebAuthnCredential);
    for (const credentialData of seedWebAuthnCredentials) {
      const credential = webAuthnCredentialRepository.create({
        ...credentialData,
        user: createdUsers.find(u => u.id === credentialData.user?.id),
      });
      await webAuthnCredentialRepository.save(credential);
      console.log(`Created WebAuthn credential for user: ${credentialData.user?.id}`);
    }

    // Insert refresh tokens
    const refreshTokenRepository = connection.getRepository(RefreshToken);
    for (const tokenData of seedRefreshTokens) {
      const token = refreshTokenRepository.create({
        ...tokenData,
        user: createdUsers.find(u => u.id === tokenData.user?.id),
      });
      await refreshTokenRepository.save(token);
      console.log(`Created refresh token for user: ${tokenData.user?.id}`);
    }

    // Insert revocation events
    const revocationEventRepository = connection.getRepository(RevocationEvent);
    for (const eventData of seedRevocationEvents) {
      const event = revocationEventRepository.create(eventData);
      await revocationEventRepository.save(event);
      console.log(`Created revocation event for subject: ${eventData.subject}`);
    }

    console.log('Database seeding completed successfully!');
    await connection.close();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed script if this file is executed directly
if (require.main === module) {
  seedDatabase();
}