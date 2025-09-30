import { Injectable } from '@nestjs/common';

export interface ParPayload {
  code_challenge: string;
  code_challenge_method: string;
  redirect_uri?: string;
  scope?: string;
  // Add other authorization parameters here as needed (client_id, etc.)
}

@Injectable()
export class ParStoreService {
  private store = new Map<string, ParPayload>();

  set(requestUri: string, payload: ParPayload): void {
    console.log('💾 PAR Store SET:', { requestUri, payload });
    this.store.set(requestUri, payload);
    // PAR request URIs should have a short lifespan (e.g., 60 seconds)
    setTimeout(() => this.store.delete(requestUri), 60 * 1000);
  }

  get(requestUri: string): ParPayload | undefined {
    console.log('🔍 PAR Store GET:', {
      requestUri,
      hasValue: this.store.has(requestUri),
    });
    const payload = this.store.get(requestUri);
    console.log('📋 PAR Store retrieved:', payload);
    // Request URIs are single-use
    this.store.delete(requestUri);
    return payload;
  }
}
