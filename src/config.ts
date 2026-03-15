import { DEFAULT_VOICE } from './types.js';

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0',
  },

  chunking: {
    maxChunkSize: 1800,
    minChunkSize: 100,
  },

  caching: {
    chunkCacheMaxMB: 50,
    fullTextCacheMaxMB: 100,
    chunkCacheTTLHours: 24,
    fullTextCacheTTLDays: 7,
  },

  concurrency: {
    maxConcurrentCalls: 3,
    queueTimeoutMs: 30000,
  },

  tts: {
    defaultVoice: process.env.DEFAULT_VOICE || DEFAULT_VOICE,
    provider: process.env.TTS_PROVIDER || 'elevenlabs',
    model: process.env.TTS_MODEL || 'eleven_flash_v2_5',
  },

  analytics: {
    analyticsThreshold: 10,
  },
};

export type Config = typeof config;
