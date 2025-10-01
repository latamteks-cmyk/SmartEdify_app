import { SignJWT, importJWK, generateKeyPair } from 'jose';
import type { DPoPProof } from './types';

// Store key pair in memory (in production, consider more secure storage)
let keyPair: CryptoKeyPair | null = null;

async function getOrCreateKeyPair(): Promise<CryptoKeyPair> {
  if (!keyPair) {
    keyPair = await generateKeyPair('ES256');
  }
  return keyPair;
}

export async function generateDPoPProof(method: string, url: string): Promise<string> {
  try {
    const { privateKey, publicKey } = await getOrCreateKeyPair();
    
    // Export public key for JWK thumbprint
    const publicJwk = await crypto.subtle.exportKey('jwk', publicKey);
    
    const now = Math.floor(Date.now() / 1000);
    const jti = crypto.randomUUID();

    const payload: DPoPProof = {
      jti,
      htm: method,
      htu: url,
      iat: now,
      exp: now + 60, // 1 minute expiry
    };

    const jwt = await new SignJWT(payload)
      .setProtectedHeader({
        alg: 'ES256',
        typ: 'dpop+jwt',
        jwk: {
          kty: publicJwk.kty,
          crv: publicJwk.crv,
          x: publicJwk.x,
          y: publicJwk.y,
        },
      })
      .sign(privateKey);

    return jwt;
  } catch (error) {
    console.error('Failed to generate DPoP proof:', error);
    throw new Error('DPoP proof generation failed');
  }
}

export async function getDPoPThumbprint(): Promise<string> {
  try {
    const { publicKey } = await getOrCreateKeyPair();
    const publicJwk = await crypto.subtle.exportKey('jwk', publicKey);
    
    // Create JWK thumbprint (simplified)
    const thumbprintData = JSON.stringify({
      kty: publicJwk.kty,
      crv: publicJwk.crv,
      x: publicJwk.x,
      y: publicJwk.y,
    });
    
    const encoder = new TextEncoder();
    const data = encoder.encode(thumbprintData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashBase64 = btoa(String.fromCharCode.apply(null, hashArray));
    
    return hashBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch (error) {
    console.error('Failed to generate DPoP thumbprint:', error);
    throw new Error('DPoP thumbprint generation failed');
  }
}