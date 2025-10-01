export interface Client {
  client_id: string;
  jwks: Record<string, unknown>; // In a real implementation, this would be a structured JWKS object
}
