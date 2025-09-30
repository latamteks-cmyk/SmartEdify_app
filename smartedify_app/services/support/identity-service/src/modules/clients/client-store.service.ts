import { Injectable } from '@nestjs/common';
import { Client } from './client.entity';

// This is a placeholder for a real client database.
const testClients: Client[] = [
  {
    client_id: 'test-client-for-jwt-auth',
    // This is a sample public key for demonstration purposes.
    jwks: {
      keys: [
        {
          kty: 'EC',
          crv: 'P-256',
          x: 'MKBCTNIcKUSDii11ySs3526iDZ8AiTo7Tu6KPAqv7D4',
          y: '4Etl6SRW2E4qU50xG3YMXu2L31A21S_s-T3u2v3bf7I',
          kid: 'test-key-1',
        },
      ],
    },
  },
];

@Injectable()
export class ClientStoreService {
  findClientById(clientId: string): Client | null {
    const client = testClients.find((c) => c.client_id === clientId);
    if (!client) {
      return null;
    }
    return client;
  }
}
