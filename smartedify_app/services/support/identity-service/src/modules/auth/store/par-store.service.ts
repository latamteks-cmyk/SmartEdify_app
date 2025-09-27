import { Injectable } from '@nestjs/common';

export interface ParPayload {
  code_challenge: string;
  code_challenge_method: string;
  // Add other authorization parameters here as needed (client_id, scope, etc.)
}

@Injectable()
export class ParStoreService {
  private store = new Map<string, ParPayload>();

  set(requestUri: string, payload: ParPayload): void {
    this.store.set(requestUri, payload);
    // PAR request URIs should have a short lifespan (e.g., 60 seconds)
    setTimeout(() => this.store.delete(requestUri), 60 * 1000);
  }

  get(requestUri: string): ParPayload | undefined {
    const payload = this.store.get(requestUri);
    // Request URIs are single-use
    this.store.delete(requestUri);
    return payload;
  }
}
