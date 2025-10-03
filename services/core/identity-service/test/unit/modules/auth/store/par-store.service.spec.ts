import { ParStoreService } from '../../../../../src/modules/auth/store/par-store.service';

describe('ParStoreService', () => {
  it('should set and consume PAR payloads (single-use)', () => {
    const store = new ParStoreService();
    const uri = 'urn:ietf:params:oauth:request_uri:abc';
    store.set(uri, {
      code_challenge: 'xyz',
      code_challenge_method: 'S256',
      redirect_uri: 'https://app/cb',
      scope: 'openid profile',
    });
    const payload = store.get(uri);
    expect(payload?.redirect_uri).toBe('https://app/cb');
    expect(store.get(uri)).toBeUndefined();
  });
});

