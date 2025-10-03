import { RateLimit } from '../guards/rate-limiting.guard';
import { RateLimitConfig } from '../rate-limiting.service';

// Predefined rate limit configurations
export const RateLimits = {
  // Strict rate limits for sensitive operations
  STRICT: {
    windowMs: 60000, // 1 minute
    maxRequests: 10, // 10 requests per minute
  } as RateLimitConfig,
  
  // Standard rate limits for regular API usage
  STANDARD: {
    windowMs: 60000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  } as RateLimitConfig,
  
  // Relaxed rate limits for less sensitive operations
  RELAXED: {
    windowMs: 60000, // 1 minute
    maxRequests: 1000, // 1000 requests per minute
  } as RateLimitConfig,
  
  // Very strict rate limits for authentication endpoints
  AUTHENTICATION: {
    windowMs: 300000, // 5 minutes
    maxRequests: 5, // 5 requests per 5 minutes
  } as RateLimitConfig,
  
  // Rate limits for token endpoints
  TOKEN_ENDPOINT: {
    windowMs: 300000, // 5 minutes
    maxRequests: 30, // 30 requests per 5 minutes
  } as RateLimitConfig,
  
  // Rate limits for introspection endpoints
  INTROSPECTION: {
    windowMs: 60000, // 1 minute
    maxRequests: 200, // 200 requests per minute
  } as RateLimitConfig,
};

// Convenience decorators for common rate limit configurations
export const StrictRateLimit = () => RateLimit(RateLimits.STRICT);
export const StandardRateLimit = () => RateLimit(RateLimits.STANDARD);
export const RelaxedRateLimit = () => RateLimit(RateLimits.RELAXED);
export const AuthenticationRateLimit = () => RateLimit(RateLimits.AUTHENTICATION);
export const TokenEndpointRateLimit = () => RateLimit(RateLimits.TOKEN_ENDPOINT);
export const IntrospectionRateLimit = () => RateLimit(RateLimits.INTROSPECTION);