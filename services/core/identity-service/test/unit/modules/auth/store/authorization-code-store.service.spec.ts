import { AuthorizationCodeStoreService } from '../../../../../src/modules/auth/store/authorization-code-store.service';

describe('AuthorizationCodeStoreService', () => {
  it('should store and consume authorization codes (single-use)', () => {
    const store = new AuthorizationCodeStoreService();
    const code = 'code-123';
    store.set(code, {
      code_challenge: 'abc',
      code_challenge_method: 'S256',
      userId: 'user-1',
      scope: 'openid',
    });
    const first = store.get(code);
    expect(first?.userId).toBe('user-1');
    const second = store.get(code);
    expect(second).toBeUndefined();
  });
});

