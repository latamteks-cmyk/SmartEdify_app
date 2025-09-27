import { Injectable } from '@nestjs/common';

@Injectable()
export class ChallengeStoreService {
  private store = new Map<string, string>();

  set(key: string, challenge: string): void {
    this.store.set(key, challenge);
    // Challenges should have a short lifespan (e.g., 5 minutes)
    setTimeout(() => this.store.delete(key), 5 * 60 * 1000);
  }

  get(key: string): string | undefined {
    const challenge = this.store.get(key);
    // Challenges are single-use
    this.store.delete(key);
    return challenge;
  }
}
