import crypto from 'crypto';

export function generateCacheKey(text: string, voiceId: string): string {
  return crypto
    .createHash('sha256')
    .update(`${text}:${voiceId}`)
    .digest('hex');
}

export function generateChunkKey(text: string, voiceId: string, chunkIndex: number): string {
  const baseKey = generateCacheKey(text, voiceId);
  return `${baseKey}:chunk:${chunkIndex}`;
}

export function generateFullTextKey(text: string, voiceId: string): string {
  return `full:${generateCacheKey(text, voiceId)}`;
}
