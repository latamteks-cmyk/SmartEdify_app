import { Logger } from '@nestjs/common';

export interface DpopReplayConfig {
  backend: 'database' | 'redis';
  ttlSeconds: number;
}

export interface DpopConfig {
  proof: {
    maxIatSkewSeconds: number;
  };
  replay: DpopReplayConfig;
}

const logger = new Logger('DPoPConfig');

const DEFAULT_MAX_IAT_SKEW = 5;
const MAX_ALLOWED_IAT_SKEW = 10;
const DEFAULT_REPLAY_TTL_SECONDS = 300;

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    logger.warn(
      `Invalid positive integer value "${value}". Falling back to ${fallback}.`,
    );
    return fallback;
  }
  return parsed;
}

export function getDpopConfig(): DpopConfig {
  const configuredSkew = parsePositiveInteger(
    process.env.DPOP_IAT_MAX_SKEW_SECONDS || process.env.DPOP_IAT_MAX_SKEW,
    DEFAULT_MAX_IAT_SKEW,
  );

  const maxIatSkewSeconds = Math.min(configuredSkew, MAX_ALLOWED_IAT_SKEW);

  const configuredBackend = (
    process.env.DPOP_REPLAY_BACKEND || 'database'
  ).toLowerCase();
  const backend: 'database' | 'redis' =
    configuredBackend === 'redis' ? 'redis' : 'database';
  if (configuredBackend !== 'redis' && configuredBackend !== 'database') {
    logger.warn(
      `Unsupported DPoP replay backend "${configuredBackend}", defaulting to database.`,
    );
  }

  const ttlSeconds = parsePositiveInteger(
    process.env.DPOP_REPLAY_TTL_SECONDS,
    DEFAULT_REPLAY_TTL_SECONDS,
  );

  return {
    proof: {
      maxIatSkewSeconds,
    },
    replay: {
      backend,
      ttlSeconds,
    },
  };
}
