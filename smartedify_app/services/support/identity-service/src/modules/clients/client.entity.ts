export interface Client {
  client_id: string;
  jwks: any; // In a real implementation, this would be a structured JWKS object
}
