import { Injectable } from '@nestjs/common';

interface AuthorizationCode {
  code_challenge: string;
  code_challenge_method: string;
  userId: string;
  scope: string;
}

@Injectable()
export class AuthorizationCodeStoreService {
  private store = new Map<string, AuthorizationCode>();

  set(code: string, data: AuthorizationCode): void {
    this.store.set(code, data);
  }

  get(code: string): AuthorizationCode | undefined {
    const data = this.store.get(code);
    if (data) {
      this.store.delete(code); // Codes should be single-use
    }
    return data;
  }
}
