import Redis from 'ioredis';
import { ENV } from '@/config/env';

const globalForRedis = globalThis as unknown as {
  redis?: Redis;
};

export const redis =
  globalForRedis.redis ??
  new Redis(ENV.REDIS_URL!, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}