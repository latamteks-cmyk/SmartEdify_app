import { Injectable } from '@nestjs/common';

@Injectable()
export class JtiStoreService {
  // A Set is used for efficient add/has/delete operations.
  private store = new Set<string>();

  /**
   * Adds a JTI to the store and sets a timeout for its expiration.
   * @param jti The JTI to store.
   * @param expiresIn The lifetime of the JTI in seconds.
   */
  set(jti: string, expiresIn: number = 300): void {
    this.store.add(jti);
    // JTI should be stored for a limited time to prevent the store from growing indefinitely.
    // This time should be long enough to prevent replays within a reasonable window.
    setTimeout(() => this.store.delete(jti), expiresIn * 1000);
  }

  /**
   * Checks if a JTI exists in the store.
   * @param jti The JTI to check.
   * @returns True if the JTI exists, false otherwise.
   */
  has(jti: string): boolean {
    return this.store.has(jti);
  }
}
