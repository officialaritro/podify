import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { config } from '../config.js';
import { generateCacheKey } from '../cache/keyGen.js';

export interface TTSOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  signal?: AbortSignal;
}

export interface TTSResult {
  audio: Buffer;
  duration?: number;
}

class ElevenLabsService {
  private client: ElevenLabsClient | null = null;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
  }

  private getClient(): ElevenLabsClient {
    if (!this.client) {
      if (!this.apiKey) {
        throw new Error('ELEVENLABS_API_KEY not set');
      }
      this.client = new ElevenLabsClient({ apiKey: this.apiKey });
    }
    return this.client;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async synthesize(options: TTSOptions): Promise<TTSResult> {
    const { text, voiceId, modelId, signal } = options;
    const voice = voiceId || config.tts.defaultVoice;
    const model = modelId || config.tts.model;

    const chunks: Buffer[] = [];

    try {
      const audioStream = await this.getClient().textToSpeech.stream(voice, {
        text,
        modelId: model,
      });

      for await (const chunk of audioStream) {
        if (chunk instanceof Buffer) {
          chunks.push(chunk);
        } else {
          chunks.push(Buffer.from(chunk as Uint8Array));
        }
        
        if (signal?.aborted) {
          throw new Error('Request cancelled');
        }
      }

      return {
        audio: Buffer.concat(chunks),
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('aborted')) {
        throw error;
      }
      throw new Error(`TTS synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async synthesizeChunk(text: string, voiceId: string, signal?: AbortSignal): Promise<TTSResult> {
    return this.synthesize({ text, voiceId, signal });
  }
}

export const elevenLabsService = new ElevenLabsService();
